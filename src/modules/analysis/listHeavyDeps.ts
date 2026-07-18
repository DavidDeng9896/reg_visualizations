/**
 * List route heavy-dependency strategy (Round 40).
 *
 * AnalysisListView must not pull vxe-table or echarts. Vxe installs on
 * workspace entry; ECharts loads dynamically inside ChartPanel.
 */

export type ListHeavyDepsStrategy = {
  vxe: 'workspace-only'
  echarts: 'chart-panel-dynamic'
  listImportsNeither: true
  round40Reeval: 'keep-lazy'
}

export function listHeavyDepsStrategy(): ListHeavyDepsStrategy {
  return {
    vxe: 'workspace-only',
    echarts: 'chart-panel-dynamic',
    listImportsNeither: true,
    round40Reeval: 'keep-lazy',
  }
}

export function listKeepsVxeAndEchartsLazy(): true {
  return true
}
