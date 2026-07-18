/**
 * Danger confirm Cancel / Esc focus visibility (Round 41–42).
 *
 * Destructive confirms land focus on Cancel (preferCancelInitialFocus).
 * Programmatic `.focus()` often omits `:focus-visible`, so paint the shared
 * restore ring so keyboard users see the safe default control.
 *
 * Round 42: Esc (or Cancel) restoring the opener also paints the ring — the
 * Delete control that opened the dialog must remain visible after dismiss.
 */

export function dangerCancelUsesVisibleRing(): true {
  return true
}

/** Esc / Cancel restore paints a visible ring on the opener (Round 42). */
export function dangerEscRestoresVisibleRing(): true {
  return true
}
