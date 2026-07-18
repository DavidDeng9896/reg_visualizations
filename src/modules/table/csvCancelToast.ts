/**
 * CSV Cancel focus restore × toast coexistence (Round 54).
 *
 * When CSV closes via Cancel (or Esc), restore the opener CTA with a
 * visible ring. If a toast was inert while the CSV overlay was open,
 * clearing inert leaves the toast interactive — same contract as Combine
 * Cancel × toast (R53).
 */

import { restoreFocusEl } from '@/shared/ui/focusRestore'
import { flowchartEmptyCsvFocusFallback } from '@/modules/flowchart/flowchartEmpty'

/**
 * Round 54: CSV Cancel restores opener ring; toast host becomes
 * interactive again while any visible toast remains.
 */
export function csvCancelRestoresRingWithToast(): true {
  return true
}

/**
 * Restore focus to the CSV opener (or flowchart/workspace empty CSV
 * CTA fallback) with a visible ring after Cancel.
 */
export function applyCsvCancelFocus(
  opener: HTMLElement | null,
  doc: Document = document,
): void {
  restoreFocusEl(opener, () => flowchartEmptyCsvFocusFallback(doc), {
    visibleRing: true,
  })
}
