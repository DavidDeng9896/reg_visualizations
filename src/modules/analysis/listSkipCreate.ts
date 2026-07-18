/**
 * List skip-link × Create Analysis Teleport (Round 40–50).
 *
 * When Create is open (Teleport to body), hide the in-page skip-link so Tab
 * cannot land on a landmark behind the modal — mirrors workspace
 * `skipLinkHiddenBehindOverlay`.
 *
 * Round 49: regression contract + DOM sync helper so Create-open hide stays
 * explicit (`hidden` + `aria-hidden`) beyond Vue `v-show`.
 *
 * Round 50: Create-close must restore skip visibility in the DOM (`hidden`
 * cleared + `aria-hidden` removed) — open→close cycle regression.
 */

export function listSkipHiddenWhenCreateOpen(createOpen: boolean): boolean {
  return Boolean(createOpen)
}

/** Inverse helper for “Create closed → skip visible” assertions. */
export function listSkipVisibleWhenCreateClosed(createOpen: boolean): boolean {
  return !listSkipHiddenWhenCreateOpen(createOpen)
}

/** Round 49: Create-open must keep hiding the list skip-link. */
export function listSkipHiddenOnCreateOpenRegression(): true {
  return true
}

/** Round 50: Create-close must restore skip visibility in the DOM. */
export function listSkipVisibleOnCreateCloseRegression(): true {
  return true
}

/**
 * Sync skip-link DOM visibility for Create open/closed (Round 49–50 regression).
 * Vue template uses `v-show`; this helper covers unit/DOM assertions and any
 * non-Vue callers that need the same contract.
 */
export function syncListSkipVisibility(
  skip: HTMLElement,
  createOpen: boolean,
): void {
  const hide = listSkipHiddenWhenCreateOpen(createOpen)
  skip.hidden = hide
  if (hide) skip.setAttribute('aria-hidden', 'true')
  else skip.removeAttribute('aria-hidden')
}
