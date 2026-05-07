import './style.css'
import { createElement as createLucideIcon, Trash2 } from 'lucide'

/** @typedef {{ id: number; text: string; completed: boolean }} Todo */

/** @type {Todo[]} */
const todos = []

let nextId = 1

const listEl = document.querySelector('#todo-list')
const formEl = document.querySelector('#todo-form')
const inputEl = document.querySelector('#todo-input')

function render() {
  listEl.replaceChildren()

  const ordered = [...todos].sort(
    (a, b) => Number(a.completed) - Number(b.completed)
  )

  for (const todo of ordered) {
    const item = document.createElement('li')
    item.className = `todo-item${todo.completed ? ' todo-item--completed' : ''}`
    item.dataset.id = String(todo.id)

    const checkbox = document.createElement('input')
    checkbox.type = 'checkbox'
    checkbox.className = 'todo-item-checkbox'
    checkbox.checked = todo.completed

    const text = document.createElement('span')
    text.className = 'todo-item-text'
    text.textContent = todo.text

    const del = document.createElement('button')
    del.type = 'button'
    del.className = 'todo-item-delete'
    del.setAttribute('aria-label', `Delete to-do: ${todo.text}`)
    const icon = createLucideIcon(Trash2, {
      class: 'todo-item-delete-icon',
      'aria-hidden': 'true',
      width: 18,
      height: 18,
    })
    del.appendChild(icon)

    item.append(checkbox, text, del)
    listEl.appendChild(item)
  }
}

formEl.addEventListener('submit', (e) => {
  e.preventDefault()
  const value = inputEl.value.trim()
  if (!value) return

  todos.push({ id: nextId++, text: value, completed: false })
  inputEl.value = ''
  render()
})

listEl.addEventListener('change', (e) => {
  const target = e.target
  if (!(target instanceof HTMLInputElement) || target.type !== 'checkbox') return
  if (!target.classList.contains('todo-item-checkbox')) return

  const id = Number(target.closest('.todo-item')?.dataset.id)
  const todo = todos.find((t) => t.id === id)
  if (!todo) return

  todo.completed = target.checked
  render()
})

listEl.addEventListener('click', (e) => {
  const btn = e.target.closest('.todo-item-delete')
  if (!btn) return

  const item = btn.closest('.todo-item')
  const id = Number(item?.dataset.id)
  const index = todos.findIndex((t) => t.id === id)
  if (index === -1) return

  todos.splice(index, 1)
  render()
})

render()
