/**
 * Pie option builder（8B：环形内径 + 百分比 + 非 Count；无渐变）。
 * Categories*（默认唯一值 Count，空值 = [Blank]）；可选 Measure + 聚合；
 * 非 Count 时负值剔除并提示；Inner/Outer Radius %；Show %；Hide % < 阈值（默认 5）。
 */
import { aggregateRows, aggregationLabel } from './aggregate'
import { TOOLTIP_DARK, buildLegend, buildTitle, displayVal, distinctInOrder, formatNumber, seriesColor } from './shared'
import type { BuildInput, BuildOutput, ChartOption } from '../types'

export function buildPieOption({ result, config, viewName }: BuildInput): BuildOutput {
  const warnings: string[] = []
  const cfg = config.configure
  const style = config.style
  const catField = cfg.categories?.field
  if (!catField) return { option: {}, warnings, seriesNames: [] }

  const rows = result.rows
  const measureField = cfg.measure?.field
  const agg = cfg.measure?.aggregation ?? (measureField ? 'sum' : 'count')
  const cats = distinctInOrder(rows, catField).map(displayVal)

  let droppedNeg = 0
  const data: ChartOption[] = []
  cats.forEach((cat, i) => {
    const subset = rows.filter((r) => displayVal(r[catField]) === cat)
    let value: number
    if (measureField) {
      const v = aggregateRows(subset, measureField, agg)
      if (v === null) return
      if (v < 0 && agg !== 'count') {
        droppedNeg += 1
        return
      }
      value = v
    } else {
      value = subset.filter((r) => r[catField] !== null).length
    }
    data.push({ name: cat, value, itemStyle: { color: seriesColor(style, cfg.palette, cat, i) } })
  })

  if (droppedNeg > 0) warnings.push(`已剔除 ${droppedNeg} 个负值扇区（Pie 不支持负值）`)

  const inner = Math.max(0, Math.min(95, style.pie?.innerRadiusPct ?? 0))
  const outer = Math.max(inner + 1, Math.min(100, style.pie?.outerRadiusPct ?? 72))
  const showPercent = style.pie?.showPercent ?? true
  const hideBelow = style.pie?.hideBelowPct ?? 5
  const percentColor = style.pie?.percentColor ?? '#ffffff'

  const seriesNames = data.map((d) => d.name as string)
  const total = data.reduce((a, d) => a + (d.value as number), 0)

  const option: ChartOption = {
    title: buildTitle(style, viewName ?? ''),
    tooltip: {
      ...TOOLTIP_DARK,
      trigger: 'item',
      formatter: (p: ChartOption) => {
        const dot = `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color};margin-right:6px"></span>`
        return `${dot}${p.name}: ${formatNumber(p.value)}（${p.percent}%）`
      },
    },
    legend: buildLegend(style, true),
    series: [
      {
        type: 'pie',
        name: measureField ? `${aggregationLabel(agg)} of ${measureField}` : 'Count',
        radius: [`${inner}%`, `${outer}%`],
        center: ['50%', '55%'],
        avoidLabelOverlap: true,
        itemStyle: { borderColor: '#fff', borderWidth: 1, opacity: style.opacity ?? 1 },
        label: showPercent
          ? {
              show: true,
              position: 'inside',
              color: percentColor,
              fontSize: 12,
              formatter: (p: ChartOption) => (p.percent >= hideBelow ? `${p.percent}%` : ''),
            }
          : { show: true, position: 'outside', formatter: '{b}', color: '#1d2939', fontSize: 12 },
        labelLine: { show: !showPercent },
        data,
      },
    ],
  }
  void total
  return { option, warnings, seriesNames }
}
