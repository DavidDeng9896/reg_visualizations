import { describe, expect, it } from 'vitest'
import {
  CREATE_TRIGGER_CLASS,
  createTriggerFocusSelector,
  createTriggerRestoreRingSelector,
  headerCreateMatchesEmptyCtaRing,
} from '@/modules/analysis/createTriggerFocus'
import { FOCUS_RESTORE_RING_CLASS } from '@/shared/ui/focusRestore'
import { EMPTY_CTA_FOCUS_CLASS } from '@/shared/ui/emptyCtaFocus'

describe('createTriggerFocus (Round 40)', () => {
  it('shares one create-trigger class between header Create and empty CTA', () => {
    expect(CREATE_TRIGGER_CLASS).toBe('create-trigger')
    expect(createTriggerFocusSelector()).toBe('.create-trigger:focus-visible')
    expect(createTriggerRestoreRingSelector()).toBe(
      `.${CREATE_TRIGGER_CLASS}.${FOCUS_RESTORE_RING_CLASS}`,
    )
  })

  it('documents header Create and empty CTA ring parity', () => {
    expect(headerCreateMatchesEmptyCtaRing()).toBe(true)
    // Empty CTA keeps empty-cta for SR/listEmpty aria; create-trigger is additive.
    expect(EMPTY_CTA_FOCUS_CLASS).toBe('empty-cta')
  })
})
