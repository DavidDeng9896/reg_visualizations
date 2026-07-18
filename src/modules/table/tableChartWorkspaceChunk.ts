/**
 * TableChartWorkspace mount strategy (Round 32–42 assessment).
 *
 * Stays sync inside AnalysisWorkspaceView: it owns the toolbar, grid, chart
 * panel, and Transform dialog entry. Async-splitting it (or peeling toolbar
 * into its own chunk) would flash an empty main pane after Vxe warm (same
 * cold-shell risk as `workspaceViewChunk`). Transform dialog itself remains
 * `defineAsyncComponent`; Round 36 adds pipeline idle-warm on open.
 *
 * Round 42: toolbar chunk still deferred — no clean async boundary without
 * cold-shell flash; keep sync with table/chart.
 */

export const TABLE_CHART_WORKSPACE_SYNC = true as const

export type TableChartWorkspaceMountMode = 'sync' | 'async-chunk'

export type TableChartWorkspaceChunkStrategy = {
  mount: 'sync'
  toolbar: 'sync-with-grid-chart'
  round42Reeval: 'keep-sync'
}

export function tableChartWorkspaceMountMode(): TableChartWorkspaceMountMode {
  return TABLE_CHART_WORKSPACE_SYNC ? 'sync' : 'async-chunk'
}

export function tableChartWorkspaceChunkStrategy(): TableChartWorkspaceChunkStrategy {
  return {
    mount: 'sync',
    toolbar: 'sync-with-grid-chart',
    round42Reeval: 'keep-sync',
  }
}
