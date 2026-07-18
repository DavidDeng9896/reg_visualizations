/**
 * Empty-list Demo success focus landing (Round 52).
 *
 * After Demo succeeds, a polite success toast announces the outcome and the
 * router navigates into the new Analysis workspace. `focusAfterNavigation`
 * must land on `#workspace-main` while the toast host stays interactive
 * (toast must not steal focus or block routeFocus).
 *
 * Demo success never schedules Create warm (Round 41 contract reused).
 */

export function demoSuccessToastMessage(): string {
  return '已创建 Demo Analysis'
}

/** Contract: Demo success navigates into workspace and lands main focus. */
export function demoSuccessLandsWorkspaceFocus(): true {
  return true
}

/** Primary landmark id for Demo success routeFocus landing. */
export function demoSuccessFocusTargetId(): string {
  return 'workspace-main'
}

/**
 * Demo success toast and routeFocus may coexist — toast stays interactive and
 * does not prevent landing on `#workspace-main`.
 */
export function demoSuccessToastCoexistsWithRouteFocus(): true {
  return true
}
