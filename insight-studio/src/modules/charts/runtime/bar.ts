/**
 * Bar option builder（3B：竖/横 + 并排/堆叠 + 聚合；1A：Mean → SD/SEM 误差棒）。
 */
import type { Row } from '../../../shared/types'
import { aggregateRows, aggregationLabel, errorValue, numericValues } from './aggregate'
import { resolveAxis, dataMinOf } from './axis'
import {
  TOOLTIP_DARK,
  buildGrid,
  buildLegend,
  buildTitle,
  displayVal,
  distinctInOrder,
  errorBarSeries,
  seriesColor,
} from './shared'
import type { BuildInput, BuildOutput, ChartOption } from '../types'

export function buildBarOption({ result, config, viewName }: BuildInput): BuildOutput {
  const warnings: string[] = []
  const { rows, columns: _columns } = result
  const cfg = config.configure
  const style = config.style
  const xField = cfg.x?.field
  const yField = cfg.y?.field
  const seriesField = cfg.series?.field
  const agg = cfg.y?.aggregation ?? (yField ? 'sum' : 'count')
  const horizontal = style.bar?.direction === 'horizontal'
  const stacked = style.bar?.mode === 'stacked'

  if (!xField) return { option: {}, warnings, seriesNames: [] }

  const cats = distinctInOrder(rows, xField).map(displayVal)
  const seriesVals = seriesField ? distinctInOrder(rows, seriesField).map(displayVal) : [null]
  const seriesNames = seriesVals.map((v) => v ?? aggregationLabel(agg) + (yField ? ` of ${yField}` : ''))

  const yLabel = style.yAxis?.label ?? cfg.y?.label ?? (yField ? `${aggregationLabel(agg)} of ${yField}` : 'Count')
  const xLabel = style.xAxis?.label ?? cfg.x?.label ?? xField

  // 每个 (cat, series) 的聚合值与误差
  const subset = (cat: string, sv: string | null): Row[] =>
    rows.filter((r) => displayVal(r[xField]) === cat && (sv === null || displayVal(r[seriesField!]) === sv))

  const allValues: number[] = []
  const matrix: (number | null)[][] = seriesVals.map((sv) =>
    cats.map((cat) => {
      const sub = subset(cat, sv)
      const v = yField ? aggregateRows(sub, yField, agg) : sub.length
      if (typeof v === 'number') allValues.push(v)
      return v
    }),
  )
  if (yField && allValues.length === 0) warnings.push(`列「${yField}」无有效数值`)

  const errType = cfg.errorBars ?? 'none'
  const errEnabled = agg === 'mean' && errType !== 'none'
  if (errType !== 'none' && agg !== 'mean') warnings.push('误差棒仅在聚合为 Average(mean) 时生效')
  if (errEnabled && stacked) warnings.push('堆叠模式下误差棒不生效，已忽略')

  const valueAxis = resolveAxis(style.yAxis, dataMinOf(allValues), yLabel, warnings, 'Y 轴')
  const categoryAxis = { type: 'category', data: cats, name: xLabel, nameGap: 28, axisLabel: { color: '#667085' } }
  const valAxisOpt: ChartOption = {
    ...valueAxis,
    axisLabel: { color: '#667085' },
    splitLine: { show: true, lineStyle: { color: '#eef1f5' } },
  }

  const series: ChartOption[] = []
  const opacity = style.opacity ?? 1
  seriesVals.forEach((sv, si) => {
    const name = seriesNames[si]
    const color = seriesColor(style, cfg.palette, name, si)
    series.push({
      type: 'bar',
      name,
      stack: stacked ? 'total' : undefined,
      data: matrix[si],
      itemStyle: {
        color,
        opacity,
        borderWidth: style.bar?.lineWidth ?? 0,
        borderColor: style.bar?.lineColor ?? '#1d2939',
        borderRadius: horizontal ? [0, 2, 2, 0] : [2, 2, 0, 0],
      },
      barMaxWidth: 56,
    })
  })

  if (errEnabled && !stacked) {
    const n = seriesVals.length
    seriesVals.forEach((sv, si) => {
      const name = seriesNames[si]
      const color = seriesColor(style, cfg.palette, name, si)
      const data = cats.flatMap((cat, ci) => {
        const sub = subset(cat, sv)
        const vals = numericValues(sub, yField!)
        const err = errorValue(vals, errType)
        const mean = matrix[si][ci]
        if (err === null || mean === null) return []
        // 并排柱中心偏移（类目单位，柱宽按 0.6 带宽容纳 n 根柱）
        const offset = horizontal ? -(si - (n - 1) / 2) * (0.6 / n) : (si - (n - 1) / 2) * (0.6 / n)
        return [{ x: ci, low: mean - err, high: mean + err, offset, color }]
      })
      if (data.length) series.push(errorBarSeries({ name: `${name} error`, data, horizontal, color }))
    })
  }

  const option: ChartOption = {
    title: buildTitle(style, viewName ?? ''),
    tooltip: {
      ...TOOLTIP_DARK,
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
    },
    legend: buildLegend(style, seriesVals.length > 1 || seriesVals[0] !== null),
    grid: buildGrid(style),
    xAxis: horizontal ? valAxisOpt : categoryAxis,
    yAxis: horizontal ? { ...categoryAxis, inverse: false } : valAxisOpt,
    series,
  }
  return { option, warnings, seriesNames }
}
