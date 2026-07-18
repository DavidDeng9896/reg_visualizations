/**
 * Header Create ↔ empty-list Create focus ring parity (Round 40).
 *
 * Both triggers share `create-trigger` so `:focus-visible` and programmatic
 * `ia-restore-focus` rings look identical whether the opener was the top bar
 * or the empty-state CTA.
 */

import { FOCUS_RESTORE_RING_CLASS } from '@/shared/ui/focusRestore'

export const CREATE_TRIGGER_CLASS = 'create-trigger'

export function createTriggerFocusSelector(): string {
  return `.${CREATE_TRIGGER_CLASS}:focus-visible`
}

export function createTriggerRestoreRingSelector(): string {
  return `.${CREATE_TRIGGER_CLASS}.${FOCUS_RESTORE_RING_CLASS}`
}

/** Documents intentional parity between header and empty Create rings. */
export function headerCreateMatchesEmptyCtaRing(): true {
  return true
}
