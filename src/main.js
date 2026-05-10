import './style.css'
import { createElement as createLucideIcon, Trash2 } from 'lucide'
import { supabase } from './supabase.js'

/** @typedef {{ id: number; text: string; is_complete: boolean; created_at: string; user_id: string }} Todo */

/** @type {Todo[]} */
let todos = []

/** @type {import('@supabase/supabase-js').User | null} */
let currentUser = null

const listEl = document.querySelector('#todo-list')
const formEl = document.querySelector('#todo-form')
const inputEl = document.querySelector('#todo-input')

/** @type {HTMLDialogElement} */
const authDialogEl = document.querySelector('#auth-dialog')
const authDialogTitleEl = document.querySelector('#auth-dialog-title')
const authHeaderActionsEl = document.querySelector('#auth-header-actions')
const authOpenSigninBtn = document.querySelector('#auth-open-signin')
const authOpenSignupBtn = document.querySelector('#auth-open-signup')
const authCancelBtn = document.querySelector('#auth-cancel-btn')
const authUserBarEl = document.querySelector('#auth-user-bar')
const authUserEmailEl = document.querySelector('#auth-user-email')
const authSignoutBtn = document.querySelector('#auth-signout-btn')
const authFormEl = document.querySelector('#auth-form')
const authEmailInputEl = document.querySelector('#auth-email-input')
const authPasswordInputEl = document.querySelector('#auth-password-input')
const authErrorEl = document.querySelector('#auth-error')
const authMessageEl = document.querySelector('#auth-message')
const authSubmitBtn = document.querySelector('#auth-submit-btn')
const authFooterSigninCopyEl = document.querySelector('#auth-footer-signin-copy')
const authFooterSignupCopyEl = document.querySelector('#auth-footer-signup-copy')
const authSwitchToSignupBtn = document.querySelector('#auth-switch-to-signup')
const authSwitchToSigninBtn = document.querySelector('#auth-switch-to-signin')

/** @type {'signin' | 'signup'} */
let authMode = 'signin'

/** When true, email/password form panel is visible (non–email-account users only). */
let authFormOpen = false

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

/** @param {import('@supabase/supabase-js').User | null | undefined} user */
function isEmailAccount(user) {
  if (!user?.email?.trim()) return false
  // Anonymous sessions must not show the user bar; only treat as anonymous when flag is explicitly true.
  return user.is_anonymous !== true
}

function syncHeaderTriggers() {
  authOpenSigninBtn.setAttribute('aria-expanded', String(authFormOpen && authMode === 'signin'))
  authOpenSignupBtn.setAttribute('aria-expanded', String(authFormOpen && authMode === 'signup'))
  authOpenSigninBtn.classList.toggle('auth-header-btn--active', authFormOpen && authMode === 'signin')
  authOpenSignupBtn.classList.toggle('auth-header-btn--active', authFormOpen && authMode === 'signup')
}

function syncAuthModalFooter() {
  authFooterSigninCopyEl.hidden = authMode !== 'signin'
  authFooterSignupCopyEl.hidden = authMode !== 'signup'
}

function renderAuthUI() {
  const isEmailUser = isEmailAccount(currentUser)

  if (isEmailUser) {
    authFormOpen = false
    if (authDialogEl.open) authDialogEl.close()
  }

  authUserBarEl.hidden = !isEmailUser
  authHeaderActionsEl.hidden = !!isEmailUser

  authSubmitBtn.textContent = authMode === 'signin' ? 'Sign in' : 'Create account'
  syncHeaderTriggers()
  syncAuthModalFooter()

  if (isEmailUser) {
    authUserEmailEl.textContent = currentUser.email
  } else {
    authUserEmailEl.textContent = ''
  }
}

authDialogEl.addEventListener('close', () => {
  authFormOpen = false
  authFormEl.reset()
  authErrorEl.hidden = true
  authErrorEl.textContent = ''
  authMessageEl.hidden = true
  authMessageEl.textContent = ''
  syncHeaderTriggers()
})

authDialogEl.addEventListener('click', (e) => {
  if (e.target === authDialogEl) authDialogEl.close()
})

/** @param {'signin' | 'signup'} mode */
function openAuthPanel(mode) {
  authMode = mode
  authFormOpen = true
  authDialogTitleEl.textContent = authMode === 'signin' ? 'Sign in' : 'Create account'
  authErrorEl.hidden = true
  authErrorEl.textContent = ''
  authMessageEl.hidden = true
  authMessageEl.textContent = ''
  if (!authDialogEl.open) {
    authDialogEl.showModal()
  }
  renderAuthUI()
  requestAnimationFrame(() => {
    authEmailInputEl.focus()
  })
}

