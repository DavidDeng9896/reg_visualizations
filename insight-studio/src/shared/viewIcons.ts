import type { IconName } from '../ui'
import type { ViewType } from './types'

/** 与侧栏 / @ 提及对齐的视图类型图标。 */
export const VIEW_ICON: Record<ViewType, IconName> = {
  table: 'table',
  bar: 'bar',
  line: 'line',
  scatter: 'scatter',
  box: 'box',
  pie: 'pie',
  heatmap: 'heatmap',
  bignumber: 'bignumber',
}

export function iconForViewType(type: string | undefined): IconName {
  if (type && type in VIEW_ICON) return VIEW_ICON[type as ViewType]
  return 'table'
}
