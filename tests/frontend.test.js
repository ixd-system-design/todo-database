import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const source = await readFile(new URL('../frontend/script.js', import.meta.url), 'utf8');
const storedTodo = {
  _id: '507f1f77bcf86cd799439011', content: 'Existing todo', date: '2026-10-14T12:00:00Z'
};

// Minimal DOM for exercising the actual rendering and event handlers.
class Element {
  constructor(tag) {
    this.tagName = tag.toUpperCase();
    this.children = [];
    this.dataset = {};
    this.style = {};
    this.listeners = {};
  }
  append(...elements) {
    for (const element of elements) {
      if (element.tagName === '#FRAGMENT') this.append(...element.children);
      else {
        element.parentElement = this;
        this.children.push(element);
      }
    }
  }
  replaceChildren(...elements) {
    this.children = [];
    this.append(...elements);
  }
  querySelector(selector) {
    const [first, ...rest] = selector.split(' ');
    for (const child of this.children) {
      const matches = first.startsWith('.')
        ? child.className === first.slice(1)
        : child.tagName === first.toUpperCase();
      const found = matches
        ? (rest.length ? child.querySelector(rest.join(' ')) : child)
        : child.querySelector(selector);
      if (found) return found;
    }
    return null;
  }
  addEventListener(name, listener) { this.listeners[name] = listener; }
  focus() {}
  setSelectionRange() {}
}

async function setup() {
  const elements = Object.fromEntries([
    ['#notices', new Element('section')], ['#itemList', new Element('ul')],
    ['#dataForm', new Element('form')], ['#textInput', new Element('input')]
  ]);
  elements['#notices'].append(new Element('p'));
  const state = {
    calls: [],
    respond: async () => ({ ok: true, json: async () => [storedTodo] })
  };
  const context = vm.createContext({
    document: {
      querySelector: selector => elements[selector],
      createElement: tag => new Element(tag),
      createDocumentFragment: () => new Element('#fragment')
    },
    fetch: async (url, options) => {
      state.calls.push({ url, ...options });
      return state.respond(url, options);
    },
    Date
  });
  vm.runInContext(source, context);
  await new Promise(resolve => setImmediate(resolve));
  return {
    elements, state,
    refresh: () => vm.runInContext('displayData()', context),
    submit: () => elements['#dataForm'].listeners.submit({ preventDefault() {} }),
    click: target => elements['#itemList'].listeners.click({ target, preventDefault() {} })
  };
}

for (const failure of ['HTTP', 'network']) {
  for (const action of ['create', 'save', 'delete']) {
    test(`${action} ${failure} failure preserves drafts and existing items`, async () => {
      const app = await setup();
      const item = app.elements['#itemList'].children[0];
      app.elements['#textInput'].value = 'New draft';
      item.querySelector('form input').value = 'Edited draft';
      await app.click(item.querySelector('.edit'));
      app.state.calls.length = 0;
      app.state.respond = async () => {
        if (failure === 'network') throw new Error('Network unavailable');
        return { ok: false, json: async () => ({ error: 'Write failed' }) };
      };

      if (action === 'create') await app.submit();
      else await app.click(item.querySelector('.' + action));

      assert.equal(app.elements['#textInput'].value, 'New draft');
      assert.equal(app.elements['#itemList'].children[0], item);
      assert.equal(item.querySelector('form input').value, 'Edited draft');
      assert.equal(item.querySelector('form').style.display, 'flex');
      assert.equal(app.elements['#notices'].style.display, 'block');
      assert.equal(app.state.calls.length, 1, 'failed writes must not trigger a refresh');
      assert.equal(app.state.calls[0].method, { create: 'POST', save: 'PUT', delete: 'DELETE' }[action]);
    });
  }
}

for (const failure of ['HTTP', 'network', 'JSON']) {
  test(`${failure} read failure preserves the list and recovery dismisses the notice`, async () => {
    const app = await setup();
    const item = app.elements['#itemList'].children[0];
    app.state.respond = async () => {
      if (failure === 'network') throw new Error('Network unavailable');
      return { ok: failure !== 'HTTP', json: async () => { throw new Error('Invalid JSON'); } };
    };
    await app.refresh();
    assert.equal(app.elements['#itemList'].children[0], item);
    assert.equal(app.elements['#notices'].style.display, 'block');

    app.state.respond = async () => ({ ok: true, json: async () => [{ ...storedTodo, content: 'Updated' }] });
    await app.refresh();
    assert.equal(app.elements['#notices'].style.display, 'none');
    assert.equal(app.elements['#itemList'].children[0].querySelector('span').textContent, 'Updated');

    app.state.respond = async () => ({ ok: true, json: async () => [] });
    await app.refresh();
    assert.equal(app.elements['#itemList'].children.length, 0, 'a successful empty response clears the list');
  });
}

test('successful create clears the draft even if the subsequent refresh fails', async () => {
  const app = await setup();
  const item = app.elements['#itemList'].children[0];
  app.elements['#textInput'].value = 'Saved draft';
  app.state.respond = async (_url, options) => ({
    ok: options.method === 'POST', json: async () => storedTodo
  });
  await app.submit();
  assert.equal(app.elements['#textInput'].value, '');
  assert.equal(app.elements['#itemList'].children[0], item);
  assert.equal(app.elements['#notices'].style.display, 'block');
});
