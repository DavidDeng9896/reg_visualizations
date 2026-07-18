/**
 * List skip-link × Create Analysis Teleport (Round 40).
 *
 * When Create is open (Teleport to body), hide the in-page skip-link so Tab
 * cannot land on a landmark behind the modal — mirrors workspace
 * `skipLinkHiddenBehindOverlay`.
 */

export function listSkipHiddenWhenCreateOpen(createOpen: boolean): boolean {
  return Boolean(createOpen)
}

/** Inverse helper for “Create closed → skip visible” assertions. */
export function listSkipVisibleWhenCreateClosed(createOpen: boolean): boolean {
  return !listSkipHiddenWhenCreateOpen(createOpen)
}
