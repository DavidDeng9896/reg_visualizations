import type { ChartPosition } from '../../shared/types'

/** 分栏存储键：仅随分析/视图变化，切换图表位置不得换 key，以免卸载 ChartView。 */
export function chartSplitStorageKey(analysisId: string, viewId: string): string {
  return `chart-split:${analysisId}:${viewId}`
}

export function chartSplitDirection(position: ChartPosition): 'horizontal' | 'vertical' {
  return position === 'left' || position === 'right' ? 'horizontal' : 'vertical'
}

/** 图在下/右时反转分栏，ChartView 始终留在 first 槽，避免换槽卸载。 */
export function chartSplitReverse(position: ChartPosition): boolean {
  return position === 'bottom' || position === 'right'
}
