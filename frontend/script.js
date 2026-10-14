// Data functions for create, read, update, and delete

const createData = async (textInput) => {
  const response = await fetch('/api/todo', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: textInput })
  })
  if (!response.ok) throw new Error('Failed to create todo')
  return response.json()
}

const readData = async () => {
  const response = await fetch('/api/todos')
  if (!response.ok) throw new Error('Failed to load todos. Please try again.')
  return response.json()
}

const updateData = async (todo) => {
  if (!todo.dataset.id) throw new Error('Todo is missing an id') 
  const response = await fetch('/api/todo/' + todo.dataset.id, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: todo.querySelector('form input').value })
  })
  if (!response.ok) throw new Error('Failed to update todo')
  return response.json()
}

const deleteData = async (todo) => {
  if (!todo.dataset.id) throw new Error('Todo is missing an id') 
  const response = await fetch('/api/todo/' + todo.dataset.id, {
    method: 'DELETE'
  })
  if (!response.ok) throw new Error('Failed to delete todo')
  return response.json()
}

const showError = (error) => {
  const notice = document.querySelector('#notices')
  notice.querySelector('p').textContent = error.message
  notice.style.display = 'block'
}
  
const niceDate = (dateString) => new Date(dateString).toLocaleString('en-ca', {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: 'numeric'
})

const displayData = async () => {
  try {
    const todoData = await readData()
    const itemList = document.querySelector('#itemList') 
    const markup = todoData.map(todo => `
        <li class="todo" data-id="${todo._id}">
          <div class="content">
            <span>${todo.content}</span>
            <span class="date">${niceDate(todo.date)}</span>
            <button class="edit" type="button" aria-label="Edit todo"></button>
            <button class="delete" type="button" aria-label="Delete todo"></button>
          </div>
          <form>
            <input type="text" value="${todo.content}" name="content">
            <button class="save" type="submit" aria-label="Save todo"></button>
            <button class="cancel" type="button" aria-label="Cancel editing"></button>
          </form>
        </li>` 
    ).join('')

    itemList.innerHTML = DOMPurify.sanitize(markup)
  } catch (error) {
    showError(error)
  }
}

const showForm = (todo) => {
  todo.querySelector('form').style.display = 'flex'
  todo.querySelector('.content').style.display = 'none'
  const userInput = todo.querySelector('form input')
  userInput.setSelectionRange(userInput.value.length, userInput.value.length)
  userInput.focus()
}

const hideForm = (todo) => {
  todo.querySelector('form').style.display = 'none'
  todo.querySelector('.content').style.display = 'flex'
}

document.querySelector('#dataForm').addEventListener('submit', async (event) => {
  event.preventDefault()
  const textInput = document.querySelector('#textInput')
  if (!textInput.value.trim()) return

  try {
    await createData(textInput.value.trim())
    textInput.value = ''
    await displayData()
  } catch (error) {
    showError(error)
  }
})

document.querySelector('#itemList').addEventListener('click', async (event) => {
  const element = event.target
  if (element.tagName !== 'BUTTON') return

  event.preventDefault()
  const todo = element.closest('.todo')
  if (element.classList.contains('edit')) showForm(todo)
  if (element.classList.contains('cancel')) hideForm(todo)

  try {
    if (element.classList.contains('save')) {
      await updateData(todo)
      await displayData()
    }
    if (element.classList.contains('delete')) {
      await deleteData(todo)
      await displayData()
    }
  } catch (error) {
    showError(error)
  }
})

displayData()
