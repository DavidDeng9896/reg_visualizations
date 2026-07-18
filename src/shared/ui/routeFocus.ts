/**
 * Move focus to the primary landmark after client-side route changes (Round 25–26).
 * Prefer workspace main, then any main, then page h1.
 * Cooperates with skip-links: never steal focus already on/inside the target,
 * or while a skip-link still holds focus (hash jump in progress).
 * Also respects empty-state skip targets (Round 30).
 *
 * Round 46: when skip has landed on `#analysis-list-main` itself, leave focus
 * alone — do not treat row/button children as protected (Round 31 contract).
 */

/** Landmarks that skip-links / empty CTAs may legitimately hold after a hash jump. */
export const ROUTE_FOCUS_EMPTY_IDS = [
  'ws-empty',
  'flow-empty',
  'sidebar-empty',
  'analysis-list',
] as const

/** List table/skeleton landmark id — protect only the element itself after skip. */
const LIST_MAIN_SKIP_LANDMARK_ID = 'analysis-list-main'

export function resolveRouteFocusTarget(root: ParentNode = document): HTMLElement | null {
  return (
    root.querySelector<HTMLElement>('#workspace-main') ||
    root.querySelector<HTMLElement>('main[tabindex], main') ||
    root.querySelector<HTMLElement>('h1[tabindex], h1') ||
    null
  )
}

function isInsideEmptySkipTarget(el: HTMLElement, doc: Document): boolean {
  for (const id of ROUTE_FOCUS_EMPTY_IDS) {
    const region = doc.getElementById(id)
    if (region && (el === region || region.contains(el))) return true
  }
  return false
}

/** True when focus is on `#analysis-list-main` itself (not a descendant control). */
function isListMainSkipLandmarkFocused(el: HTMLElement, doc: Document): boolean {
  const main = doc.getElementById(LIST_MAIN_SKIP_LANDMARK_ID)
  return !!main && el === main
}

/** True when routeFocus should leave the current focus alone. */
export function shouldSkipRouteFocus(doc: Document = document): boolean {
  const active = doc.activeElement
  if (!(active instanceof HTMLElement) || active === doc.body) return false
  if (active.classList.contains('skip-link') || active.getAttribute('data-ia-skip') === '1') {
    return true
  }
  if (isInsideEmptySkipTarget(active, doc)) return true
  // Round 46: skip landed on list-main landmark itself — keep it.
  if (isListMainSkipLandmarkFocused(active, doc)) return true
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
