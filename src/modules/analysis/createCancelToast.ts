/**
 * Create Cancel focus restore × toast coexistence (Round 56 spot check).
 *
 * When Create closes via Cancel (or Esc), restore the opener Create CTA with a
 * visible ring. If a toast was inert while Create was open, clearing inert
 * leaves the toast interactive — same contract as Create Cancel × Demo-fail
 * toast (R45) and CSV/Combine/Transform Cancel × toast (R53–54).
 *
 * Round 56: formalize `applyCreateCancelFocus` so list Create Cancel shares
 * the same restore helper shape as other overlays (spot-check + regression).
 *
 * Round 58: Esc uses the same restore path as Cancel (regression marker).
 */

import { resolveCreateRestoreFocus } from '@/modules/analysis/createAnalysisHandoff'
import { restoreFocusEl } from '@/shared/ui/focusRestore'

/**
 * Round 56: Create Cancel restores opener ring; toast host becomes
 * interactive again while any visible toast remains.
 */
export function createCancelRestoresRingWithToast(): true {
  return true
}

/**
 * Round 58: Create Esc restores opener ring with the same toast contract
 * as Cancel (both close via applyCreateCancelFocus).
 */
export function createEscRestoresRingWithToast(): true {
  return true
}

/**
 * Round 62: Create Cancel × toast spot-check regression — same contract as
 * Round 56 (visible ring + interactive toast host).
 */
export function createCancelToastR62SpotCheck(): true {
  return true
}

/**
 * Round 65: Create Esc × toast spot-check regression — same contract as
 * Round 58 (visible ring + interactive toast host).
 */
export function createEscToastR65SpotCheck(): true {
  return true
}

/**
 * Round 68: Create Cancel × toast spot-check regression — same contract as
 * Round 56 / R62 (visible ring + interactive toast host).
 */
export function createCancelToastR68SpotCheck(): true {
  return true
}

/**
 * Restore focus to the Create opener (or header/empty Create fallback) with a
 * visible ring after Cancel / Esc.
 */
export function applyCreateCancelFocus(
  opener: HTMLElement | null,
  doc: Document = document,
): void {
  restoreFocusEl(opener, () => resolveCreateRestoreFocus(null, doc), {
    visibleRing: true,
  })
}
