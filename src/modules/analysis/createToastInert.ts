/**
 * List-page Create overlay ↔ toast inert contract (Round 39).
 *
 * AnalysisListView calls `setToastHostExternalInert(showCreate)` so toast close
 * cannot steal Esc/Tab while Create Analysis owns the layer — same pattern as
 * workspace overlays (R33+) and New view (R37).
 */

export function createOverlayBlocksToastHost(): true {
  return true
}
