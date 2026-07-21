import type { ChartConfig, TableColumn, ViewType } from '@/shared/types/analysis'
import type { EChartsOption } from 'echarts'
import { fitSeries } from './fitEngine'
import { missingRequiredFields } from './guessMapping'
import { axisExtent } from './axisRange'
import {
  echartsValueAxisType,
  logScaleDataWarning,
  type AxisScale,
} from './axisScale'
import { buildGridOption, buildLegendOption } from './chartLayout'
import { paletteColors, resolveSeriesColor } from './seriesStyle'

const SAMPLE_LIMIT = 10000

export interface ChartBuildInput {
  columns: TableColumn[]
  rows: Record<string, unknown>[]
  viewType: ViewType
  config: ChartConfig
}

export interface ChartBuildResult {
  option: EChartsOption
  sampled: boolean
  totalRows: number
  modelTables?: { variables: Record<string, unknown>[]; output: Record<string, unknown>[] }
  /** 拟合边界/失败提示（按系列去重后展示） */
  fitWarnings?: string[]
  /** 轴 Scale（如 Log）回退提示 */
  axisWarnings?: string[]
}

function sampleRows(rows: Record<string, unknown>[]) {
  if (rows.length <= SAMPLE_LIMIT) return { rows, sampled: false }
  const step = rows.length / SAMPLE_LIMIT
  const out: Record<string, unknown>[] = []
  for (let i = 0; i < SAMPLE_LIMIT; i++) out.push(rows[Math.floor(i * step)])
  return { rows: out, sampled: true }
}

