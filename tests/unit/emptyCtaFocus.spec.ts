import { describe, expect, it } from 'vitest'
import { EMPTY_CTA_FOCUS_CLASS, emptyCtaFocusSelector } from '@/shared/ui/emptyCtaFocus'

describe('emptyCtaFocus', () => {
  it('documents the shared empty-CTA focus ring class used across surfaces', () => {
    expect(EMPTY_CTA_FOCUS_CLASS).toBe('empty-cta')
    expect(emptyCtaFocusSelector()).toBe('.empty-cta:focus-visible')
  })
})
