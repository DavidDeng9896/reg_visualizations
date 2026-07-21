/**
 * 各图种共用的 option 片段与数据工具（纯函数，不依赖 echarts 包）。
 */
import type { CellValue, ChartStyle, ColumnMeta, DataType, Row } from '../../../shared/types'
import { isBlank } from '../../../shared/pipeline'
import { paletteColor } from './palette'
import type { ChartOption } from '../types'

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

/* ------------------------------- option 片段 ------------------------------- */

/** 深色 tooltip 基底。 */
export const TOOLTIP_DARK: Record<string, unknown> = {
  backgroundColor: '#1d2939',
  borderWidth: 0,
  padding: [8, 12],
  textStyle: { color: '#fff', fontSize: 12 },
  extraCssText: 'border-radius:6px;box-shadow:0 4px 12px rgba(16,24,40,.18);',
}

export function buildTitle(style: ChartStyle, defaultTitle: string): ChartOption | undefined {
  const text = style.title ?? defaultTitle
  const subtext = style.subtitle ?? ''
  if (!text && !subtext) return undefined
  return {
    text,
    subtext,
    left: 'center',
    textStyle: { fontSize: 14, fontWeight: 600, color: '#1d2939' },
    subtextStyle: { fontSize: 12, color: '#667085' },
  }
}

export function buildLegend(style: ChartStyle, enabled: boolean): ChartOption | undefined {
  if (!enabled || style.legend?.show === false) return undefined
  const pos = style.legend?.position ?? 'top'
  const base: ChartOption = {
    show: true,
    textStyle: { fontSize: 12, color: '#1d2939' },
    itemWidth: 14,
    itemHeight: 9,
  }
  const labels = style.legend?.labels
  if (labels && Object.keys(labels).length) {
    base.formatter = (name: string) => labels[name] ?? name
  }
  switch (pos) {
    case 'bottom':
      return { ...base, bottom: 0, left: 'center' }
    case 'left':
      return { ...base, left: 0, top: 'middle', orient: 'vertical' }
    case 'right':
      return { ...base, right: 0, top: 'middle', orient: 'vertical' }
    default:
      return { ...base, top: style.title ? 40 : 8, left: 'center' }
  }
}

/** 四边距 → grid（含 legend 避开空间的默认值）。 */
export function buildGrid(style: ChartStyle, extra: ChartOption = {}): ChartOption {
  const m = style.margins
  return {
    top: m?.top ?? 56,
    right: m?.right ?? 32,
    bottom: m?.bottom ?? 48,
    left: m?.left ?? 64,
    containLabel: true,
    ...extra,
  }
}

/** 系列颜色：逐系列覆盖 > 色板循环。 */
export function seriesColor(style: ChartStyle, paletteId: string | undefined, name: string, index: number): string {
  return style.seriesColors?.[name] ?? paletteColor(paletteId, index)
}

/* ------------------------------- 误差棒 ------------------------------- */

export interface ErrorBarDatum {
  /** 类目索引（category 轴）或 x 值（value 轴）。 */
  x: number | string
  low: number
  high: number
  /** 类目轴分组偏移（类目单位，如并排柱）。 */
  offset?: number
  color?: string
}

/**
 * 误差棒 custom series（竖直/水平）。
 * data: [x, low, high, offset, color]
 */
export function errorBarSeries(opts: {
  name: string
  data: ErrorBarDatum[]
  horizontal?: boolean
  color?: string
  capWidth?: number
  yAxisIndex?: number
  xAxisIndex?: number
}): ChartOption {
  const cap = opts.capWidth ?? 5
  return {
    type: 'custom',
    name: opts.name,
    yAxisIndex: opts.yAxisIndex ?? 0,
    xAxisIndex: opts.xAxisIndex ?? 0,
    z: 3,
    silent: false,
    data: opts.data.map((d) => [d.x, d.low, d.high, d.offset ?? 0, d.color ?? opts.color ?? '#1d2939']),
    renderItem: (_params: unknown, api: ChartOption) => {
      const x = api.value(0)
      const low = api.value(1)
      const high = api.value(2)
      const offset = Number(api.value(3)) || 0
      const color = api.value(4) || '#1d2939'
      let cLow: number[]
      let cHigh: number[]
      if (opts.horizontal) {
        cLow = api.coord([low, typeof x === 'number' ? x + offset : x])
        cHigh = api.coord([high, typeof x === 'number' ? x + offset : x])
      } else {
        cLow = api.coord([typeof x === 'number' ? x + offset : x, low])
        cHigh = api.coord([typeof x === 'number' ? x + offset : x, high])
      }
      const style = { stroke: color, lineWidth: 1.2 }
      const children: ChartOption[] = [
        { type: 'line', shape: { x1: cLow[0], y1: cLow[1], x2: cHigh[0], y2: cHigh[1] }, style },
      ]
      if (opts.horizontal) {
        for (const c of [cLow, cHigh]) {
          children.push({ type: 'line', shape: { x1: c[0], y1: c[1] - cap, x2: c[0], y2: c[1] + cap }, style })
        }
      } else {
        for (const c of [cLow, cHigh]) {
          children.push({ type: 'line', shape: { x1: c[0] - cap, y1: c[1], x2: c[0] + cap, y2: c[1] }, style })
        }
      }
      return { type: 'group', children }
    },
    tooltip: { show: false },
  }
}

/** 5 种系统形状循环（Shape 列映射）。 */
export const SHAPE_SEQUENCE = ['circle', 'triangle', 'diamond', 'rect', 'pin'] as const

export function shapeFor(index: number): string {
  return SHAPE_SEQUENCE[index % SHAPE_SEQUENCE.length]
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
