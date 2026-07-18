import { describe, expect, it } from 'vitest'
import {
  clampListRowFocus,
  listRowRovingEnabled,
  listRowTabIndex,
  nextListRowFocus,
  resolveListRowKeyAction,
} from '@/modules/analysis/listRowNav'

describe('listRowNav (Round 41)', () => {
  it('enables roving tabindex for analysis list rows', () => {
    expect(listRowRovingEnabled()).toBe(true)
  })

  it('exposes only the focused row in the tab order', () => {
    expect(listRowTabIndex(0, null)).toBe(0)
    expect(listRowTabIndex(1, null)).toBe(-1)
    expect(listRowTabIndex(2, 2)).toBe(0)
    expect(listRowTabIndex(0, 2)).toBe(-1)
  })

  it('maps Arrow/Home/End/Enter/Delete for row navigation', () => {
    expect(resolveListRowKeyAction('ArrowDown')).toBe('next')
    expect(resolveListRowKeyAction('ArrowUp')).toBe('prev')
    expect(resolveListRowKeyAction('Home')).toBe('first')
    expect(resolveListRowKeyAction('End')).toBe('last')
    expect(resolveListRowKeyAction('Enter')).toBe('activate')
    expect(resolveListRowKeyAction(' ')).toBe('activate')
    expect(resolveListRowKeyAction('Delete')).toBe('delete')
    expect(resolveListRowKeyAction('Tab')).toBe(null)
  })

  it('clamps focus index within the visible row count', () => {
    expect(clampListRowFocus(null, 3)).toBe(0)
    expect(clampListRowFocus(5, 3)).toBe(2)
    expect(clampListRowFocus(1, 0)).toBe(null)
  })

  it('moves focus with next/prev/first/last without wrapping', () => {
    expect(nextListRowFocus('next', 0, 3)).toBe(1)
    expect(nextListRowFocus('next', 2, 3)).toBe(2)
    expect(nextListRowFocus('prev', 0, 3)).toBe(0)
    expect(nextListRowFocus('first', 2, 3)).toBe(0)
    expect(nextListRowFocus('last', 0, 3)).toBe(2)
    expect(nextListRowFocus('activate', 1, 3)).toBe(1)
    expect(nextListRowFocus('delete', 1, 3)).toBe(1)
  })
})
