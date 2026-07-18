import { describe, expect, it } from 'vitest'
import {
  clampListRowFocus,
  isListRowFocusTarget,
  shouldRefocusRowAfterFilter,
} from '@/modules/analysis/listRowNav'

describe('listFilterRowRefocus (Round 44)', () => {
  it('detects roving list-row focus targets for filter-driven DOM refocus', () => {
    const row = document.createElement('tr')
    row.setAttribute('data-ia-list-row', '1')
    const select = document.createElement('select')
    select.setAttribute('data-ia-list-filter', '')
    expect(isListRowFocusTarget(row)).toBe(true)
    expect(isListRowFocusTarget(select)).toBe(false)
    expect(isListRowFocusTarget(null)).toBe(false)
  })

  it('refocuses when focus is on a row and filter clamp moves the index', () => {
    // Was on last of 5; filter leaves 2 → clamp to 1 → DOM refocus
    expect(clampListRowFocus(4, 2)).toBe(1)
    expect(shouldRefocusRowAfterFilter(true, 4, 1)).toBe(true)
  })

  it('does not refocus when the filter select owns focus (empty ↔ rows)', () => {
    // Filter select changed the set; clamp may move, but select keeps focus
    expect(shouldRefocusRowAfterFilter(false, 4, 1)).toBe(false)
    expect(shouldRefocusRowAfterFilter(false, 0, null)).toBe(false)
  })

  it('does not refocus when rows → empty (nextIndex null) even if focus was on a row', () => {
    expect(clampListRowFocus(1, 0)).toBe(null)
    expect(shouldRefocusRowAfterFilter(true, 1, null)).toBe(false)
  })

  it('does not refocus when empty → rows if focus was not on a list row', () => {
    // Coming back from empty: clamp defaults to 0, but select owns focus
    expect(clampListRowFocus(null, 3)).toBe(0)
    expect(shouldRefocusRowAfterFilter(false, null, 0)).toBe(false)
  })
})
