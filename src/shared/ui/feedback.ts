/**
 * Native toast / confirm / prompt — zero Element Plus (Round 23+24).
 * Keeps the same public API as the former ElMessage / ElMessageBox wrappers.
 */

import {
  FeedbackCancelError,
  dismissNewestToastElement,
  isFeedbackDialogOpen,
  listFocusable,
  preferCancelInitialFocus,
  toastLivePoliteness,
  trapTabKey,
  type ConfirmTone,
  type ToastKind,
} from './feedbackA11y'
import { captureFocusEl, paintFocusRestoreRing, restoreFocusEl } from './focusRestore'
import {
  dangerCancelUsesVisibleRing,
  dangerEscRestoresVisibleRing,
} from './dangerCancelFocusRing'
// feedback.css is loaded via main.css (Round 25) so Dexie/list chunks stay CSS-decoupled

export type MessageType = ToastKind

const TOAST_TTL_MS = 3200
const TOAST_MAX = 5

let toastHost: HTMLElement | null = null
let toastSeq = 0
let boxSeq = 0
let openBoxCount = 0
let docEscBound = false
/** Workspace overlays (CSV / Combine / Transform / ChartEdit) also block toast (Round 33). */
let externalToastInert = false

type FeedbackDialogListener = (open: boolean) => void
const feedbackDialogListeners = new Set<FeedbackDialogListener>()

function notifyFeedbackDialogListeners() {
  const open = openBoxCount > 0
  feedbackDialogListeners.forEach((fn) => fn(open))
}

/**
 * Subscribe to native confirm/prompt open state (Round 32).
 * Invokes immediately with the current open flag; returns an unsubscribe.
 */
export function onFeedbackDialogOpenChange(fn: FeedbackDialogListener): () => void {
  feedbackDialogListeners.add(fn)
  fn(openBoxCount > 0)
  return () => {
    feedbackDialogListeners.delete(fn)
  }
}

/**
 * Mark toast host inert while a non-feedback overlay owns the layer (Round 33).
 * CSV / Combine / Transform / ChartEdit should call this so Esc/Tab cannot
 * reach toast close buttons behind the modal.
 */
export function setToastHostExternalInert(active: boolean): void {
  externalToastInert = Boolean(active)
  syncToastHostInert()
}

function toastLayerBlocked(): boolean {
  return openBoxCount > 0 || isFeedbackDialogOpen() || externalToastInert
}

function ensureToastHost(): HTMLElement {
  if (toastHost && document.body.contains(toastHost)) return toastHost
  const host = document.createElement('div')
  host.className = 'ia-toast-host'
  host.setAttribute('data-ia-toast-host', '1')
  document.body.appendChild(host)
  toastHost = host
  bindDocumentEscape()
  syncToastHostInert()
  return host
}

function syncToastHostInert() {
  const host = toastHost
  if (!host) return
  if (toastLayerBlocked()) host.setAttribute('inert', '')
  else host.removeAttribute('inert')
}

/** Document Escape closes the newest toast when no dialog owns the layer (Round 27). */
function onDocumentEscape(e: KeyboardEvent) {
  if (e.key !== 'Escape') return
  if (e.defaultPrevented) return
  if (toastLayerBlocked()) return
  const host = toastHost && document.body.contains(toastHost) ? toastHost : null
  if (!host?.firstElementChild) return
  e.preventDefault()
  e.stopPropagation()
  dismissNewestToastElement(host)
}

function bindDocumentEscape() {
  if (docEscBound || typeof document === 'undefined') return
  document.addEventListener('keydown', onDocumentEscape, true)
  docEscBound = true
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
  el.appendChild(close)

  let ttl = window.setTimeout(() => {
    if (el.isConnected) el.remove()
  }, TOAST_TTL_MS)

  const clearTtl = () => {
    window.clearTimeout(ttl)
  }
  const restartTtl = () => {
    clearTtl()
    ttl = window.setTimeout(() => {
      if (el.isConnected) el.remove()
    }, TOAST_TTL_MS)
  }
  const dismiss = () => {
    clearTtl()
    el.remove()
  }

  close.addEventListener('click', dismiss)
  el.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      dismiss()
    }
  })
  el.addEventListener('mouseenter', clearTtl)
  el.addEventListener('mouseleave', restartTtl)
  el.addEventListener('focusin', clearTtl)
  el.addEventListener('focusout', (e) => {
    if (!el.contains(e.relatedTarget as Node | null)) restartTtl()
  })

  // Newest first in DOM → Tab reaches the latest close button before older ones (Round 26).
  host.insertBefore(el, host.firstChild)
  bindDocumentEscape()
}

