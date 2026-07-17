export type TreeKeyAction =
  | 'next'
  | 'prev'
  | 'first'
  | 'last'
  | 'activate'
  | 'ops'
  | 'leave-ops'
  | 'leave-to-search'

export type SearchKeyAction = 'clear' | 'enter-tree'

/**
 * @param focusIndex Current roving index in the visible tree.
 *   When `0`, ArrowUp leaves the tree back to the search box (no wrap).
 *   Pass `-1` (default) to ignore index and always treat ArrowUp as `prev`.
 */
export function resolveTreeKeyAction(key: string, focusIndex = -1): TreeKeyAction | null {
  switch (key) {
    case 'ArrowDown':
      return 'next'
    case 'ArrowUp':
      return focusIndex === 0 ? 'leave-to-search' : 'prev'
    case 'Home':
      return 'first'
    case 'End':
      return 'last'
    case 'Enter':
    case ' ':
      return 'activate'
    case 'ArrowRight':
      return 'ops'
    case 'ArrowLeft':
      return 'leave-ops'
    default:
      return null
  }
}

/** Sidebar search box: Escape clears; ArrowDown moves focus into the tree. */
export function resolveSearchKeyAction(key: string, hasQuery: boolean): SearchKeyAction | null {
  if (key === 'Escape' && hasQuery) return 'clear'
  if (key === 'ArrowDown') return 'enter-tree'
  return null
}

/** Live-region copy after Escape clears the search query. */
export function formatSearchClearedStatus(visibleCount: number): string {
  if (visibleCount <= 0) return '已清空搜索，无可见节点'
  return `已清空搜索，显示 ${visibleCount} 个节点`
}

export function nextTreeIndex(count: number, current: number): number | null {
  if (count <= 0) return null
  return (current + 1) % count
}

export function prevTreeIndex(count: number, current: number): number | null {
  if (count <= 0) return null
  return (current - 1 + count) % count
}

/** Keep focus index valid when the visible node list changes (e.g. search filter). */
export function clampTreeFocusIndex(count: number, current: number | null): number | null {
  if (count <= 0) return null
  if (current === null || current < 0) return 0
  if (current >= count) return count - 1
  return current
}

/** Roving tabindex: only the focused item is in the tab order; default to first when unset. */
export function treeItemTabIndex(index: number, focusIndex: number | null): 0 | -1 {
  if (focusIndex === null) return index === 0 ? 0 : -1
  return index === focusIndex ? 0 : -1
}
