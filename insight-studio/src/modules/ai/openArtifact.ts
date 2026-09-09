import type { Artifact } from './types'

/** 图表产物 → 工作区路径；不完整/非图返回 null。 */
export function analysisPathForArtifact(a: Artifact): string | null {
  if (a.kind !== 'view' || !a.analysisId || !a.viewId) return null
  if (!a.viewType || a.viewType === 'table') return null
  const q = a.tableId ? `?tableId=${a.tableId}&viewId=${a.viewId}` : `?viewId=${a.viewId}`
  return `/analysis/${a.analysisId}${q}`
}

/** 取最近一个可打开的图表产物。 */
export function latestOpenableChartArtifact(artifacts: Artifact[] | undefined): Artifact | null {
  if (!artifacts?.length) return null
  for (let i = artifacts.length - 1; i >= 0; i -= 1) {
    const a = artifacts[i]!
    if (analysisPathForArtifact(a)) return a
  }
  return null
}
