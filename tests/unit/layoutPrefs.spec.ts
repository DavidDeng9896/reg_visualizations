import { describe, expect, it, beforeEach } from 'vitest'
import {
  isLayoutHintDismissed,
  dismissLayoutHint,
  clearLayoutHintDismissed,
} from '@/modules/table/layoutPrefs'

describe('layoutPrefs', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('defaults to not dismissed', () => {
    expect(isLayoutHintDismissed()).toBe(false)
  })

  it('persists dismiss and can clear', () => {
    dismissLayoutHint()
    expect(isLayoutHintDismissed()).toBe(true)
    clearLayoutHintDismissed()
    expect(isLayoutHintDismissed()).toBe(false)
  })
})
