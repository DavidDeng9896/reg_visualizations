/** Toolbar responsive helpers — fold secondary actions on narrow viewports. */

/** At or below this CSS px width, toolbar enters compact mode. */
export const TOOLBAR_COMPACT_MAX_WIDTH = 720

export function isToolbarCompact(viewportWidth: number): boolean {
  return viewportWidth <= TOOLBAR_COMPACT_MAX_WIDTH
}
