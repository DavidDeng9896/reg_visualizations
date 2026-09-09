import type { Artifact } from './types'

/** 图表/表产物 → 工作区路径；不完整返回 null。 */
export function analysisPathForArtifact(a: Artifact): string | null {
  if (!a.analysisId) return null
  if (a.kind === 'view' && a.viewId) {
    if (a.viewType && a.viewType !== 'table') {
      const q = a.tableId ? `?tableId=${a.tableId}&viewId=${a.viewId}` : `?viewId=${a.viewId}`
      return `/analysis/${a.analysisId}${q}`
    }
    // table 视图也允许打开工作区
    if (a.viewType === 'table') {
      const q = a.tableId ? `?tableId=${a.tableId}&viewId=${a.viewId}` : `?viewId=${a.viewId}`
      return `/analysis/${a.analysisId}${q}`
    }
  }
  if (a.kind === 'table' && a.tableId) {
    return `/analysis/${a.analysisId}?tableId=${a.tableId}`
  }
  return null
}

/** 取最近一个可打开的图表产物。 */
export function latestOpenableChartArtifact(artifacts: Artifact[] | undefined): Artifact | null {
  if (!artifacts?.length) return null
  for (let i = artifacts.length - 1; i >= 0; i -= 1) {
    const a = artifacts[i]!
    if (a.kind === 'view' && a.viewType && a.viewType !== 'table' && analysisPathForArtifact(a)) return a
  }
  return null
}

/** P0-4：优先最近成功图表，否则最近表产物。 */
export function latestOpenableWorkspaceArtifact(artifacts: Artifact[] | undefined): Artifact | null {
  const chart = latestOpenableChartArtifact(artifacts)
  if (chart) return chart
  if (!artifacts?.length) return null
  for (let i = artifacts.length - 1; i >= 0; i -= 1) {
    const a = artifacts[i]!
    if (analysisPathForArtifact(a)) return a
  }
  return null
}
