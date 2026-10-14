import assert from 'node:assert/strict';
import test from 'node:test';
import mongoose from 'mongoose';
import Todo from '../backend/models/Todo.js';

test('a failed shared connection is retried and a successful connection is reused', async (t) => {
  const previousNetlify = process.env.NETLIFY;
  const previousUri = process.env.MONGODB_URI;
  process.env.NETLIFY = 'true';
  process.env.MONGODB_URI = 'mock://test-only';
  t.after(() => {
    for (const [key, value] of [['NETLIFY', previousNetlify], ['MONGODB_URI', previousUri]]) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  let attempts = 0;
  t.mock.method(mongoose, 'connect', async () => {
    attempts++;
    await new Promise(resolve => setImmediate(resolve));
    if (attempts === 1) throw new Error('Temporary connection failure');
    return mongoose;
  });
  t.mock.method(Todo, 'find', () => ({ sort: async () => [] }));
  const { handler } = await import('../backend/functions/api.js');
  const request = () => handler({
    httpMethod: 'GET', path: '/api/todos', headers: {},
    queryStringParameters: {}, body: null, isBase64Encoded: false
  }, {});

  const failed = await Promise.all([request(), request()]);
  assert.deepEqual(failed.map(response => response.statusCode), [500, 500]);
  assert.equal(attempts, 1);

  const recovered = await Promise.all([request(), request()]);
  assert.deepEqual(recovered.map(response => response.statusCode), [200, 200]);
  assert.equal(attempts, 2);
  assert.deepEqual(JSON.parse(recovered[0].body), []);
  assert.equal((await request()).statusCode, 200);
  assert.equal(attempts, 2);
});
