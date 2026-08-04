import type { Row } from '../../../shared/types'
import { aggregateRows, aggregationLabel, errorValue, numericValues } from './aggregate'
import { dataMinOf, resolveAxis } from './axis'
import { AXIS_STYLE, baseLayout, displayVal, distinctInOrder, plotlyError, seriesColor, withRefLines } from './shared'
import { EMPTY_FIGURE, type BuildInput, type BuildOutput } from '../types'

export function buildBarOption({ result, config, viewName }: BuildInput): BuildOutput {
  const warnings: string[] = []
  const { rows } = result
  const cfg = config.configure
  const style = config.style
  const xField = cfg.x?.field
  const yField = cfg.y?.field
  const seriesField = cfg.series?.field
  const agg = cfg.y?.aggregation ?? (yField ? 'sum' : 'count')
  const horizontal = style.bar?.direction === 'horizontal'
  const barMode = style.bar?.mode ?? 'grouped'
  const stacked = barMode === 'stacked' || barMode === 'percent'
  if (!xField) return { option: EMPTY_FIGURE, warnings, seriesNames: [] }

  const cats = distinctInOrder(rows, xField).map(displayVal)
  const seriesVals = seriesField ? distinctInOrder(rows, seriesField).map(displayVal) : [null]
  const seriesNames = seriesVals.map((v) => v ?? aggregationLabel(agg) + (yField ? ` of ${yField}` : ''))
  // 单遍分组：cat → series → rows，替代每组 rows.filter 的 O(cats×series×N)
  const groups = new Map<string, Map<string, Row[]>>()
  for (const r of rows) {
    const ck = displayVal(r[xField])
    let bySeries = groups.get(ck)
    if (!bySeries) {
      bySeries = new Map()
      groups.set(ck, bySeries)
    }
    const sk = seriesField ? displayVal(r[seriesField]) : ''
    let arr = bySeries.get(sk)
    if (!arr) {
      arr = []
      bySeries.set(sk, arr)
    }
    arr.push(r)
  }
  const subset = (cat: string, sv: string | null): Row[] => groups.get(cat)?.get(sv ?? '') ?? []

  const allValues: number[] = []
  const matrix = seriesVals.map((sv) =>
    cats.map((cat) => {
      const sub = subset(cat, sv)
      const value = yField ? aggregateRows(sub, yField, agg) : sub.length
      if (typeof value === 'number') allValues.push(value)
      return value
    }),
  )
  if (yField && !allValues.length) warnings.push(`列「${yField}」无有效数值`)

  // 100% 堆叠：每个 cat 内各系列按占比归一（负值与空值按 0 计）
  const valueMatrix = barMode === 'percent'
    ? matrix.map((row, si) =>
        row.map((v, ci) => {
          const total = seriesVals.reduce((acc, _sv, sj) => {
            const x = matrix[sj]?.[ci]
            return acc + (typeof x === 'number' && x > 0 ? x : 0)
          }, 0)
          const n = typeof v === 'number' && v > 0 ? v : 0
          return total > 0 ? n / total : 0
        }),
      )
    : matrix
  const errType = cfg.errorBars ?? 'none'
  const errEnabled = agg === 'mean' && errType !== 'none' && barMode !== 'percent'
  if (errType !== 'none' && agg !== 'mean') warnings.push('误差棒仅在聚合为 Average(mean) 时生效')
  if (errEnabled && stacked) warnings.push('堆叠模式下误差棒不生效，已忽略')

  const yLabel = style.yAxis?.label ?? cfg.y?.label ?? (yField ? `${aggregationLabel(agg)} of ${yField}` : 'Count')
  const xLabel = style.xAxis?.label ?? cfg.x?.label ?? xField
  const valueAxis =
    barMode === 'percent'
      ? { ...AXIS_STYLE, tickformat: '.0%', range: [0, 1], title: { text: yLabel, font: AXIS_STYLE.titlefont } }
      : { ...AXIS_STYLE, ...resolveAxis(style.yAxis, dataMinOf(allValues), yLabel, warnings, 'Y 轴') }
  const categoryAxis = { ...AXIS_STYLE, type: 'category', title: { text: xLabel, font: AXIS_STYLE.titlefont } }

  const fmtVal = (v: unknown): string => {
    if (typeof v !== 'number' || !Number.isFinite(v)) return ''
    if (barMode === 'percent') return `${(v * 100).toFixed(1)}%`
    const abs = Math.abs(v)
    return abs !== 0 && (abs >= 1e6 || abs < 1e-3) ? v.toExponential(1) : Number(v.toPrecision(4)).toString()
  }

  const data = seriesVals.map((sv, si) => {
    const name = seriesNames[si]
    const color = seriesColor(style, cfg.palette, name, si)
    const trace: Record<string, unknown> = {
      type: 'bar',
      name,
      orientation: horizontal ? 'h' : 'v',
      x: horizontal ? valueMatrix[si] : cats,
      y: horizontal ? cats : valueMatrix[si],
      marker: {
        color,
        opacity: style.opacity ?? 1,
        line: { width: style.bar?.lineWidth ?? 0, color: style.bar?.lineColor ?? '#1d2939' },
      },
      customdata: cats.map((cat) => subset(cat, sv).map((r) => String(r.__rowId ?? ''))),
    }
    if (style.bar?.showValues) {
      trace.text = valueMatrix[si].map(fmtVal)
      trace.textposition = 'outside'
      trace.textfont = { size: 10, color: '#475467' }
    }
    if (errEnabled && !stacked && yField) {
      const errors = cats.map((cat) => errorValue(numericValues(subset(cat, sv), yField), errType))
      trace[horizontal ? 'error_x' : 'error_y'] = plotlyError(matrix[si], errors, color)
    }
    return trace
  })

  return {
    option: {
      data,
      layout: withRefLines(
        {
          ...baseLayout(style, '', {
            legend: seriesVals.length > 1 || seriesVals[0] !== null,
            legendItemCount: seriesNames.length,
          }),
          barmode: stacked ? 'stack' : 'group',
          xaxis: horizontal ? valueAxis : categoryAxis,
          yaxis: horizontal ? categoryAxis : valueAxis,
        },
        style,
      ),
    },
    warnings,
    seriesNames,
  }
}
