/**
 * Pie option builder（8B：环形内径 + 百分比 + 非 Count；无渐变）。
 * Categories*（默认唯一值 Count，空值 = [Blank]）；可选 Measure + 聚合；
 * 非 Count 时负值剔除并提示；Inner/Outer Radius %；Show %；Hide % < 阈值（默认 5）。
 */
import { aggregateRows, aggregationLabel } from './aggregate'
import { baseLayout, displayVal, distinctInOrder, seriesColor } from './shared'
import { EMPTY_FIGURE, type BuildInput, type BuildOutput } from '../types'

export function buildPieOption({ result, config, viewName }: BuildInput): BuildOutput {
  const warnings: string[] = []
  const cfg = config.configure
  const style = config.style
  const catField = cfg.categories?.field
  if (!catField) return { option: EMPTY_FIGURE, warnings, seriesNames: [] }

  const rows = result.rows
  const measureField = cfg.measure?.field
  const agg = cfg.measure?.aggregation ?? (measureField ? 'sum' : 'count')
  const cats = distinctInOrder(rows, catField).map(displayVal)

  // 单遍分组：cat → rows，替代每类 rows.filter 的 O(cats×N)
  const groups = new Map<string, typeof rows>()
  for (const r of rows) {
    const ck = displayVal(r[catField])
    let arr = groups.get(ck)
    if (!arr) {
      arr = []
      groups.set(ck, arr)
    }
    arr.push(r)
  }

  let droppedNeg = 0
  const labels: string[] = []
  const values: number[] = []
  const colors: string[] = []
  cats.forEach((cat, i) => {
    const subset = groups.get(cat) ?? []
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
    labels.push(cat)
    values.push(value)
    colors.push(seriesColor(style, cfg.palette, cat, i))
  })

  if (droppedNeg > 0) warnings.push(`已剔除 ${droppedNeg} 个负值扇区（Pie 不支持负值）`)

  const inner = Math.max(0, Math.min(95, style.pie?.innerRadiusPct ?? 0))
  const outer = Math.max(inner + 1, Math.min(100, style.pie?.outerRadiusPct ?? 72))
  const showPercent = style.pie?.showPercent ?? true
  const hideBelow = style.pie?.hideBelowPct ?? 5
  const percentColor = style.pie?.percentColor ?? '#ffffff'

  const total = values.reduce((a, b) => a + b, 0)
  const text = values.map((value) => {
    const pct = total ? (value / total) * 100 : 0
    return showPercent && pct >= hideBelow ? `${Number(pct.toFixed(1))}%` : ''
  })
  const option = {
    data: [
      {
        type: 'pie',
        name: measureField ? `${aggregationLabel(agg)} of ${measureField}` : 'Count',
        labels,
        values,
        marker: { colors, line: { color: '#ffffff', width: 1 } },
        opacity: style.opacity ?? 1,
        hole: inner / 100,
        domain: { x: [(100 - outer) / 200, 1 - (100 - outer) / 200], y: [(100 - outer) / 200, 1 - (100 - outer) / 200] },
        text,
        textinfo: showPercent ? 'text' : 'label',
        textposition: showPercent ? 'inside' : 'outside',
        textfont: { color: showPercent ? percentColor : '#1d2939', size: 12 },
        hovertemplate: '%{label}: %{value}<br>%{percent}<extra></extra>',
      },
    ],
    layout: baseLayout(style, '', { legend: true }),
  }
  return { option, warnings, seriesNames: labels }
}
