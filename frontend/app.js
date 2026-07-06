const API_BASE = "/api";

function showStatus(message, isError = false) {
  const statusDiv = document.getElementById("status");
  statusDiv.innerHTML = message;
  statusDiv.className = "status " + (isError ? "error" : "success");

  setTimeout(() => {
    statusDiv.innerHTML = "";
    statusDiv.className = "";
  }, 3000);
}

async function loadTodos() {
  try {
    const response = await fetch(`${API_BASE}/todos`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const todos = await response.json();
    displayTodos(todos);
  } catch (error) {
    console.error("Error loading todos:", error);
    showStatus("Error loading todos: " + error.message, true);
  }
}

function displayTodos(todos) {
  const todoList = document.getElementById("todoList");
  todoList.innerHTML = "";

  todos.forEach((todo) => {
    const li = document.createElement("li");
    li.className = "todo-item";

    li.innerHTML = `
      <strong>${todo.title}</strong>
      <p>${todo.description}</p>
      <small>Created: ${new Date(todo.createdAt).toLocaleString()}</small>
    `;

    todoList.appendChild(li);
  });
}

async function addTodo() {
  const input = document.getElementById("todoInput");
  const title = input.value.trim();

  if (!title) {
    showStatus("Please enter a todo item", true);
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/todos`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: title,
        description: `Todo item: ${title}`,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    input.value = "";
    showStatus("Todo added successfully!");
    loadTodos();
  } catch (error) {
    console.error("Error adding todo:", error);
    showStatus("Error adding todo: " + error.message, true);
  }
}

// Load todos when page loads
document.addEventListener("DOMContentLoaded", loadTodos);
