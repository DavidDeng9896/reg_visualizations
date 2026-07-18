import { describe, expect, it } from 'vitest'
import {
  clampListRowFocus,
  listFilterClampsRoving,
  shouldRefocusRowAfterFilter,
} from '@/modules/analysis/listRowNav'

describe('listFilterRovingClamp (Round 43)', () => {
  it('documents filter changes clamping the roving focus index', () => {
    expect(listFilterClampsRoving()).toBe(true)
  })

  it('clamps when the filtered list shrinks past the focused row', () => {
    // Was on last of 5; filter leaves 2 → land on last visible
    expect(clampListRowFocus(4, 2)).toBe(1)
    expect(clampListRowFocus(1, 2)).toBe(1)
    expect(clampListRowFocus(0, 0)).toBe(null)
  })

  it('refocuses the row only when keyboard focus was inside the list and the index changes', () => {
    expect(shouldRefocusRowAfterFilter(true, 4, 1)).toBe(true)
    expect(shouldRefocusRowAfterFilter(true, 1, 1)).toBe(false)
    expect(shouldRefocusRowAfterFilter(false, 4, 1)).toBe(false)
    expect(shouldRefocusRowAfterFilter(true, 2, null)).toBe(false)
  })
})
