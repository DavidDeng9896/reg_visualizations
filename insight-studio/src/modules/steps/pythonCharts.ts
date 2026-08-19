/** Custom Code Plotly Figure 产物的稳定 id（重跑不换）。 */

export function pythonChartId(stepId: string, outputName: string): string {
  return `${String(stepId)}::${String(outputName)}`
}

export function pythonChartNodeId(chartId: string): string {
  return `pychart:${chartId}`
}

export function chartIdFromPythonChartNode(nodeId: string): string | null {
  return nodeId.startsWith('pychart:') ? nodeId.slice('pychart:'.length) : null
}
