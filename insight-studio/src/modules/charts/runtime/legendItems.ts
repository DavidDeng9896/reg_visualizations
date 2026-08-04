import { LEGEND_COLLAPSE_WIDTH } from './shared'

export type LegendPos = 'top' | 'bottom' | 'left' | 'right'

export interface LegendItem {
  /** 对应 Plotly data 下标 */
  traceIndex: number
  name: string
  color: string
  visible: boolean
}

export function shouldCollapseLegend(containerWidth: number, threshold = LEGEND_COLLAPSE_WIDTH): boolean {
  return containerWidth > 0 && containerWidth < threshold
}

/** 从 Plotly figure 抽出可展示图例项（跳过 showlegend:false / 无名 trace）。 */
export function extractLegendItems(data: Array<Record<string, unknown>> | undefined): LegendItem[] {
  if (!data?.length) return []
  const items: LegendItem[] = []
  for (let i = 0; i < data.length; i += 1) {
    const t = data[i]
    if (!t || t.showlegend === false) continue
    const name = typeof t.name === 'string' ? t.name.trim() : ''
    if (!name) continue
    const visible = t.visible !== false && t.visible !== 'legendonly'
    items.push({
      traceIndex: i,
      name,
      color: pickTraceColor(t),
      visible,
    })
  }
  return items
}

function pickTraceColor(t: Record<string, unknown>): string {
  const marker = t.marker as Record<string, unknown> | undefined
  const line = t.line as Record<string, unknown> | undefined
  const candidates = [marker?.color, line?.color, t.color]
  for (const c of candidates) {
    if (typeof c === 'string' && c) return c
    if (Array.isArray(c) && typeof c[0] === 'string') return c[0]
  }
  return '#667085'
}

/** 从 layout.legend 推断配置位置（与 buildLegendLayout 产出对齐）。 */
export function legendPosFromLayout(layout: Record<string, unknown> | undefined): LegendPos {
  const leg = layout?.legend as Record<string, unknown> | undefined
  if (!leg) return 'top'
  if (leg.orientation === 'v') {
    const x = typeof leg.x === 'number' ? leg.x : 1
    return x >= 0.5 ? 'right' : 'left'
  }
  const y = typeof leg.y === 'number' ? leg.y : 1
  return y >= 0.5 ? 'top' : 'bottom'
}

/** 窄屏收起时：关掉内嵌图例，并收回为图例预留的过大边距。 */
export function layoutForCollapsedLegend(
  layout: Record<string, unknown>,
): Record<string, unknown> {
  const margin = { ...((layout.margin as Record<string, number> | undefined) ?? {}) }
  const pos = legendPosFromLayout(layout)
  // 收起后只留常规轴边距，避免窄屏被图例边距吃光
  if (pos === 'top' && (margin.t ?? 0) > 40) margin.t = 32
  if (pos === 'bottom' && (margin.b ?? 0) > 56) margin.b = 48
  if (pos === 'left' && (margin.l ?? 0) > 80) margin.l = 64
  if (pos === 'right' && (margin.r ?? 0) > 80) margin.r = 32
  return {
    ...layout,
    showlegend: false,
    margin,
  }
}
