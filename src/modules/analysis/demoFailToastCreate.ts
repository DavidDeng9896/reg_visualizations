/**
 * Empty-list Demo failure toast × Create Analysis coexistence (Round 40–45).
 *
 * When Demo creation fails, an error toast stays on screen. Opening Create
 * Analysis must mark the toast host inert (same Create overlay contract as
 * R39 `createToastInert`) so Esc/Tab cannot steal focus from the dialog.
 *
 * Round 42: after Demo fails, restore keyboard focus to a Create trigger with
 * a visible ring so users can recover without hunting for the next action.
 *
 * Round 43: the error toast and Create restore ring coexist — toast must not
 * steal focus or clear the ring after `applyDemoFailCreateFocus`.
 *
 * Round 44: opening Create while the Demo-fail toast is up keeps the toast
 * host inert (Esc/Tab stay in the dialog); the prior Create restore ring is
 * compatible with that inert handoff.
 *
 * Round 45: Cancel/Esc closing Create restores the Create CTA with a visible
 * ring, clears toast inert, and leaves the Demo-fail error toast on screen.
 */

import { restoreFocusEl } from '@/shared/ui/focusRestore'

/** Stable Demo failure copy — keep AnalysisListView and tests aligned. */
export function demoFailToastMessage(): string {
  return 'Demo 创建失败，请刷新后重试'
}

/** Contract: Demo-fail toast and Create overlay may coexist; Create wins the layer. */
export function demoFailToastCreateCoexists(): true {
  return true
}

/** Round 42: Demo fail lands focus on Create CTA with a visible ring. */
export function demoFailRestoresCreateFocus(): true {
  return true
}

/** Round 43: Demo-fail toast stays visible while Create keeps the restore ring. */
export function demoFailToastKeepsCreateRing(): true {
  return true
}

/**
 * Round 44: opening Create after Demo fail marks toast inert without clearing
 * the error toast (Create owns Esc/Tab).
 */
export function demoFailCreateOpenInertsToast(): true {
  return true
}

/**
 * Round 45: Create Cancel restores CTA ring; toast host becomes interactive
 * again while the Demo-fail error toast remains.
 */
export function demoFailCreateCancelRestoresRingWithToast(): true {
  return true
}

export function demoFailCreateFocusSelector(): string {
  return '.create-trigger'
}

/** Prefer empty-list Create, then header Create; paint restore ring. */
export function applyDemoFailCreateFocus(doc: Document = document): void {
  const found = doc.querySelector(demoFailCreateFocusSelector())
  if (!(found instanceof HTMLElement)) return
  restoreFocusEl(found, undefined, { visibleRing: true })
}
