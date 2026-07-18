/**
 * Danger confirm Cancel initial focus visibility (Round 41).
 *
 * Destructive confirms land focus on Cancel (preferCancelInitialFocus).
 * Programmatic `.focus()` often omits `:focus-visible`, so paint the shared
 * restore ring so keyboard users see the safe default control.
 */

export function dangerCancelUsesVisibleRing(): true {
  return true
}
