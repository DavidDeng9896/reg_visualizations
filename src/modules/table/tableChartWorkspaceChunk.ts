/**
 * TableChartWorkspace mount strategy (Round 32–36 assessment).
 *
 * Stays sync inside AnalysisWorkspaceView: it owns the toolbar, grid, chart
 * panel, and Transform dialog entry. Async-splitting it (or peeling toolbar
 * into its own chunk) would flash an empty main pane after Vxe warm (same
 * cold-shell risk as `workspaceViewChunk`). Transform dialog itself remains
 * `defineAsyncComponent`; Round 36 adds pipeline idle-warm on open.
 */

export const TABLE_CHART_WORKSPACE_SYNC = true as const

export type TableChartWorkspaceMountMode = 'sync' | 'async-chunk'

export function tableChartWorkspaceMountMode(): TableChartWorkspaceMountMode {
  return TABLE_CHART_WORKSPACE_SYNC ? 'sync' : 'async-chunk'
}
