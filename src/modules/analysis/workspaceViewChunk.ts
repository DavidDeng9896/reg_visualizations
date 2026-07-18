/**
 * AnalysisWorkspaceView chunk strategy (Round 32–51).
 *
 * Sync imports (sidebar + table/chart workspace) stay in the main workspace
 * entry — deferring them flashes an empty shell on cold open. Flowchart /
 * CSV / Combine remain `defineAsyncComponent`. TableChartWorkspace itself is
 * documented as sync in `tableChartWorkspaceChunk` (owns toolbar/grid/chart).
 *
 * Round 36–46 re-eval (toolbar vs table/chart split): still deferred. Splitting
 * the toolbar into a separate async chunk would require a shared store
 * boundary for chart/view actions already owned by TableChartWorkspace, and
 * would risk a cold toolbar flash after Vxe warm. Prefer Transform
 * `schedulePipelineWarm` and overlay Teleport for this cycle.
 *
 * Round 51: list Demo CTA / skip→Tab / empty CTA a11y pass does not unlock a
 * toolbar async split; keep sync-shell.
 */

export const WORKSPACE_VIEW_SPLIT_DEFERRED = true as const

export type WorkspaceViewChunkStrategy = {
  splitDeferred: true
  toolbar: 'sync-with-table-chart'
  round36Reeval: 'keep-sync-shell'
  round42Reeval: 'keep-sync-shell'
  round44Reeval: 'keep-sync-shell'
  round45Reeval: 'keep-sync-shell'
  round46Reeval: 'keep-sync-shell'
  round51Reeval: 'keep-sync-shell'
}

export function workspaceViewSplitDeferred(): boolean {
  return WORKSPACE_VIEW_SPLIT_DEFERRED
}

export function workspaceViewChunkStrategy(): WorkspaceViewChunkStrategy {
  return {
    splitDeferred: true,
    toolbar: 'sync-with-table-chart',
    round36Reeval: 'keep-sync-shell',
    round42Reeval: 'keep-sync-shell',
    round44Reeval: 'keep-sync-shell',
    round45Reeval: 'keep-sync-shell',
    round46Reeval: 'keep-sync-shell',
    round51Reeval: 'keep-sync-shell',
  }
}
