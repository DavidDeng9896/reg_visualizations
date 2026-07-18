/**
 * AnalysisWorkspaceView chunk strategy (Round 32–36).
 *
 * Sync imports (sidebar + table/chart workspace) stay in the main workspace
 * entry — deferring them flashes an empty shell on cold open. Flowchart /
 * CSV / Combine remain `defineAsyncComponent`. TableChartWorkspace itself is
 * documented as sync in `tableChartWorkspaceChunk` (owns toolbar/grid/chart).
 *
 * Round 36 re-eval (toolbar vs table/chart split): still deferred. Splitting
 * the toolbar into a separate async chunk would require a shared store
 * boundary for chart/view actions already owned by TableChartWorkspace, and
 * would risk a cold toolbar flash after Vxe warm. Prefer Transform
 * `schedulePipelineWarm` and CSV/Combine Teleport for this round.
 */
export const WORKSPACE_VIEW_SPLIT_DEFERRED = true as const

export function workspaceViewSplitDeferred(): boolean {
  return WORKSPACE_VIEW_SPLIT_DEFERRED
}