/** Close buttons in Tab order (newest toast first). */
export function listToastCloseButtons(doc: Document = document): HTMLButtonElement[] {
  const host = doc.querySelector('[data-ia-toast-host]')
  if (!host) return []
  return [...host.querySelectorAll<HTMLButtonElement>('button.ia-toast__close')]
}

type ConfirmOptions = {
  type?: ConfirmTone
  danger?: boolean
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
    const restoreFocus = captureFocusEl()
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const uid = ++boxSeq
    const titleId = `ia-feedback-title-${uid}`
    const messageId = `ia-feedback-message-${uid}`

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
    panel.setAttribute('aria-labelledby', titleId)
    panel.setAttribute('aria-describedby', messageId)
    if (options?.danger) panel.setAttribute('data-ia-danger', '1')

    const header = document.createElement('header')
    header.className = 'ia-feedback-header'
    const h2 = document.createElement('h2')
    h2.id = titleId
    h2.textContent = title
    header.appendChild(h2)

    const body = document.createElement('div')
    body.className = 'ia-feedback-body'
    const msg = document.createElement('p')
    msg.id = messageId
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
    const danger = Boolean(options?.danger) || options?.type === 'error'
    confirmBtn.className = danger ? 'btn btn-danger' : 'btn btn-primary'
    confirmBtn.textContent = options?.confirmButtonText || '确定'
    if (danger) confirmBtn.setAttribute('data-ia-confirm-danger', '1')

    footer.appendChild(cancelBtn)
    footer.appendChild(confirmBtn)

    panel.appendChild(header)
    panel.appendChild(body)
    panel.appendChild(footer)
    root.appendChild(backdrop)
    root.appendChild(panel)
    document.body.appendChild(root)

    openBoxCount += 1
    syncToastHostInert()
    notifyFeedbackDialogListeners()

    let settled = false
    const cleanup = (opts?: { visibleRing?: boolean }) => {
      root.removeEventListener('keydown', onKeydown)
      root.remove()
      openBoxCount = Math.max(0, openBoxCount - 1)
      syncToastHostInert()
      notifyFeedbackDialogListeners()
      document.body.style.overflow = prevOverflow
      restoreFocusEl(restoreFocus, undefined, opts)
    }

    const settleCancel = () => {
      if (settled) return
      settled = true
      // Round 42: danger Esc/Cancel restores opener with a visible ring.
      cleanup(
        danger && dangerEscRestoresVisibleRing()
          ? { visibleRing: true }
          : undefined,
      )
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

    // Focus: prompt → input; destructive confirm → Cancel; else → Confirm.
    // Round 41: danger Cancel gets a visible restore ring (scripted focus).
    requestAnimationFrame(() => {
      if (input) {
        input.focus()
        input.select()
        return
      }
      const items = listFocusable(panel)
      const wantCancel = preferCancelInitialFocus(options)
      const prefer =
        (wantCancel
          ? items.find((el) => el === cancelBtn)
          : items.find((el) => el === confirmBtn)) || items[0]
      prefer?.focus()
      if (
        prefer === cancelBtn &&
        wantCancel &&
        danger &&
        dangerCancelUsesVisibleRing()
      ) {
        paintFocusRestoreRing(cancelBtn)
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

export {
  FeedbackCancelError,
  dismissNewestToastElement,
  isFeedbackCancel,
  isFeedbackDialogOpen,
  preferCancelInitialFocus,
} from './feedbackA11y'
