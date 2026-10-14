// Data functions for create, read, update, and delete

// given a string, add it to the database
const createData = async (textInput) => {
  return fetch('/api/todo', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content: textInput
    })
  })
    .then(response => {
      if (!response.ok) throw new Error('Failed to create todo')
      return response.json()
    })
};

// retrieve a list of all items from the database
const readData = async () => {
  return fetch('/api/todos', { method: "GET" })
    .then(response => {
      if (!response.ok) throw new Error('Failed to load todos. Please try again.')
      return response.json()
    })
};

// given an existing item, 
// update the content for it in the database
const updateData = async (todo) => {
  if (!todo.dataset.id) throw new Error('Todo is missing an id')

  return fetch('/api/todo/' + todo.dataset.id, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content: todo.querySelector('form input').value
    })
  })
    .then(response => {
      if (!response.ok) throw new Error('Failed to update todo')
      return response.json()
    })
};

// given an existing item
// remove from database
const deleteData = async (todo) => {
  if (!todo.dataset.id) throw new Error('Todo is missing an id')

  return fetch('/api/todo/' + todo.dataset.id, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' }
  })
    .then(response => {
      if (!response.ok) throw new Error('Failed to delete todo')
      return response.json()
    })
};


const showError = (error) => {
  const notice = document.querySelector('#notices')
  notice.querySelector('p').textContent = error.message
  notice.style.display = 'block'
}

// Keep the current list intact unless a refresh succeeds.
const displayData = async () => {
  try {
    const todoData = await readData()
    renderData(todoData)
    document.querySelector('#notices').style.display = 'none'
  } catch (error) {
    showError(error)
  }
}

// Display all the todo items from MongoDB
const renderData = (todoData) => {
  const itemList = document.querySelector('#itemList')
  const items = document.createDocumentFragment()

  todoData.forEach(todo => {
    const listItem = document.createElement('li')
    listItem.className = 'todo'
    listItem.dataset.id = todo._id

    const content = document.createElement('div')
    content.className = 'content'

    const contentText = document.createElement('span')
    contentText.textContent = todo.content

    const date = document.createElement('span')
    date.className = 'date'
    date.textContent = niceDate(todo.date)

    const editButton = document.createElement('button')
    editButton.className = 'edit'

    const deleteButton = document.createElement('button')
    deleteButton.className = 'delete'

    content.append(contentText, date, editButton, deleteButton)

    const form = document.createElement('form')
    const input = document.createElement('input')
    input.type = 'text'
    input.value = todo.content
    input.name = 'content'

    const saveButton = document.createElement('button')
    saveButton.className = 'save'

    const cancelButton = document.createElement('button')
    cancelButton.className = 'cancel'

    form.append(input, saveButton, cancelButton)
    listItem.append(content, form)
    items.append(listItem)
  })
  itemList.replaceChildren(items)
}

const niceDate = (dateString) => {
  return new Date(dateString).toLocaleString('en-ca', {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "numeric"
  })
}

// show the edit form for a given todo item
// also, move the cursor to the end of the text input for better usability
const showForm = (todo) => {
  todo.querySelector('form').style.display = 'flex'
  todo.querySelector('.content').style.display = 'none'
  let userInput = todo.querySelector('form input')
  let end = userInput.value.length
  userInput.setSelectionRange(end, end)
  userInput.focus()
}

// hide the edit form for a given todo item
const hideForm = (todo) => {
  todo.querySelector('form').style.display = 'none'
  todo.querySelector('.content').style.display = 'flex'
}

// Monitor the input form 
// and create a new todo on submit
document.querySelector('#dataForm')
  .addEventListener('submit', async (event) => {
    event.preventDefault()
    let textInput = document.querySelector("#textInput");
    if (textInput.value) {
      try {
        await createData(textInput.value)
        textInput.value = "";
        await displayData() // after creating, refresh the display
      } catch (error) {
        showError(error)
      }
    }
  })


// There's one click listener for the entire list
document.querySelector('#itemList')
  .addEventListener('click', async (event) => {
    event.preventDefault()
    // we will respond differently depending on which button was clicked
    let element = event.target;
    if (element.tagName == 'BUTTON') {
      // fnd the todo item that the button belongs to
      let todo = element.parentElement.parentElement;
      if (element.className == "edit") {
        showForm(todo)
      }
      if (element.className == "cancel") {
        hideForm(todo)
      }
      if (element.className == "save") {
        try {
          await updateData(todo)
          await displayData()  // after updating the todo refresh the display
        } catch (error) {
          showError(error)
        }
      }
      if (element.className == "delete") {
        try {
          await deleteData(todo)
          await displayData() // after deleting the todo, refresh the display.
        } catch (error) {
          showError(error)
        }
      }
    }
  })



// display the items
displayData()
