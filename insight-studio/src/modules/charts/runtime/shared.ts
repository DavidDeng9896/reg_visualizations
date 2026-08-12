/** 各图种共用的 Plotly layout 片段与数据工具。 */
import type { CellValue, ChartStyle, ColumnMeta, DataType, ReferenceLine, Row } from '../../../shared/types'
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

/** 低于此宽度时收起 Plotly 内嵌图例，改为芯片 + 浮动面板（见 ChartPanel）。 */
export const LEGEND_COLLAPSE_WIDTH = 680

/**
 * 图例布局：位置 strictly 跟随 style.legend.position。
 * 用 `xref/yref: 'container'` 占容器边距，完整宽度下不叠在主图上。
 */
export function buildLegendLayout(
  style: ChartStyle,
  enabled: boolean,
  opts?: { itemCount?: number },
): Record<string, unknown> {
  if (!enabled || style.legend?.show === false) return { showlegend: false }
  const itemCount = Math.max(0, opts?.itemCount ?? 0)
  const pos = style.legend?.position ?? 'top'

  const legend: Record<string, unknown> = {
    font: { size: itemCount >= 12 ? 11 : 12, color: '#475467' },
    bgcolor: 'rgba(255,255,255,0.92)',
    borderwidth: 0,
    xref: 'container',
    yref: 'container',
    tracegroupgap: 4,
    itemsizing: 'constant',
  }

  switch (pos) {
    case 'bottom':
      Object.assign(legend, {
        orientation: 'h',
        x: 0,
        xanchor: 'left',
        y: 0,
        yanchor: 'bottom',
        entrywidth: 0.2,
        entrywidthmode: 'fraction',
      })
      break
    case 'left':
      Object.assign(legend, {
        orientation: 'v',
        x: 0,
        xanchor: 'left',
        y: 1,
        yanchor: 'top',
      })
      break
    case 'right':
      Object.assign(legend, {
        orientation: 'v',
        x: 1,
        xanchor: 'right',
        y: 1,
        yanchor: 'top',
      })
      break
    default:
      Object.assign(legend, {
        orientation: 'h',
        x: 0,
        xanchor: 'left',
        y: 1,
        yanchor: 'top',
        entrywidth: 0.2,
        entrywidthmode: 'fraction',
      })
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

export function baseLayout(
  style: ChartStyle,
  defaultTitle: string,
  opts: { legend?: boolean; legendItemCount?: number } = {},
): Record<string, unknown> {
  const title = buildTitleLayout(style, defaultTitle)
  const margin = buildMargin(style)
  // 无标题时顶部边距收紧，避免留白（卡片/页头已展示名称）
  if (!title && style.margins?.top === undefined) margin.t = 32
  const legendEnabled = opts.legend ?? false
  // container 图例会再占一层边距；按配置位置给对应侧留安全垫（不改位置）
  if (legendEnabled && style.legend?.show !== false && style.margins === undefined) {
    const pos = style.legend?.position ?? 'top'
    if (pos === 'top') margin.t = Math.max(margin.t, 48)
    else if (pos === 'bottom') margin.b = Math.max(margin.b, 56)
    else if (pos === 'left') margin.l = Math.max(margin.l, 96)
    else if (pos === 'right') margin.r = Math.max(margin.r, 96)
  }
  return {
    paper_bgcolor: '#ffffff',
    plot_bgcolor: '#ffffff',
    font: { family: 'Inter, system-ui, sans-serif', color: '#475467', size: 12 },
    hoverlabel: TOOLTIP_DARK,
    title,
    margin,
    ...buildLegendLayout(style, legendEnabled, { itemCount: opts.legendItemCount }),
  }
}

/** 系列颜色：逐系列覆盖 > 色板循环。 */
export function seriesColor(style: ChartStyle, paletteId: string | undefined, name: string, index: number): string {
  return style.seriesColors?.[name] ?? paletteColor(paletteId, index)
}

/* ------------------------------- 参考线 shapes ------------------------------- */

/** 参考线 → Plotly shapes（灰色虚线 + 可选小标签）。 */
export function refLineShapes(lines: ReferenceLine[] | undefined): Array<Record<string, unknown>> {
  if (!lines?.length) return []
  const out: Array<Record<string, unknown>> = []
  for (const l of lines) {
    if (!Number.isFinite(l.value)) continue
    const shape: Record<string, unknown> = {
      type: 'line',
      line: { color: '#98a2b3', dash: 'dash', width: 1 },
      ...(l.axis === 'y'
        ? { xref: 'paper', x0: 0, x1: 1, yref: 'y', y0: l.value, y1: l.value }
        : { yref: 'paper', y0: 0, y1: 1, xref: 'x', x0: l.value, x1: l.value }),
    }
    if (l.label?.trim()) {
      shape.label = { text: l.label.trim(), font: { size: 10, color: '#667085' }, textposition: l.axis === 'y' ? 'top right' : 'top left' }
    }
    out.push(shape)
  }
  return out
}

/** 把参考线合并进 layout.shapes（无 shapes 时新建）。 */
export function withRefLines(layout: Record<string, unknown>, style: ChartStyle): Record<string, unknown> {
  const lines = refLineShapes(style.referenceLines)
  if (!lines.length) return layout
  const existing = Array.isArray(layout.shapes) ? (layout.shapes as Array<Record<string, unknown>>) : []
  return { ...layout, shapes: [...existing, ...lines] }
}

/* ------------------------------- 拟合置信带 / 注释 ------------------------------- */

function hexToRgba(hex: string, alpha: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return `rgba(46,91,255,${alpha})`
  const n = parseInt(m[1], 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`
}

/** 拟合 95% 置信带（Linear/Quadratic，引擎已产出 ciBand）：同色浅阴影，先画在下层。 */
export function ciBandTraces(
  fit: { ciBand?: Array<{ x: number; lower: number; upper: number }> },
  color: string,
  xaxis: string,
  yaxis: string,
): Array<Record<string, unknown>> {
  const band = fit.ciBand
  if (!band?.length) return []
  const base = {
    type: 'scatter',
    mode: 'lines',
    xaxis,
    yaxis,
    line: { width: 0 },
    hoverinfo: 'skip',
    showlegend: false,
  }
  return [
    { ...base, x: band.map((p) => p.x), y: band.map((p) => p.upper) },
    { ...base, x: band.map((p) => p.x), y: band.map((p) => p.lower), fill: 'tonexty', fillcolor: hexToRgba(color, 0.15) },
  ]
}

/** 拟合注释（方程 + R²）：右下角文本块（避开顶部图例）。 */
export function fitAnnotations(items: Array<{ name: string; equation: string; r2: number | null }>): Array<Record<string, unknown>> {
  if (!items.length) return []
  const text = items.map((i) => `${i.name}: ${i.equation}${i.r2 !== null ? `，R²=${i.r2.toFixed(3)}` : ''}`).join('<br>')
  return [
    {
      text,
      xref: 'paper',
      yref: 'paper',
      x: 0.99,
      y: 0.02,
      xanchor: 'right',
      yanchor: 'bottom',
      showarrow: false,
      align: 'right',
      font: { size: 10, color: '#667085' },
      bgcolor: 'rgba(255,255,255,0.9)',
      bordercolor: '#e4e7ec',
      borderwidth: 1,
      borderpad: 4,
    },
  ]
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

/** UI 形状值 → Plotly symbol（UI 值直接透传时 Plotly 会回退 circle）。 */
export function plotlySymbol(shape: string): string {
  const i = (SHAPE_SEQUENCE as readonly string[]).indexOf(shape)
  return i >= 0 ? plotlyShape(i) : shape
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
