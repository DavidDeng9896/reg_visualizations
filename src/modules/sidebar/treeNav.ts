export type TreeKeyAction =
  | 'next'
  | 'prev'
  | 'first'
  | 'last'
  | 'activate'
  | 'ops'
  | 'leave-ops'

export function resolveTreeKeyAction(key: string): TreeKeyAction | null {
  switch (key) {
    case 'ArrowDown':
      return 'next'
    case 'ArrowUp':
      return 'prev'
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
