import { describe, expect, it } from 'vitest'
import {
  clampTreeFocusIndex,
  formatSearchClearedStatus,
  nextTreeIndex,
  prevTreeIndex,
  resolveSearchKeyAction,
  resolveTreeKeyAction,
  treeItemTabIndex,
} from '@/modules/sidebar/treeNav'

describe('treeNav', () => {
  it('resolves arrow / home / end / enter / space actions', () => {
    expect(resolveTreeKeyAction('ArrowDown')).toBe('next')
    expect(resolveTreeKeyAction('ArrowUp')).toBe('prev')
    expect(resolveTreeKeyAction('ArrowUp', 2)).toBe('prev')
    expect(resolveTreeKeyAction('ArrowUp', 0)).toBe('leave-to-search')
    expect(resolveTreeKeyAction('Home')).toBe('first')
    expect(resolveTreeKeyAction('End')).toBe('last')
    expect(resolveTreeKeyAction('Enter')).toBe('activate')
    expect(resolveTreeKeyAction(' ')).toBe('activate')
    expect(resolveTreeKeyAction('ArrowRight')).toBe('ops')
    expect(resolveTreeKeyAction('ArrowLeft')).toBe('leave-ops')
    expect(resolveTreeKeyAction('Escape')).toBe(null)
    expect(resolveTreeKeyAction('Tab')).toBe(null)
  })

  it('resolves search Escape clear and ArrowDown enter-tree', () => {
    expect(resolveSearchKeyAction('Escape', true)).toBe('clear')
    expect(resolveSearchKeyAction('Escape', false)).toBe(null)
    expect(resolveSearchKeyAction('ArrowDown', false)).toBe('enter-tree')
    expect(resolveSearchKeyAction('ArrowDown', true)).toBe('enter-tree')
    expect(resolveSearchKeyAction('ArrowUp', true)).toBe(null)
    expect(resolveSearchKeyAction('Enter', true)).toBe(null)
  })

  it('announces visible node count after search clear', () => {
    expect(formatSearchClearedStatus(0)).toBe('已清空搜索，无可见节点')
    expect(formatSearchClearedStatus(1)).toBe('已清空搜索，显示 1 个节点')
    expect(formatSearchClearedStatus(12)).toBe('已清空搜索，显示 12 个节点')
  })

  it('moves focus with wrap within bounds', () => {
    expect(nextTreeIndex(4, 0)).toBe(1)
    expect(nextTreeIndex(4, 3)).toBe(0)
    expect(prevTreeIndex(4, 0)).toBe(3)
    expect(prevTreeIndex(4, 2)).toBe(1)
  })

  it('returns null indices when the tree is empty', () => {
    expect(nextTreeIndex(0, 0)).toBe(null)
    expect(prevTreeIndex(0, 0)).toBe(null)
  })

  it('clamps focus when the visible list shrinks', () => {
    expect(clampTreeFocusIndex(5, 2)).toBe(2)
    expect(clampTreeFocusIndex(3, 9)).toBe(2)
    expect(clampTreeFocusIndex(0, 0)).toBe(null)
    expect(clampTreeFocusIndex(2, null)).toBe(0)
  })

  it('uses roving tabindex: only the focused item is tabbable', () => {
    expect(treeItemTabIndex(1, 1)).toBe(0)
    expect(treeItemTabIndex(0, 1)).toBe(-1)
    expect(treeItemTabIndex(0, null)).toBe(0)
  })
})
