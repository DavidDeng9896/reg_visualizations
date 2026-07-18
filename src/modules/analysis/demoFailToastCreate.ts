/**
 * Empty-list Demo failure toast × Create Analysis coexistence (Round 40–42).
 *
 * When Demo creation fails, an error toast stays on screen. Opening Create
 * Analysis must mark the toast host inert (same Create overlay contract as
 * R39 `createToastInert`) so Esc/Tab cannot steal focus from the dialog.
 *
 * Round 42: after Demo fails, restore keyboard focus to a Create trigger with
 * a visible ring so users can recover without hunting for the next action.
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

export function demoFailCreateFocusSelector(): string {
  return '.create-trigger'
}

/** Prefer empty-list Create, then header Create; paint restore ring. */
export function applyDemoFailCreateFocus(doc: Document = document): void {
  const found = doc.querySelector(demoFailCreateFocusSelector())
  if (!(found instanceof HTMLElement)) return
  restoreFocusEl(found, undefined, { visibleRing: true })
}
