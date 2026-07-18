/** Focus-trap helpers for native confirm/prompt dialogs (Round 23). */

export const FEEDBACK_FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'

export function listFocusable(root: ParentNode | null | undefined): HTMLElement[] {
  if (!root) return []
  return [...root.querySelectorAll<HTMLElement>(FEEDBACK_FOCUSABLE)].filter(
    (el) => !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true',
  )
}

/** Cycle Tab/Shift+Tab inside a dialog panel. Returns true when handled. */
export function trapTabKey(root: ParentNode, event: KeyboardEvent): boolean {
  if (event.key !== 'Tab') return false
  const items = listFocusable(root)
  if (!items.length) return false
  const first = items[0]
  const last = items[items.length - 1]
  const active = document.activeElement
  if (event.shiftKey) {
    if (active === first || !root.contains(active)) {
      event.preventDefault()
      last.focus()
      return true
    }
  } else if (active === last || !root.contains(active)) {
    event.preventDefault()
    first.focus()
    return true
  }
  return false
}

export type ToastKind = 'success' | 'warning' | 'info' | 'error'

export type ConfirmTone = 'warning' | 'info' | 'success' | 'error'

/** Map toast kind to polite/assertive live politeness. */
export function toastLivePoliteness(kind: ToastKind): 'polite' | 'assertive' {
  return kind === 'error' || kind === 'warning' ? 'assertive' : 'polite'
}

/**
 * Destructive / warning confirms should land focus on Cancel so Enter does not
 * accidentally confirm (Round 24 a11y). Info/success may focus Confirm.
 */
export function preferCancelInitialFocus(options?: {
  type?: ConfirmTone
  danger?: boolean
}): boolean {
  if (options?.danger) return true
  const tone = options?.type ?? 'warning'
  return tone === 'warning' || tone === 'error'
}

export class FeedbackCancelError extends Error {
  readonly action = 'cancel' as const
  constructor(message = 'cancel') {
    super(message)
    this.name = 'FeedbackCancelError'
  }
}

export function isFeedbackCancel(err: unknown): boolean {
  return (
    err instanceof FeedbackCancelError ||
    (typeof err === 'object' &&
      err !== null &&
      'action' in err &&
      (err as { action?: string }).action === 'cancel')
  )
}

/** True when a native confirm/prompt dialog is mounted. */
export function isFeedbackDialogOpen(doc: Document = document): boolean {
  return Boolean(doc.querySelector('[data-ia-feedback]'))
}

/**
 * Remove the newest toast (first child of host). Returns true when one was dismissed.
 * Used by document-level Escape (Round 27).
 */
export function dismissNewestToastElement(host: Element | null | undefined): boolean {
  const newest = host?.firstElementChild
  if (!newest) return false
  newest.remove()
  return true
}
