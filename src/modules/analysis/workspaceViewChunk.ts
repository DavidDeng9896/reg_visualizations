/**
 * AnalysisWorkspaceView chunk strategy (Round 31 assessment).
 *
 * Sync imports (sidebar + table/chart workspace) stay in the main workspace
 * entry — deferring them flashes an empty shell on cold open. Flowchart /
 * CSV / Combine remain `defineAsyncComponent`. Further JS splits need a
 * shared store boundary change (same class of constraint as `projectsChunk`).
 */
export const WORKSPACE_VIEW_SPLIT_DEFERRED = true as const

export function workspaceViewSplitDeferred(): boolean {
  return WORKSPACE_VIEW_SPLIT_DEFERRED
}
