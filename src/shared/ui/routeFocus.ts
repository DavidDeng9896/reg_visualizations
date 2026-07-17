/**
 * Move focus to the primary landmark after client-side route changes (Round 25).
 * Prefer workspace main, then any main, then page h1.
 */

export function resolveRouteFocusTarget(root: ParentNode = document): HTMLElement | null {
  return (
    root.querySelector<HTMLElement>('#workspace-main') ||
    root.querySelector<HTMLElement>('main[tabindex], main') ||
    root.querySelector<HTMLElement>('h1[tabindex], h1') ||
    null
  )
}

export function focusAfterNavigation(doc: Document = document): HTMLElement | null {
  const target = resolveRouteFocusTarget(doc)
  if (!target) return null
  if (!target.hasAttribute('tabindex')) target.tabIndex = -1
  target.focus({ preventScroll: true })
  return target
}
