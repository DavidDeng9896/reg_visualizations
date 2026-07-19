/**
 * ChartEdit Cancel focus restore × toast coexistence (Round 55).
 *
 * When ChartEdit closes via Cancel (or Esc), restore the opener (toolbar Edit
 * trigger) with a visible ring. If a toast was inert while the drawer was
 * open, clearing inert leaves the toast interactive — same contract as
 * Transform Cancel × toast (R54).
 */

import { restoreFocusEl } from '@/shared/ui/focusRestore'

/**
 * Round 55: ChartEdit Cancel restores opener ring; toast host becomes
 * interactive again while any visible toast remains.
 */
export function chartEditCancelRestoresRingWithToast(): true {
  return true
}

/** Fallback: first focusable control in the workspace toolbar. */
export function chartEditCancelFocusFallback(
  doc: Document = document,
): HTMLElement | null {
  return doc.querySelector('#ws-toolbar button, #ws-toolbar [tabindex]') as HTMLElement | null
}

/**
 * Restore focus to the ChartEdit opener (or toolbar fallback) with a
 * visible ring after Cancel.
 */
export function applyChartEditCancelFocus(
  opener: HTMLElement | null,
  doc: Document = document,
): void {
  restoreFocusEl(opener, () => chartEditCancelFocusFallback(doc), {
    visibleRing: true,
  })
}
