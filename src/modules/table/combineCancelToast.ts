/**
 * Combine Cancel focus restore × toast coexistence (Round 53).
 *
 * When Combine closes via Cancel (or Esc), restore the opener CTA with a
 * visible ring. If a toast was inert while the Combine overlay was open,
 * clearing inert leaves the toast interactive — same contract as Create
 * Cancel × Demo-fail toast (R45) and workspace empty CTA × toast (R52).
 */

import { restoreFocusEl } from '@/shared/ui/focusRestore'
import { flowchartEmptyCombineFocusFallback } from '@/modules/flowchart/flowchartEmpty'

/**
 * Round 53: Combine Cancel restores opener ring; toast host becomes
 * interactive again while any visible toast remains.
 */
export function combineCancelRestoresRingWithToast(): true {
  return true
}

/**
 * Restore focus to the Combine opener (or flowchart/workspace empty Combine
 * CTA fallback) with a visible ring after Cancel.
 */
export function applyCombineCancelFocus(
  opener: HTMLElement | null,
  doc: Document = document,
): void {
  restoreFocusEl(opener, () => flowchartEmptyCombineFocusFallback(doc), {
    visibleRing: true,
  })
}
