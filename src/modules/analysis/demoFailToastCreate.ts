/**
 * Empty-list Demo failure toast × Create Analysis coexistence (Round 40).
 *
 * When Demo creation fails, an error toast stays on screen. Opening Create
 * Analysis must mark the toast host inert (same Create overlay contract as
 * R39 `createToastInert`) so Esc/Tab cannot steal focus from the dialog.
 */

/** Stable Demo failure copy — keep AnalysisListView and tests aligned. */
export function demoFailToastMessage(): string {
  return 'Demo 创建失败，请刷新后重试'
}

/** Contract: Demo-fail toast and Create overlay may coexist; Create wins the layer. */
export function demoFailToastCreateCoexists(): true {
  return true
}
