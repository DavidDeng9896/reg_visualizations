/**
 * Native toast / confirm / prompt — zero Element Plus (Round 23).
 * Keeps the same public API as the former ElMessage / ElMessageBox wrappers.
 */

import {
  FeedbackCancelError,
  listFocusable,
  toastLivePoliteness,
  trapTabKey,
  type ToastKind,
} from './feedbackA11y'
import './feedback.css'

export type MessageType = ToastKind

const TOAST_TTL_MS = 3200
const TOAST_MAX = 5

let toastHost: HTMLElement | null = null
let toastSeq = 0

function ensureToastHost(): HTMLElement {
  if (toastHost && document.body.contains(toastHost)) return toastHost
  const host = document.createElement('div')
  host.className = 'ia-toast-host'
  host.setAttribute('data-ia-toast-host', '1')
  document.body.appendChild(host)
  toastHost = host
  return host
}

export function toast(type: MessageType, message: string) {
  if (typeof document === 'undefined') return
  const host = ensureToastHost()
  while (host.children.length >= TOAST_MAX) {
    host.firstElementChild?.remove()
  }

  const id = `ia-toast-${++toastSeq}`
  const el = document.createElement('div')
  el.id = id
  el.className = `ia-toast ia-toast--${type}`
  el.setAttribute('role', type === 'error' || type === 'warning' ? 'alert' : 'status')
  el.setAttribute('aria-live', toastLivePoliteness(type))
  el.setAttribute('aria-atomic', 'true')

  const text = document.createElement('span')
  text.className = 'ia-toast__text'
  text.textContent = message
  el.appendChild(text)

  const close = document.createElement('button')
  close.type = 'button'
  close.className = 'ia-toast__close'
  close.setAttribute('aria-label', '关闭通知')
  close.textContent = '×'
  close.addEventListener('click', () => el.remove())
  el.appendChild(close)

  host.appendChild(el)
  window.setTimeout(() => {
    if (el.isConnected) el.remove()
  }, TOAST_TTL_MS)
}

type ConfirmOptions = {
  type?: 'warning' | 'info' | 'success' | 'error'
  confirmButtonText?: string
  cancelButtonText?: string
}

type PromptOptions = {
  inputValue?: string
}

type BoxMode = 'confirm' | 'prompt'

function openMessageBox(
  mode: BoxMode,
  message: string,
  title: string,
  options?: ConfirmOptions & PromptOptions,
): Promise<{ value: string } | true> {
  if (typeof document === 'undefined') {
    return Promise.reject(new FeedbackCancelError('no-document'))
  }

  return new Promise((resolve, reject) => {
    const restoreFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const root = document.createElement('div')
    root.className = 'ia-feedback-root'
    root.setAttribute('data-ia-feedback', mode)
    root.setAttribute('role', 'presentation')

    const backdrop = document.createElement('button')
    backdrop.type = 'button'
    backdrop.className = 'ia-feedback-backdrop'
    backdrop.tabIndex = -1
    backdrop.setAttribute('aria-label', '关闭对话框')

    const panel = document.createElement('div')
    panel.className = 'ia-feedback-panel'
    panel.setAttribute('role', 'dialog')
    panel.setAttribute('aria-modal', 'true')
    panel.setAttribute('aria-labelledby', 'ia-feedback-title')
    panel.setAttribute('aria-describedby', 'ia-feedback-message')

    const header = document.createElement('header')
    header.className = 'ia-feedback-header'
    const h2 = document.createElement('h2')
    h2.id = 'ia-feedback-title'
    h2.textContent = title
    header.appendChild(h2)

    const body = document.createElement('div')
    body.className = 'ia-feedback-body'
    const msg = document.createElement('p')
    msg.id = 'ia-feedback-message'
    msg.className = 'ia-feedback-message'
    msg.textContent = message
    body.appendChild(msg)

    let input: HTMLInputElement | null = null
    if (mode === 'prompt') {
      input = document.createElement('input')
      input.type = 'text'
      input.className = 'ia-feedback-input native-input'
      input.setAttribute('aria-label', message || title)
      input.value = options?.inputValue ?? ''
      body.appendChild(input)
    }

    const footer = document.createElement('footer')
    footer.className = 'ia-feedback-footer'

    const cancelBtn = document.createElement('button')
    cancelBtn.type = 'button'
    cancelBtn.className = 'btn'
    cancelBtn.textContent = options?.cancelButtonText || '取消'

    const confirmBtn = document.createElement('button')
    confirmBtn.type = 'button'
    confirmBtn.className = 'btn btn-primary'
    confirmBtn.textContent = options?.confirmButtonText || '确定'

    footer.appendChild(cancelBtn)
    footer.appendChild(confirmBtn)

    panel.appendChild(header)
    panel.appendChild(body)
    panel.appendChild(footer)
    root.appendChild(backdrop)
    root.appendChild(panel)
    document.body.appendChild(root)

    let settled = false
    const cleanup = () => {
      root.removeEventListener('keydown', onKeydown)
      root.remove()
      document.body.style.overflow = prevOverflow
      if (restoreFocus && document.contains(restoreFocus)) restoreFocus.focus()
    }

    const settleCancel = () => {
      if (settled) return
      settled = true
      cleanup()
      reject(new FeedbackCancelError())
    }

    const settleConfirm = () => {
      if (settled) return
      settled = true
      const value = input?.value ?? ''
      cleanup()
      if (mode === 'prompt') resolve({ value })
      else resolve(true)
    }

    function onKeydown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        settleCancel()
        return
      }
      if (e.key === 'Enter' && mode === 'prompt' && e.target === input) {
        e.preventDefault()
        settleConfirm()
        return
      }
      trapTabKey(panel, e)
    }

    backdrop.addEventListener('click', settleCancel)
    cancelBtn.addEventListener('click', settleCancel)
    confirmBtn.addEventListener('click', settleConfirm)
    root.addEventListener('keydown', onKeydown)

    // Focus: prompt → input; confirm → primary (safer default for destructive).
    requestAnimationFrame(() => {
      if (input) {
        input.focus()
        input.select()
      } else {
        const items = listFocusable(panel)
        const prefer = items.find((el) => el === confirmBtn) || items[0]
        prefer?.focus()
      }
    })
  })
}

export async function confirm(
  message: string,
  title: string,
  options?: ConfirmOptions,
): Promise<true> {
  await openMessageBox('confirm', message, title, options)
  return true
}

export async function prompt(
  message: string,
  title: string,
  options?: PromptOptions,
): Promise<{ value: string }> {
  const result = await openMessageBox('prompt', message, title, options)
  return result as { value: string }
}

export { FeedbackCancelError, isFeedbackCancel } from './feedbackA11y'
