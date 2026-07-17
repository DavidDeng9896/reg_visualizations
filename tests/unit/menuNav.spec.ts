import { describe, expect, it } from 'vitest'
import {
  enabledMenuIndices,
  nextMenuIndex,
  prevMenuIndex,
  resolveMenuKeyAction,
} from '@/shared/ui/menuNav'

describe('menuNav', () => {
  const items = [
    { disabled: false },
    { disabled: true },
    { disabled: false },
    { disabled: false },
  ]

  it('lists only enabled indices', () => {
    expect(enabledMenuIndices(items)).toEqual([0, 2, 3])
  })

  it('moves to next/prev enabled item with wrap', () => {
    expect(nextMenuIndex(items, 0)).toBe(2)
    expect(nextMenuIndex(items, 3)).toBe(0)
    expect(prevMenuIndex(items, 0)).toBe(3)
    expect(prevMenuIndex(items, 2)).toBe(0)
  })

  it('resolves arrow / home / end / escape / enter actions', () => {
    expect(resolveMenuKeyAction('ArrowDown')).toBe('next')
    expect(resolveMenuKeyAction('ArrowUp')).toBe('prev')
    expect(resolveMenuKeyAction('Home')).toBe('first')
    expect(resolveMenuKeyAction('End')).toBe('last')
    expect(resolveMenuKeyAction('Escape')).toBe('close')
    expect(resolveMenuKeyAction('Enter')).toBe('activate')
    expect(resolveMenuKeyAction(' ')).toBe('activate')
    expect(resolveMenuKeyAction('Tab')).toBe(null)
  })

  it('returns first/last enabled index helpers via wrap edges', () => {
    const enabled = enabledMenuIndices(items)
    expect(enabled[0]).toBe(0)
    expect(enabled[enabled.length - 1]).toBe(3)
    expect(nextMenuIndex(items, null)).toBe(0)
    expect(prevMenuIndex(items, null)).toBe(3)
  })
})
