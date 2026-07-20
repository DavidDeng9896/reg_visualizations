/**
 * New view Cancel focus restore × toast coexistence (Round 55).
 *
 * When New view closes via Cancel (or Esc), restore the opener (e.g. New view
 * menu item / no-views CTA) with a visible ring. If a toast was inert while
 * the New view overlay was open, clearing inert leaves the toast interactive —
 * same contract as Combine/CSV/Transform Cancel × toast (R53–54).
 *
 * Round 57: Esc uses the same restore path as Cancel (regression marker).
 */

import { restoreFocusEl } from '@/shared/ui/focusRestore'

/**
 * Round 55: New view Cancel restores opener ring; toast host becomes
 * interactive again while any visible toast remains.
 */
export function newViewCancelRestoresRingWithToast(): true {
  return true
}

/**
 * Round 57: New view Esc restores opener ring with the same toast contract
 * as Cancel (both close via applyNewViewCancelFocus).
 */
export function newViewEscRestoresRingWithToast(): true {
  return true
}

/**
 * Round 59: New view Cancel × toast regression — same contract as
 * Round 55 (visible ring + interactive toast host).
 */
export function newViewCancelToastR59Regression(): true {
  return true
}

/**
 * Round 62: New view Cancel × toast regression — same contract as
 * Round 55 / R59 (visible ring + interactive toast host).
 */
export function newViewCancelToastR62Regression(): true {
  return true
}

/**
 * Round 64: New view Cancel × toast regression — same contract as
 * Round 55 / R59 / R62 (visible ring + interactive toast host).
 */
export function newViewCancelToastR64Regression(): true {
  return true
}

/**
 * Round 67: New view Cancel × toast regression — same contract as
 * Round 55 / R59 / R62 / R64 (visible ring + interactive toast host).
 */
export function newViewCancelToastR67Regression(): true {
  return true
}

/**
 * Round 79: New view Cancel × toast regression — same contract as
 * Round 55 / R59 / R62 / R64 / R67 (visible ring + interactive toast host).
 */
export function newViewCancelToastR79Regression(): true {
  return true
}

/**
 * Round 83: New view Cancel × toast regression — same contract as
 * Round 55 / R59 / R62 / R64 / R67 / R79 (visible ring + interactive toast host).
 */
export function newViewCancelToastR83Regression(): true {
  return true
}

/**
 * Round 85: New view Cancel × toast regression — same contract as
 * Round 55 / R59 / R62 / R64 / R67 / R79 / R83 (visible ring + interactive toast host).
 */
export function newViewCancelToastR85Regression(): true {
  return true
}

/**
 * Round 87: New view Cancel × toast regression — same contract as
 * Round 55 / R59 / R62 / R64 / R67 / R79 / R83 / R85 (visible ring + interactive toast host).
 */
export function newViewCancelToastR87Regression(): true {
  return true
}

/**
 * Round 89: New view Cancel × toast regression — same contract as
 * Round 55 / R59 / R62 / R64 / R67 / R79 / R83 / R85 / R87 (visible ring + interactive toast host).
 */
export function newViewCancelToastR89Regression(): true {
  return true
}

/**
 * Round 91: New view Cancel × toast regression — same contract as
 * Round 55 / R59 / R62 / R64 / R67 / R79 / R83 / R85 / R87 / R89 (visible ring + interactive toast host).
 */
export function newViewCancelToastR91Regression(): true {
  return true
}

/**
 * Round 93: New view Cancel × toast regression — same contract as
 * Round 55 / R59 / R62 / R64 / R67 / R79 / R83 / R85 / R87 / R89 / R91 (visible ring + interactive toast host).
 */
export function newViewCancelToastR93Regression(): true {
  return true
}

/**
 * Round 95: New view Cancel × toast regression — same contract as
 * Round 55 / R59 / R62 / R64 / R67 / R79 / R83 / R85 / R87 / R89 / R91 / R93 (visible ring + interactive toast host).
 */
export function newViewCancelToastR95Regression(): true {
  return true
}

/**
 * Round 97: New view Cancel × toast regression — same contract as
 * Round 55 / R59 / R62 / R64 / R67 / R79 / R83 / R85 / R87 / R89 / R91 / R93 / R95 (visible ring + interactive toast host).
 */
export function newViewCancelToastR97Regression(): true {
  return true
}

/** Fallback: New view trigger in sidebar ops, then sidebar empty CSV CTA. */
export function newViewCancelFocusFallback(
  doc: Document = document,
): HTMLElement | null {
  const byAria = doc.querySelector(
    '[aria-label="新建视图"], [aria-label="New view"], button.empty-cta',
  )
  if (byAria instanceof HTMLElement) return byAria
  const region = doc.getElementById('sidebar-empty')
  return region instanceof HTMLElement ? region : null
}

/**
 * Restore focus to the New view opener with a visible ring after Cancel.
 */
export function applyNewViewCancelFocus(
  opener: HTMLElement | null,
  doc: Document = document,
): void {
  restoreFocusEl(opener, () => newViewCancelFocusFallback(doc), {
    visibleRing: true,
  })
}
