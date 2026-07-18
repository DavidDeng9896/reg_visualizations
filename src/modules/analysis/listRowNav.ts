/**
 * Analysis list table row keyboard navigation (Round 41–44).
 *
 * Rows previously all used tabindex=0 (many Tab stops). Roving tabindex keeps
 * a single tab stop in the list; Arrow/Home/End move focus; Enter/Space open.
 * Round 42: Delete triggers row remove without leaving the roving group.
 * Round 43: project filter changes clamp the roving index; only refocus the
 * row when keyboard focus was already inside the list and the index moved.
 * Round 44: `isListRowFocusTarget` for filter-driven DOM refocus spot-checks
 * (including empty ↔ has-rows transitions).
 */

export type ListRowKeyAction =
  | 'next'
  | 'prev'
  | 'first'
  | 'last'
  | 'activate'
  | 'delete'

export function listRowRovingEnabled(): true {
  return true
}

/** Round 42: Delete key coexists with roving (does not leave the row group). */
export function listRowDeleteKeyEnabled(): true {
  return true
}

/** Roving tabindex: only the focused row is in the tab order; default first. */
export function listRowTabIndex(index: number, focusIndex: number | null): 0 | -1 {
  if (focusIndex === null) return index === 0 ? 0 : -1
  return index === focusIndex ? 0 : -1
}

export function resolveListRowKeyAction(key: string): ListRowKeyAction | null {
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
    case 'Delete':
      return 'delete'
    default:
      return null
  }
}

/** Round 43: filter changes clamp (and may refocus) the roving index. */
export function listFilterClampsRoving(): true {
  return true
}

/** Clamp / default the roving focus index for `count` visible rows. */
export function clampListRowFocus(
  current: number | null,
  count: number,
): number | null {
  if (count <= 0) return null
  if (current === null || current < 0) return 0
  if (current >= count) return count - 1
  return current
}

/**
 * Round 44: true when `activeElement` is a roving list row (filter refocus gate).
 * Empty ↔ has-rows transitions use the same check — never steal from the select.
 */
export function isListRowFocusTarget(el: Element | null): boolean {
  return el instanceof HTMLElement && el.hasAttribute('data-ia-list-row')
}

/**
 * Round 50: true when `activeElement` is the project filter select.
 * Delete-success focus restore must not steal from the filter.
 */
export function isListFilterFocusTarget(el: Element | null): boolean {
  return el instanceof HTMLElement && el.hasAttribute('data-ia-list-filter')
}

/**
 * After a filter-driven clamp: move DOM focus only when the user was already
 * on a list row and the clamped index differs (avoid stealing focus from the
 * filter select itself).
 */
export function shouldRefocusRowAfterFilter(
  wasOnListRow: boolean,
  prevIndex: number | null,
  nextIndex: number | null,
): boolean {
  if (!wasOnListRow) return false
  if (nextIndex === null) return false
  return prevIndex !== nextIndex
}

/** Next focus index after a key action (null when list empty). */
export function nextListRowFocus(
  action: ListRowKeyAction,
  current: number | null,
  count: number,
): number | null {
  if (count <= 0 || action === 'activate' || action === 'delete') {
    return clampListRowFocus(current, count)
  }
  const base = clampListRowFocus(current, count)
  if (base === null) return null
  switch (action) {
    case 'next':
      return Math.min(base + 1, count - 1)
    case 'prev':
      return Math.max(base - 1, 0)
    case 'first':
      return 0
    case 'last':
      return count - 1
  }
}
