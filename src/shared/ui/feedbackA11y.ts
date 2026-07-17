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

/** Map toast kind to polite/assertive live politeness. */
export function toastLivePoliteness(kind: ToastKind): 'polite' | 'assertive' {
  return kind === 'error' || kind === 'warning' ? 'assertive' : 'polite'
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
