import { describe, expect, it } from 'vitest'
import {
  EMPTY_CTA_FOCUS_CLASS,
  emptyCtaFocusSelector,
  emptyCtaRestoreRingSelector,
} from '@/shared/ui/emptyCtaFocus'
import { FOCUS_RESTORE_RING_CLASS } from '@/shared/ui/focusRestore'

describe('emptyCtaFocus', () => {
  it('documents the shared empty-CTA focus ring class used across surfaces', () => {
    expect(EMPTY_CTA_FOCUS_CLASS).toBe('empty-cta')
    expect(emptyCtaFocusSelector()).toBe('.empty-cta:focus-visible')
  })

  it('documents programmatic restore ring on empty CTA (Round 39)', () => {
    expect(FOCUS_RESTORE_RING_CLASS).toBe('ia-restore-focus')
    expect(emptyCtaRestoreRingSelector()).toBe('.empty-cta.ia-restore-focus')
  })
})
