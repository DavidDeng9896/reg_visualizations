/**
 * AnalysisWorkspaceView chunk strategy (Round 32 re-eval with TableChartWorkspace).
 *
 * Sync imports (sidebar + table/chart workspace) stay in the main workspace
 * entry — deferring them flashes an empty shell on cold open. Flowchart /
 * CSV / Combine remain `defineAsyncComponent`. TableChartWorkspace itself is
 * documented as sync in `tableChartWorkspaceChunk` (owns toolbar/grid/chart).
 * Further JS splits need a shared store boundary change (same class of
 * constraint as `projectsChunk`).
 */
export const WORKSPACE_VIEW_SPLIT_DEFERRED = true as const

export function workspaceViewSplitDeferred(): boolean {
  return WORKSPACE_VIEW_SPLIT_DEFERRED
}
