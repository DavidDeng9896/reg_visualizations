import type { Row } from '../../../shared/types'
import { aggregateRows, aggregationLabel, errorValue, numericValues } from './aggregate'
import { dataMinOf, resolveAxis } from './axis'
import { AXIS_STYLE, baseLayout, displayVal, distinctInOrder, plotlyError, seriesColor } from './shared'
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
  const stacked = style.bar?.mode === 'stacked'
  if (!xField) return { option: EMPTY_FIGURE, warnings, seriesNames: [] }

  const cats = distinctInOrder(rows, xField).map(displayVal)
  const seriesVals = seriesField ? distinctInOrder(rows, seriesField).map(displayVal) : [null]
  const seriesNames = seriesVals.map((v) => v ?? aggregationLabel(agg) + (yField ? ` of ${yField}` : ''))
  const subset = (cat: string, sv: string | null): Row[] =>
    rows.filter((r) => displayVal(r[xField]) === cat && (sv === null || displayVal(r[seriesField!]) === sv))

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

  const errType = cfg.errorBars ?? 'none'
  const errEnabled = agg === 'mean' && errType !== 'none'
  if (errType !== 'none' && agg !== 'mean') warnings.push('误差棒仅在聚合为 Average(mean) 时生效')
  if (errEnabled && stacked) warnings.push('堆叠模式下误差棒不生效，已忽略')

  const yLabel = style.yAxis?.label ?? cfg.y?.label ?? (yField ? `${aggregationLabel(agg)} of ${yField}` : 'Count')
  const xLabel = style.xAxis?.label ?? cfg.x?.label ?? xField
  const valueAxis = { ...AXIS_STYLE, ...resolveAxis(style.yAxis, dataMinOf(allValues), yLabel, warnings, 'Y 轴') }
  const categoryAxis = { ...AXIS_STYLE, type: 'category', title: { text: xLabel, font: AXIS_STYLE.titlefont } }

  const data = seriesVals.map((sv, si) => {
    const name = seriesNames[si]
    const color = seriesColor(style, cfg.palette, name, si)
    const trace: Record<string, unknown> = {
      type: 'bar',
      name,
      orientation: horizontal ? 'h' : 'v',
      x: horizontal ? matrix[si] : cats,
      y: horizontal ? cats : matrix[si],
      marker: {
        color,
        opacity: style.opacity ?? 1,
        line: { width: style.bar?.lineWidth ?? 0, color: style.bar?.lineColor ?? '#1d2939' },
      },
      customdata: cats.map((cat) => subset(cat, sv).map((r) => String(r.__rowId ?? ''))),
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
      layout: {
        ...baseLayout(style, viewName ?? '', { legend: seriesVals.length > 1 || seriesVals[0] !== null }),
        barmode: stacked ? 'stack' : 'group',
        xaxis: horizontal ? valueAxis : categoryAxis,
        yaxis: horizontal ? categoryAxis : valueAxis,
      },
    },
    warnings,
    seriesNames,
  }
}
