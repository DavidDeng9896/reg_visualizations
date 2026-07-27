/** 各图种共用的 Plotly layout 片段与数据工具。 */
import type { CellValue, ChartStyle, ColumnMeta, DataType, Row } from '../../../shared/types'
import { isBlank } from '../../../shared/pipeline'
import { paletteColor } from './palette'

/* ------------------------------- 数据工具 ------------------------------- */

export const BLANK_LABEL = '[Blank]'

/** 单元格显示值：空 → [Blank]。 */
export function displayVal(v: CellValue | undefined): string {
  return isBlank(v) ? BLANK_LABEL : String(v)
}

/** 列去重值（按首次出现顺序）。 */
export function distinctInOrder(rows: Row[], field: string): CellValue[] {
  const seen = new Set<string>()
  const out: CellValue[] = []
  for (const row of rows) {
    const v = row[field] ?? null
    const key = displayVal(v)
    if (!seen.has(key)) {
      seen.add(key)
      out.push(v)
    }
  }
  return out
}

export function columnType(columns: ColumnMeta[], field: string | undefined): DataType | undefined {
  return columns.find((c) => c.field === field)?.dataType
}

/* ------------------------------- layout 片段 ------------------------------- */

/**
 * Benchling 风格图表基底（简洁/干净/专业）：
 * 浅灰网格、无刻度突刺、灰色小标签、深灰粗体轴标题居中。
 */
export const AXIS_LABEL_STYLE = { color: '#667085', size: 11 }
export const AXIS_NAME_STYLE = { color: '#475467', size: 12, weight: 600 }
export const AXIS_STYLE: Record<string, unknown> = {
  tickfont: AXIS_LABEL_STYLE,
  linecolor: '#d9dee5',
  gridcolor: '#e9edf2',
  zeroline: false,
  showline: true,
  showticklabels: true,
  ticks: '',
  titlefont: AXIS_NAME_STYLE,
}
export const AXIS_NO_GRID_STYLE: Record<string, unknown> = { ...AXIS_STYLE, showgrid: false }

/** 深色 tooltip 基底。 */
export const TOOLTIP_DARK: Record<string, unknown> = {
  bgcolor: '#1d2939',
  bordercolor: '#1d2939',
  font: { color: '#fff', size: 12 },
}

export function buildTitleLayout(style: ChartStyle, defaultTitle: string): Record<string, unknown> | undefined {
  const text = style.title ?? defaultTitle
  const subtext = style.subtitle ?? ''
  if (!text && !subtext) return undefined
  return {
    text: subtext ? `${text}<br><span style="font-size:12px;color:#667085">${subtext}</span>` : text,
    x: 0,
    xanchor: 'left',
    font: { size: 15, color: '#101828', weight: 600 },
  }
}

export function buildLegendLayout(style: ChartStyle, enabled: boolean): Record<string, unknown> {
  if (!enabled || style.legend?.show === false) return { showlegend: false }
  const pos = style.legend?.position ?? 'top'
  const legend: Record<string, unknown> = {
    font: { size: 12, color: '#475467' },
    bgcolor: 'rgba(255,255,255,0)',
  }
  switch (pos) {
    case 'bottom':
      Object.assign(legend, { orientation: 'h', x: 0.5, xanchor: 'center', y: -0.18 })
      break
    case 'left':
      Object.assign(legend, { orientation: 'v', x: -0.08, xanchor: 'right', y: 0.5 })
      break
    case 'right':
      Object.assign(legend, { orientation: 'v', x: 1.02, xanchor: 'left', y: 0.5 })
      break
    default:
      Object.assign(legend, { orientation: 'h', x: 0, xanchor: 'left', y: 1.08 })
  }
  return { showlegend: true, legend }
}

export function buildMargin(style: ChartStyle): Record<string, number> {
  const m = style.margins
  return {
    t: m?.top ?? 64,
    r: m?.right ?? 32,
    b: m?.bottom ?? 48,
    l: m?.left ?? 64,
  }
}

export function baseLayout(style: ChartStyle, defaultTitle: string, opts: { legend?: boolean } = {}): Record<string, unknown> {
  return {
    paper_bgcolor: '#ffffff',
    plot_bgcolor: '#ffffff',
    font: { family: 'Inter, system-ui, sans-serif', color: '#475467', size: 12 },
    hoverlabel: TOOLTIP_DARK,
    title: buildTitleLayout(style, defaultTitle),
    margin: buildMargin(style),
    ...buildLegendLayout(style, opts.legend ?? false),
  }
}

/** 系列颜色：逐系列覆盖 > 色板循环。 */
export function seriesColor(style: ChartStyle, paletteId: string | undefined, name: string, index: number): string {
  return style.seriesColors?.[name] ?? paletteColor(paletteId, index)
}

/* ------------------------------- 误差棒 ------------------------------- */

export function plotlyError(values: Array<number | null>, errors: Array<number | null>, color: string): Record<string, unknown> {
  return {
    type: 'data',
    array: errors.map((e, i) => (values[i] === null ? 0 : (e ?? 0))),
    visible: true,
    color,
    thickness: 1.2,
    width: 4,
  }
}

/** 5 种系统形状循环（Shape 列映射）。 */
export const SHAPE_SEQUENCE = ['circle', 'triangle', 'diamond', 'rect', 'pin'] as const

export function shapeFor(index: number): string {
  return plotlyShape(index)
}

export function plotlyShape(index: number): string {
  return ['circle', 'triangle-up', 'diamond', 'square', 'diamond-tall'][index % SHAPE_SEQUENCE.length]
}

/** 确定性伪随机（jitter 用，按索引稳定）。 */
export function stableRandom(seed: number): number {
  let t = (seed + 0x6d2b79f5) >>> 0
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

export function formatNumber(v: number): string {
  if (!Number.isFinite(v)) return String(v)
  const abs = Math.abs(v)
  if (abs !== 0 && (abs >= 1e6 || abs < 1e-3)) return v.toExponential(2)
  return Number(v.toFixed(3)).toString()
}