function closeAuthPanel() {
  if (authDialogEl.open) authDialogEl.close()
}

authOpenSigninBtn.addEventListener('click', () => {
  openAuthPanel('signin')
})

authOpenSignupBtn.addEventListener('click', () => {
  openAuthPanel('signup')
})

authSwitchToSignupBtn.addEventListener('click', () => {
  openAuthPanel('signup')
})

authSwitchToSigninBtn.addEventListener('click', () => {
  openAuthPanel('signin')
})

authCancelBtn.addEventListener('click', () => {
  closeAuthPanel()
})

/** @param {string} raw */
function friendlyAuthError(raw) {
  const msg = raw.toLowerCase()
  if (msg.includes('invalid login credentials') || msg.includes('invalid credentials')) {
    return 'Incorrect email or password. Please try again.'
  }
  if (msg.includes('email not confirmed')) {
    return 'Please check your inbox and confirm your email before signing in.'
  }
  if (msg.includes('user already registered') || msg.includes('already been registered')) {
    return 'An account with this email already exists. Try signing in instead.'
  }
  if (msg.includes('password should be')) {
    return 'Password must be at least 6 characters.'
  }
  if (msg.includes('unable to validate email')) {
    return 'Please enter a valid email address.'
  }
  return raw
}

/** @param {string} msg */
function showAuthError(msg) {
  authErrorEl.textContent = msg
  authErrorEl.hidden = false
}

/** @param {string} msg */
function showAuthMessage(msg) {
  authMessageEl.textContent = msg
  authMessageEl.hidden = false
}

authFormEl.addEventListener('submit', async (e) => {
  e.preventDefault()
  const email = authEmailInputEl.value.trim()
  const password = authPasswordInputEl.value

  authErrorEl.hidden = true
  authMessageEl.hidden = true
  authSubmitBtn.disabled = true

  let data, error

  if (authMode === 'signup' && currentUser?.is_anonymous === true) {
    // Upgrade the anonymous account in-place: same user_id means all existing
    // todos carry over automatically — no data migration needed
    ;({ data, error } = await supabase.auth.updateUser({ email, password }))
  } else if (authMode === 'signup') {
    ;({ data, error } = await supabase.auth.signUp({ email, password }))
  } else {
    ;({ data, error } = await supabase.auth.signInWithPassword({ email, password }))
  }

  authSubmitBtn.disabled = false

  if (error) {
    showAuthError(friendlyAuthError(error.message))
    return
  }

  // signUp silently "succeeds" for existing emails — identities will be empty
  if (authMode === 'signup' && currentUser?.is_anonymous !== true && data.user?.identities?.length === 0) {
    showAuthError('An account with this email already exists. Try signing in instead.')
    return
  }

  currentUser = data.user
  authFormEl.reset()

  // Email confirmation pending: signUp returns no session; updateUser leaves
  // the user anonymous until the confirmation link is clicked
  const needsConfirmation = authMode !== 'signin' && (!data.session || currentUser?.is_anonymous)
  if (needsConfirmation) {
    showAuthMessage('Check your inbox to confirm your email address. Your to-dos are saved and will be ready when you sign in.')
    return
  }

  renderAuthUI()
  await loadTodos()
})

authSignoutBtn.addEventListener('click', async () => {
  authSignoutBtn.disabled = true
  currentUser = null
  authUserEmailEl.textContent = ''
  closeAuthPanel()
  renderAuthUI()

  const { error } = await supabase.auth.signOut()
  if (error) console.error('Sign out failed:', error.message)

  await ensureSession()
  renderAuthUI()
  await loadTodos()
  authSignoutBtn.disabled = false
})

async function ensureSession() {
  const { data: { session } } = await supabase.auth.getSession()

  if (session) {
    currentUser = session.user
    return
  }

  const { data, error } = await supabase.auth.signInAnonymously()
  if (error) {
    console.error('Failed to sign in anonymously:', error.message)
    currentUser = null
    return
  }

  currentUser = data.user
}

async function loadTodos() {
  if (!currentUser) return

  const { data, error } = await supabase
    .from('todos')
    .select('id, text, is_complete, created_at')
    .eq('user_id', currentUser.id)
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

async function init() {
  await ensureSession()
  renderAuthUI()
  await loadTodos()

  supabase.auth.onAuthStateChange((_event, session) => {
    currentUser = session?.user ?? null
    renderAuthUI()
  })
}

init()
