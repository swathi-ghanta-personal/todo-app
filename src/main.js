import './style.css'
import { createElement as createLucideIcon, Trash2 } from 'lucide'
import { supabase } from './supabase.js'

/** @typedef {{ id: number; text: string; is_complete: boolean; created_at: string }} Todo */

/** @type {Todo[]} */
let todos = []

const listEl = document.querySelector('#todo-list')
const formEl = document.querySelector('#todo-form')
const inputEl = document.querySelector('#todo-input')

function render() {
  listEl.replaceChildren()

  for (const todo of todos) {
    const item = document.createElement('li')
    item.className = `todo-item${todo.is_complete ? ' todo-item--completed' : ''}`
    item.dataset.id = String(todo.id)

    const checkbox = document.createElement('input')
    checkbox.type = 'checkbox'
    checkbox.className = 'todo-item-checkbox'
    checkbox.checked = todo.is_complete

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

async function loadTodos() {
  const { data, error } = await supabase
    .from('todos')
    .select('id, text, is_complete, created_at')
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Failed to load todos:', error.message)
    return
  }

  todos = data
  render()
}

formEl.addEventListener('submit', async (e) => {
  e.preventDefault()
  const value = inputEl.value.trim()
  if (!value) return

  const { data, error } = await supabase
    .from('todos')
    .insert({ text: value, is_complete: false })
    .select('id, text, is_complete, created_at')
    .single()

  if (error) {
    console.error('Failed to add todo:', error.message)
    return
  }

  todos.push(data)
  inputEl.value = ''
  render()
})

listEl.addEventListener('change', async (e) => {
  const target = e.target
  if (!(target instanceof HTMLInputElement) || target.type !== 'checkbox') return
  if (!target.classList.contains('todo-item-checkbox')) return

  const id = Number(target.closest('.todo-item')?.dataset.id)
  const todo = todos.find((t) => t.id === id)
  if (!todo) return

  const { error } = await supabase
    .from('todos')
    .update({ is_complete: target.checked })
    .eq('id', id)

  if (error) {
    console.error('Failed to update todo:', error.message)
    target.checked = todo.is_complete
    return
  }

  todo.is_complete = target.checked
  render()
})

listEl.addEventListener('click', async (e) => {
  const btn = e.target.closest('.todo-item-delete')
  if (!btn) return

  const item = btn.closest('.todo-item')
  const id = Number(item?.dataset.id)

  const { error } = await supabase
    .from('todos')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Failed to delete todo:', error.message)
    return
  }

  todos = todos.filter((t) => t.id !== id)
  render()
})

loadTodos()
