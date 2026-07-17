export type MenuItemState = { disabled?: boolean }

export type MenuKeyAction = 'next' | 'prev' | 'first' | 'last' | 'close' | 'activate'

export function enabledMenuIndices(items: readonly MenuItemState[]): number[] {
  return items.reduce<number[]>((acc, item, i) => {
    if (!item.disabled) acc.push(i)
    return acc
  }, [])
}

export function nextMenuIndex(items: readonly MenuItemState[], current: number | null): number | null {
  const enabled = enabledMenuIndices(items)
  if (!enabled.length) return null
  if (current === null) return enabled[0]
  const pos = enabled.indexOf(current)
  if (pos < 0) return enabled[0]
  return enabled[(pos + 1) % enabled.length]
}

export function prevMenuIndex(items: readonly MenuItemState[], current: number | null): number | null {
  const enabled = enabledMenuIndices(items)
  if (!enabled.length) return null
  if (current === null) return enabled[enabled.length - 1]
  const pos = enabled.indexOf(current)
  if (pos < 0) return enabled[enabled.length - 1]
  return enabled[(pos - 1 + enabled.length) % enabled.length]
}

export function resolveMenuKeyAction(key: string): MenuKeyAction | null {
  switch (key) {
    case 'ArrowDown':
      return 'next'
    case 'ArrowUp':
      return 'prev'
    case 'Home':
      return 'first'
    case 'End':
      return 'last'
    case 'Escape':
      return 'close'
    case 'Enter':
    case ' ':
      return 'activate'
    default:
      return null
  }
}

/** Apply keyboard navigation on a menu root; returns whether the event was handled. */
export function handleMenuKeydown(
  e: KeyboardEvent,
  items: readonly MenuItemState[],
  opts: {
    getActiveIndex: () => number | null
    setActiveIndex: (index: number | null) => void
    onActivate: (index: number) => void
    onClose: () => void
  },
): boolean {
  const action = resolveMenuKeyAction(e.key)
  if (!action) return false

  const enabled = enabledMenuIndices(items)
  if (!enabled.length && action !== 'close') return false

  e.preventDefault()
  e.stopPropagation()

  const current = opts.getActiveIndex()
  if (action === 'close') {
    opts.onClose()
    return true
  }
  if (action === 'next') {
    opts.setActiveIndex(nextMenuIndex(items, current))
    return true
  }
  if (action === 'prev') {
    opts.setActiveIndex(prevMenuIndex(items, current))
    return true
  }
  if (action === 'first') {
    opts.setActiveIndex(enabled[0] ?? null)
    return true
  }
  if (action === 'last') {
    opts.setActiveIndex(enabled[enabled.length - 1] ?? null)
    return true
  }
  if (action === 'activate') {
    const idx = current ?? enabled[0] ?? null
    if (idx !== null && !items[idx]?.disabled) opts.onActivate(idx)
    return true
  }
  return false
}
