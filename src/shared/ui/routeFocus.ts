/**
 * Move focus to the primary landmark after client-side route changes (Round 25–26).
 * Prefer workspace main, then any main, then page h1.
 * Cooperates with skip-links: never steal focus already on/inside the target,
 * or while a skip-link still holds focus (hash jump in progress).
 */

export function resolveRouteFocusTarget(root: ParentNode = document): HTMLElement | null {
  return (
    root.querySelector<HTMLElement>('#workspace-main') ||
    root.querySelector<HTMLElement>('main[tabindex], main') ||
    root.querySelector<HTMLElement>('h1[tabindex], h1') ||
    null
  )
}

/** True when routeFocus should leave the current focus alone. */
export function shouldSkipRouteFocus(doc: Document = document): boolean {
  const active = doc.activeElement
  if (!(active instanceof HTMLElement) || active === doc.body) return false
  if (active.classList.contains('skip-link') || active.getAttribute('data-ia-skip') === '1') {
    return true
  }
  const target = resolveRouteFocusTarget(doc)
  if (target && (active === target || target.contains(active))) return true
  return false
}

export function focusAfterNavigation(doc: Document = document): HTMLElement | null {
  if (shouldSkipRouteFocus(doc)) return null
  const target = resolveRouteFocusTarget(doc)
  if (!target) return null
  if (!target.hasAttribute('tabindex')) target.tabIndex = -1
  target.focus({ preventScroll: true })
  return target
}