function num(v: unknown): number | null {
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function resolveAxisType(scale: AxisScale | undefined, values: number[], warnings: string[]): 'value' | 'log' {
  const warn = logScaleDataWarning(scale, values)
  if (warn) {
    if (!warnings.includes(warn)) warnings.push(warn)
    return 'value'
  }
  return echartsValueAxisType(scale)
}

function aggregate(
  rows: Record<string, unknown>[],
  yField: string | undefined,
  agg: string | undefined,
): number {
  const vals = rows.map((r) => num(yField ? r[yField!] : 1)).filter((v): v is number => v != null)
  if (!vals.length) return 0
  switch (agg) {
    case 'count':
      return rows.length
    case 'sum':
      return vals.reduce((a, b) => a + b, 0)
    case 'min':
      return Math.min(...vals)
    case 'max':
      return Math.max(...vals)
    case 'median': {
      const s = [...vals].sort((a, b) => a - b)
      const m = Math.floor(s.length / 2)
      return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
    }
    case 'mean':
    default:
      return vals.reduce((a, b) => a + b, 0) / vals.length
  }
}

function std(vals: number[]): number {
  if (vals.length < 2) return 0
  const m = vals.reduce((a, b) => a + b, 0) / vals.length
  return Math.sqrt(vals.reduce((a, b) => a + (b - m) ** 2, 0) / (vals.length - 1))
}

export function buildChartOption(input: ChartBuildInput): ChartBuildResult {
  const { viewType, config } = input
  if (viewType === 'table') {
    return { option: {}, sampled: false, totalRows: input.rows.length }
  }
  const miss = missingRequiredFields(viewType, config.configure)
  if (miss.length) {
    return {
      option: {
        title: {
          text: '请先配置图表字段',
          subtext: `缺少：${miss.join('、')}（点击 Edit 图表）`,
          left: 'center',
          top: 'middle',
        },
      },
      sampled: false,
      totalRows: input.rows.length,
    }
  }
  const { rows, sampled } = sampleRows(input.rows)
  const cfg = config.configure
  const style = config.style
  const colors = paletteColors(cfg.colorPalette)
  const title = {
    text: style.title || '',
    subtext: style.subtitle || '',
    left: 'center',
  }
  const legend = buildLegendOption(style)
  const xExtent = axisExtent({ mode: style.xRangeMode, min: style.xMin, max: style.xMax })
  const yExtent = axisExtent({ mode: style.yRangeMode, min: style.yMin, max: style.yMax })

  let option: EChartsOption = {}
  let modelTables: ChartBuildResult['modelTables']
  let fitWarnings: string[] | undefined
  const axisWarnings: string[] = []

  if (viewType === 'bar') {
    const x = cfg.xField
    const y = cfg.yField
    const seriesField = cfg.seriesField
    const cats = [...new Set(rows.map((r) => String(r[x || ''] ?? '')))]
    const seriesKeys = seriesField
      ? [...new Set(rows.map((r) => String(r[seriesField] ?? '')))]
      : ['value']
    const series = seriesKeys.map((sk, i) => {
      const data = cats.map((cat) => {
        const subset = rows.filter(
          (r) =>
            String(r[x || ''] ?? '') === cat &&
            (!seriesField || String(r[seriesField] ?? '') === sk),
        )
        const v = aggregate(subset, y, cfg.aggregation || 'mean')
        let err: number | undefined
        if (cfg.errorBars && cfg.errorBars !== 'none' && (cfg.aggregation || 'mean') === 'mean') {
          const vals = subset.map((r) => num(y ? r[y] : 1)).filter((n): n is number => n != null)
          const s = std(vals)
          err = cfg.errorBars === 'sem' ? s / Math.sqrt(vals.length || 1) : s
        }
        return err != null ? { value: v, error: err } : v
      })
      const color = resolveSeriesColor(style.seriesColors, sk, colors, i)
      return {
        name: sk,
        type: 'bar' as const,
        stack: cfg.stacked ? 'total' : undefined,
        data,
        itemStyle: { color, opacity: style.opacity ?? 0.9 },
      }
    })
    const barSeries = series.map((s) => ({
      ...s,
      data: s.data.map((d) =>
        typeof d === 'object' && d && 'error' in d
          ? {
              value: (d as { value: number }).value,
              itemStyle: s.itemStyle,
            }
          : d,
      ),
    }))
    const errorSeries = series.flatMap((s, si) => {
      const hasErr = s.data.some((d) => typeof d === 'object' && d && 'error' in d)
      if (!hasErr) return []
      return [
        {
          name: `${s.name} error`,
          type: 'custom' as const,
          renderItem: (params: { dataIndex: number }, api: { value: (i: number) => number; coord: (v: number[]) => number[]; size: (v: number[]) => number[] }) => {
            const raw = s.data[params.dataIndex]
            if (typeof raw !== 'object' || !raw || !('error' in raw)) return null
            const val = (raw as { value: number; error: number }).value
            const err = (raw as { value: number; error: number }).error
            const isH = cfg.orientation === 'horizontal'
            const categoryIndex = params.dataIndex
            const center = isH
              ? api.coord([val, categoryIndex])
              : api.coord([categoryIndex, val])
            const high = isH
              ? api.coord([val + err, categoryIndex])
              : api.coord([categoryIndex, val + err])
            const low = isH
              ? api.coord([val - err, categoryIndex])
              : api.coord([categoryIndex, val - err])
            const half = 5
            const style = { stroke: colors[si % colors.length], lineWidth: 1.5 }
            if (isH) {
              return {
                type: 'group',
                children: [
                  { type: 'line', shape: { x1: low[0], y1: center[1], x2: high[0], y2: center[1] }, style },
                  { type: 'line', shape: { x1: low[0], y1: center[1] - half, x2: low[0], y2: center[1] + half }, style },
                  { type: 'line', shape: { x1: high[0], y1: center[1] - half, x2: high[0], y2: center[1] + half }, style },
                ],
              }
            }
            return {
              type: 'group',
              children: [
                { type: 'line', shape: { x1: center[0], y1: low[1], x2: center[0], y2: high[1] }, style },
                { type: 'line', shape: { x1: center[0] - half, y1: low[1], x2: center[0] + half, y2: low[1] }, style },
                { type: 'line', shape: { x1: center[0] - half, y1: high[1], x2: center[0] + half, y2: high[1] }, style },
              ],
            }
          },
          data: s.data.map((_, i) => i),
          z: 100,
          tooltip: { show: false },
        },
      ]
    })
    const measureVals = series.flatMap((s) =>
      s.data.map((d) => (typeof d === 'object' && d && 'value' in d ? (d as { value: number }).value : (d as number))),
    )
    const isH = cfg.orientation === 'horizontal'
    const valueAxisType = resolveAxisType(isH ? cfg.xScale : cfg.yScale, measureVals, axisWarnings)
    option = {
      title,
      color: colors,
      legend,
      tooltip: { trigger: 'axis' },
      grid: buildGridOption(style),
      xAxis: {
        type: isH ? valueAxisType : 'category',
        data: isH ? undefined : cats,
        name: cfg.xLabel || x,
        scale: true,
        ...(isH ? yExtent : undefined),
      },
      yAxis: {
        type: isH ? 'category' : valueAxisType,
        data: isH ? cats : undefined,
        name: cfg.yLabel || y,
        ...(isH ? undefined : yExtent),
      },
      series: [...barSeries, ...errorSeries] as EChartsOption['series'],
    }
  } else if (viewType === 'line' || viewType === 'scatter') {
    const x = cfg.xField
    const y = cfg.yField
    const seriesField = cfg.seriesField || cfg.colorField
    const groups = seriesField
      ? [...new Set(rows.map((r) => String(r[seriesField] ?? '')))]
      : ['all']
    const flagged = new Set(config.flags?.pointIds || [])
    const series: EChartsOption['series'] = []
    const variables: Record<string, unknown>[] = []
    const outputs: Record<string, unknown>[] = []
    const warnings: string[] = []

    for (let gi = 0; gi < groups.length; gi++) {
      const g = groups[gi]
      let pts = rows
        .filter((r) => !seriesField || String(r[seriesField] ?? '') === g)
        .map((r) => {
          const id = String(r.__rowId ?? '')
          return {
            id,
            x: num(r[x || '']),
            y: num(r[y || '']),
            flagged: flagged.has(id),
          }
        })
        .filter((p) => p.x != null && p.y != null) as { id: string; x: number; y: number; flagged: boolean }[]

      if (cfg.excludeFlagged) pts = pts.filter((p) => !p.flagged)

      const color = resolveSeriesColor(style.seriesColors, g, colors, gi)
      series.push({
        name: g,
        type: viewType === 'line' ? 'line' : 'scatter',
        data: pts.map((p) => ({
          value: [p.x, p.y],
          id: p.id,
          symbol: p.flagged ? 'diamond' : style.pointShape || 'circle',
          itemStyle: { color: p.flagged ? '#c00' : color, opacity: style.opacity ?? 0.85 },
        })),
        symbolSize: viewType === 'scatter' && cfg.sizeField ? 10 : 8,
      })

      if (cfg.fitModel && cfg.fitModel !== 'none') {
        const fitConstraints =
          cfg.fitModel === '4pl'
            ? cfg.fitConstraints
            : cfg.fitModel === 'linear' || cfg.fitModel === 'quadratic'
              ? { throughOrigin: !!cfg.fitThroughOrigin }
              : undefined
        const fit = fitSeries(
          pts.map((p) => [p.x, p.y]),
          cfg.fitModel,
          fitConstraints,
        )
        if (!fit.ok) {
          const label = g === 'all' ? fit.warning! : `系列「${g}」：${fit.warning}`
          if (!warnings.includes(label)) warnings.push(label)
        } else {
          series.push({
            name: `${g} fit`,
            type: 'line',
            showSymbol: false,
            data: fit.curve,
            lineStyle: { type: 'dashed', color },
          })
          variables.push({ series: g, ...fit.variables })
          outputs.push(...fit.output.map((o) => ({ series: g, ...o })))
        }
      }
    }

    modelTables = { variables, output: outputs }
    if (warnings.length) fitWarnings = warnings
    const xVals = series.flatMap((s) =>
      Array.isArray((s as { data?: { value?: number[] }[] }).data)
        ? ((s as { data: { value?: number[] }[] }).data || [])
            .map((d) => d.value?.[0])
            .filter((v): v is number => v != null)
        : [],
    )
    const yVals = series.flatMap((s) =>
      Array.isArray((s as { data?: { value?: number[] }[] }).data)
        ? ((s as { data: { value?: number[] }[] }).data || [])
            .map((d) => d.value?.[1])
            .filter((v): v is number => v != null)
        : [],
    )
    // Prefer raw numeric points for scale validation (fit curves may include extrapolated values)
    const rawX = rows
      .map((r) => num(r[x || '']))
      .filter((v): v is number => v != null)
    const rawY = rows
      .map((r) => num(r[y || '']))
      .filter((v): v is number => v != null)
    const xAxisType = resolveAxisType(cfg.xScale, rawX.length ? rawX : xVals, axisWarnings)
    const yAxisType = resolveAxisType(cfg.yScale, rawY.length ? rawY : yVals, axisWarnings)
    option = {
      title,
      color: colors,
      legend,
      tooltip: { trigger: 'item' },
      grid: buildGridOption(style, { right: 80 }),
      toolbox: {
        right: 12,
        top: 28,
        feature: {
          brush: { type: ['rect', 'polygon', 'clear'] },
        },
      },
      brush: {
        xAxisIndex: 0,
        throttleType: 'debounce',
        throttleDelay: 100,
        // Keep inactive until user picks a brush tool — avoids a white selection overlay covering the plot.
        toolbox: ['rect', 'polygon', 'clear'],
      },
      xAxis: {
        type: xAxisType,
        name: cfg.xLabel || x,
        scale: true,
        ...xExtent,
      },
      yAxis: [
        {
          type: yAxisType,
          name: cfg.yLabel || y,
          scale: true,
          ...yExtent,
        },
        cfg.yFieldRight
          ? { type: 'value', name: cfg.yLabelRight || cfg.yFieldRight, scale: true }
          : undefined,
      ].filter(Boolean) as EChartsOption['yAxis'],
      series,
    }
  } else if (viewType === 'pie') {
    const cat = cfg.categoriesField
    const measure = cfg.measureField
    const groups = new Map<string, Record<string, unknown>[]>()
    for (const r of rows) {
      const k = String(r[cat || ''] ?? '')
      if (!groups.has(k)) groups.set(k, [])
      groups.get(k)!.push(r)
    }
    const data = [...groups.entries()].map(([name, subset], i) => ({
      name,
      value: aggregate(subset, measure, cfg.aggregation || 'count'),
      itemStyle: { color: resolveSeriesColor(style.seriesColors, name, colors, i) },
    }))
    option = {
      title,
      tooltip: { trigger: 'item' },
      legend,
      series: [
        {
          type: 'pie',
          radius: ['35%', '65%'],
          data,
          label: { formatter: '{b}: {d}%' },
        },
      ],
    }
  } else if (viewType === 'box') {
    const x = cfg.xField
    const y = cfg.yField
    const cats = x ? [...new Set(rows.map((r) => String(r[x] ?? '')))] : ['all']
    const boxData = cats.map((cat) => {
      const vals = rows
        .filter((r) => !x || String(r[x] ?? '') === cat)
        .map((r) => num(r[y || '']))
        .filter((n): n is number => n != null)
        .sort((a, b) => a - b)
      if (!vals.length) return [0, 0, 0, 0, 0]
      const q = (p: number) => {
        const i = (vals.length - 1) * p
        const lo = Math.floor(i)
        const hi = Math.ceil(i)
        return lo === hi ? vals[lo] : vals[lo] * (hi - i) + vals[hi] * (i - lo)
      }
      const q1 = q(0.25)
      const q2 = q(0.5)
      const q3 = q(0.75)
      const iqr = q3 - q1
      const low = Math.max(vals[0], q1 - 1.5 * iqr)
      const high = Math.min(vals[vals.length - 1], q3 + 1.5 * iqr)
      return [low, q1, q2, q3, high]
    })
    const yVals = boxData.flat()
    const yAxisType = resolveAxisType(cfg.yScale, yVals, axisWarnings)
    option = {
      title,
      tooltip: { trigger: 'item' },
      legend,
      grid: buildGridOption(style),
      xAxis: { type: 'category', data: cats, name: cfg.xLabel || x },
      yAxis: { type: yAxisType, name: cfg.yLabel || y, scale: true, ...yExtent },
      series: [{ type: 'boxplot', data: boxData }],
    }
  } else if (viewType === 'heatmap') {
    const rf = cfg.heatmapRowField || cfg.yField
    const cf = cfg.heatmapColField || cfg.xField
    const vf = cfg.heatmapValueField || cfg.yField
    const rowKeys = [...new Set(rows.map((r) => String(r[rf || ''] ?? '')))]
    const colKeys = [...new Set(rows.map((r) => String(r[cf || ''] ?? '')))]
    const data: [number, number, number][] = []
    for (let i = 0; i < rowKeys.length; i++) {
      for (let j = 0; j < colKeys.length; j++) {
        const subset = rows.filter(
          (r) => String(r[rf || ''] ?? '') === rowKeys[i] && String(r[cf || ''] ?? '') === colKeys[j],
        )
        const v = aggregate(subset, vf, cfg.aggregation || 'mean')
        data.push([j, i, v])
      }
    }
    option = {
      title,
      tooltip: { position: 'top' },
      grid: buildGridOption(style, { top: 60, bottom: 80, left: 80, right: 60 }),
      xAxis: { type: 'category', data: colKeys, name: cfg.xLabel || cf, splitArea: { show: true } },
      yAxis: { type: 'category', data: rowKeys, name: cfg.yLabel || rf, splitArea: { show: true } },
      visualMap: {
        min: Math.min(...data.map((d) => d[2]), 0),
        max: Math.max(...data.map((d) => d[2]), 1),
        calculable: true,
        orient: 'vertical',
        right: 0,
      },
      series: [{ type: 'heatmap', data, label: { show: data.length < 200 } }],
    }
  }

  return {
    option,
    sampled,
    totalRows: input.rows.length,
    modelTables,
    fitWarnings,
    axisWarnings: axisWarnings.length ? axisWarnings : undefined,
  }
}

export { SAMPLE_LIMIT }
