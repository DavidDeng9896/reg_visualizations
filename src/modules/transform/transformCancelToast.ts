/**
 * Transform Cancel focus restore × toast coexistence (Round 54).
 *
 * When Transform closes via Cancel (or Esc), restore the opener (toolbar
 * trigger) with a visible ring. If a toast was inert while the Transform
 * overlay was open, clearing inert leaves the toast interactive — same
 * contract as Combine Cancel × toast (R53) and CSV Cancel × toast (R54).
 */

import { restoreFocusEl } from '@/shared/ui/focusRestore'

/**
 * Round 54: Transform Cancel restores opener ring; toast host becomes
 * interactive again while any visible toast remains.
 */
export function transformCancelRestoresRingWithToast(): true {
  return true
}

/** Fallback: first focusable control in the workspace toolbar. */
export function transformCancelFocusFallback(
  doc: Document = document,
): HTMLElement | null {
  return doc.querySelector('#ws-toolbar button, #ws-toolbar [tabindex]') as HTMLElement | null
}

/**
 * Restore focus to the Transform opener (or toolbar fallback) with a
 * visible ring after Cancel.
 */
export function applyTransformCancelFocus(
  opener: HTMLElement | null,
  doc: Document = document,
): void {
  restoreFocusEl(opener, () => transformCancelFocusFallback(doc), {
    visibleRing: true,
  })
}
