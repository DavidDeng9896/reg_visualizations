/**
 * TableChartWorkspace mount strategy (Round 32 assessment).
 *
 * Stays sync inside AnalysisWorkspaceView: it owns the toolbar, grid, chart
 * panel, and Transform dialog entry. Async-splitting it would flash an empty
 * main pane after Vxe warm (same cold-shell risk as `workspaceViewChunk`).
 * Transform dialog itself remains `defineAsyncComponent`.
 */

export const TABLE_CHART_WORKSPACE_SYNC = true as const

export type TableChartWorkspaceMountMode = 'sync' | 'async-chunk'

export function tableChartWorkspaceMountMode(): TableChartWorkspaceMountMode {
  return TABLE_CHART_WORKSPACE_SYNC ? 'sync' : 'async-chunk'
}
