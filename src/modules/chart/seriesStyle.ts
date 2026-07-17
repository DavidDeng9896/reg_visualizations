import type { ChartConfigure, ViewType } from '@/shared/types/analysis'

/** Title 刷新默认：数据集/视图名（docs/features/charts/common.md STYLE） */
export function defaultChartTitle(sourceName?: string | null): string {
  return (sourceName ?? '').trim()
}

export function paletteColors(name?: string): string[] {
  if (name === 'dark') return ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de', '#3ba272']
  if (name === 'alternate') return ['#fc8452', '#9a60b4', '#ea7ccc', '#5470c6', '#91cc75', '#fac858']
  return ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de', '#3ba272', '#fc8452', '#9a60b4']
}

/** 当前图种可用于 STYLE 逐系列取色的系列键 */
export function listSeriesKeys(
  viewType: ViewType,
  rows: Record<string, unknown>[],
  configure: ChartConfigure,
): string[] {
  if (viewType === 'table' || viewType === 'heatmap') return []

  if (viewType === 'pie') {
    const field = configure.categoriesField
    if (!field) return []
    return [...new Set(rows.map((r) => String(r[field] ?? '')))]
  }

  if (viewType === 'bar' || viewType === 'box' || viewType === 'line' || viewType === 'scatter') {
    const seriesField = configure.seriesField || configure.colorField
    if (!seriesField) return ['value']
    return [...new Set(rows.map((r) => String(r[seriesField] ?? '')))]
  }

  return []
}

export function resolveSeriesColor(
  seriesColors: Record<string, string> | undefined,
  key: string,
  colors: string[],
  index: number,
): string {
  return seriesColors?.[key] || colors[index % colors.length]
}

/** Opacity 作用于点/柱/扇区；热力图与纯表不适用（common.md） */
export function opacityAppliesTo(viewType: ViewType): boolean {
  return (
    viewType === 'bar' ||
    viewType === 'box' ||
    viewType === 'line' ||
    viewType === 'scatter' ||
    viewType === 'pie'
  )
}

export function opacityHint(viewType: ViewType): string {
  if (opacityAppliesTo(viewType)) {
    return '调整点/柱/扇区透明度；对当前图种生效。'
  }
  if (viewType === 'heatmap') {
    return 'Opacity 不适用于热力图（颜色由数值映射）。'
  }
  return '当前视图不适用 Opacity。'
}

/** Point Shape：Line 节点 / Scatter / Box 散点标记（common.md · 各专章） */
export function pointShapeAppliesTo(viewType: ViewType): boolean {
  return viewType === 'line' || viewType === 'scatter' || viewType === 'box'
}

export function pointShapeHint(viewType: ViewType): string {
  if (viewType === 'line') {
    return '控制折线数据点标记形状（节点）。'
  }
  if (viewType === 'scatter') {
    return '控制散点标记形状。'
  }
  if (viewType === 'box') {
    return '控制箱线图上叠加点的标记形状。'
  }
  if (viewType === 'bar') {
    return 'Point Shape 不适用于柱状图。'
  }
  if (viewType === 'pie') {
    return 'Point Shape 不适用于饼图。'
  }
  if (viewType === 'heatmap') {
    return 'Point Shape 不适用于热力图。'
  }
  return '当前视图不适用 Point Shape。'
}
