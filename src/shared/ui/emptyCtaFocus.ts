/** Shared empty-state CTA focus ring class (Round 30). Styles live in main.css. */

import { FOCUS_RESTORE_RING_CLASS } from '@/shared/ui/focusRestore'

export const EMPTY_CTA_FOCUS_CLASS = 'empty-cta'

export function emptyCtaFocusSelector(): string {
  return `.${EMPTY_CTA_FOCUS_CLASS}:focus-visible`
}

/**
 * After Create cancel restores focus onto an empty CTA, the temporary restore
 * ring class keeps the outline visible (Round 39 — programmatic focus).
 */
export function emptyCtaRestoreRingSelector(): string {
  return `.${EMPTY_CTA_FOCUS_CLASS}.${FOCUS_RESTORE_RING_CLASS}`
}
