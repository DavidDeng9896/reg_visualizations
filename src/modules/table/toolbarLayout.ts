/** Toolbar responsive helpers — fold secondary actions on narrow viewports. */

/** At or below this CSS px width, toolbar enters compact mode. */
export const TOOLBAR_COMPACT_MAX_WIDTH = 720

/** Default / compact widths for the view-type native select. */
export const TOOLBAR_VIEW_TYPE_WIDTH = 150
export const TOOLBAR_VIEW_TYPE_WIDTH_COMPACT = 112

export function isToolbarCompact(viewportWidth: number): boolean {
  return viewportWidth <= TOOLBAR_COMPACT_MAX_WIDTH
}

export function toolbarViewTypeSelectWidth(compact: boolean): number {
  return compact ? TOOLBAR_VIEW_TYPE_WIDTH_COMPACT : TOOLBAR_VIEW_TYPE_WIDTH
}
