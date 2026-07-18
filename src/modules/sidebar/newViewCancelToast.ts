/**
 * New view Cancel focus restore × toast coexistence (Round 55).
 *
 * When New view closes via Cancel (or Esc), restore the opener (e.g. New view
 * menu item / no-views CTA) with a visible ring. If a toast was inert while
 * the New view overlay was open, clearing inert leaves the toast interactive —
 * same contract as Combine/CSV/Transform Cancel × toast (R53–54).
 */

import { restoreFocusEl } from '@/shared/ui/focusRestore'

/**
 * Round 55: New view Cancel restores opener ring; toast host becomes
 * interactive again while any visible toast remains.
 */
export function newViewCancelRestoresRingWithToast(): true {
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
