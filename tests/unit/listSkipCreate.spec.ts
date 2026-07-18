import { describe, expect, it } from 'vitest'
import {
  listSkipHiddenWhenCreateOpen,
  listSkipVisibleWhenCreateClosed,
} from '@/modules/analysis/listSkipCreate'

describe('list skip-link × Create Teleport (Round 40)', () => {
  it('hides the list skip-link while Create Analysis Teleport owns the layer', () => {
    expect(listSkipHiddenWhenCreateOpen(true)).toBe(true)
    expect(listSkipHiddenWhenCreateOpen(false)).toBe(false)
  })

  it('shows the skip-link again after Create closes', () => {
    expect(listSkipVisibleWhenCreateClosed(false)).toBe(true)
    expect(listSkipVisibleWhenCreateClosed(true)).toBe(false)
  })
})
