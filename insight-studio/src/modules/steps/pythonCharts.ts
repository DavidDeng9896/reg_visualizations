/** Custom Code Plotly Figure 产物的稳定 id（重跑不换）。 */
import type { Analysis, StepNode } from '../../shared/types'

export function pythonChartId(stepId: string, outputName: string): string {
  return `${String(stepId)}::${String(outputName)}`
}

export function pythonChartNodeId(chartId: string): string {
  return `pychart:${chartId}`
}

export function chartIdFromPythonChartNode(nodeId: string): string | null {
  return nodeId.startsWith('pychart:') ? nodeId.slice('pychart:'.length) : null
}

/** 去掉 Figure 产物及其流程图布局键。 */
export function removeChartsAndLayout(analysis: Analysis, chartIds: string[]): void {
  if (!chartIds.length) return
  const drop = new Set(chartIds)
  if (analysis.charts?.length) analysis.charts = analysis.charts.filter((c) => !drop.has(c.id))
  for (const id of drop) delete analysis.flowchartLayout[pythonChartNodeId(id)]
}

/** 删除步骤时带走表 / 文件 / Python 图 / 布局（不含步骤数组本身）。 */
export function removeStepOwnedArtifacts(analysis: Analysis, step: StepNode): void {
  const tableIds = new Set(step.output.tables)
  const fileIds = new Set(step.output.files ?? [])
  const chartIds = [
    ...(step.output.charts ?? []),
    ...((analysis.charts ?? []).filter((c) => c.stepId === step.id).map((c) => c.id)),
  ]
  analysis.tables = analysis.tables.filter((t) => !tableIds.has(t.id) && t.stepId !== step.id)
  if (analysis.files?.length) analysis.files = analysis.files.filter((f) => !fileIds.has(f.id))
  removeChartsAndLayout(analysis, chartIds)
  delete analysis.flowchartLayout[`step:${step.id}`]
}
