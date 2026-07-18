/**
 * ChartEditDrawer code-split evaluation (Round 34).
 *
 * Candidates considered:
 * - `fitEngine`: already consumed by chart runtime / ChartPanel path, not by
 *   ChartEditDrawer. Drawer only exposes fit model + constraint fields; no
 *   further EditDrawer→fitEngine edge to split.
 * - Series color palette (`paletteColors` in seriesStyle): tiny sync helpers
 *   shared with runtime color resolution. Async-chunking would add a boundary
 *   for ~a few dozen bytes of constants — not worth a separate network hop.
 *
 * ChartEditDrawer remains a single async SFC at the workspace boundary
 * (`defineAsyncComponent` in TableChartWorkspace). STYLE stays sync-vif
 * (see stylePanelChunk). Keep this deferral until a draft-binding or
 * palette/runtime split is designed.
 */

export const EDIT_DRAWER_FIT_ENGINE_SPLIT_DEFERRED = true as const
export const EDIT_DRAWER_PALETTE_SPLIT_DEFERRED = true as const

export type EditDrawerChunkDecision = 'deferred-sync' | 'async-chunk'

export function editDrawerFitEngineSplitMode(): EditDrawerChunkDecision {
  return EDIT_DRAWER_FIT_ENGINE_SPLIT_DEFERRED ? 'deferred-sync' : 'async-chunk'
}

export function editDrawerPaletteSplitMode(): EditDrawerChunkDecision {
  return EDIT_DRAWER_PALETTE_SPLIT_DEFERRED ? 'deferred-sync' : 'async-chunk'
}
