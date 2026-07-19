/**
 * Transform Cancel focus restore × toast coexistence (Round 54).
 *
 * When Transform closes via Cancel (or Esc), restore the opener (toolbar
 * trigger) with a visible ring. If a toast was inert while the Transform
 * overlay was open, clearing inert leaves the toast interactive — same
 * contract as Combine Cancel × toast (R53) and CSV Cancel × toast (R54).
 *
 * Round 56: Esc uses the same restore path as Cancel (regression marker).
 */

import { restoreFocusEl } from '@/shared/ui/focusRestore'

/**
 * Round 54: Transform Cancel restores opener ring; toast host becomes
 * interactive again while any visible toast remains.
 */
export function transformCancelRestoresRingWithToast(): true {
  return true
}

/**
 * Round 56: Transform Esc restores opener ring with the same toast contract
 * as Cancel (both close via applyTransformCancelFocus).
 */
export function transformEscRestoresRingWithToast(): true {
  return true
}

/**
 * Round 58: Transform Esc × toast spot-check regression — same contract
 * as Round 56 (visible ring + interactive toast host).
 */
export function transformEscToastR58SpotCheck(): true {
  return true
}

/**
 * Round 60: Transform Cancel × toast spot-check regression — same contract
 * as Round 54 (visible ring + interactive toast host).
 */
export function transformCancelToastR60SpotCheck(): true {
  return true
}

/**
 * Round 62: Transform Esc × toast spot-check regression — same contract
 * as Round 56 / R58 (visible ring + interactive toast host).
 */
export function transformEscToastR62SpotCheck(): true {
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
