/**
 * Big number option builder：大号指标数字（KPI / 阶段计数）。
 * 两种映射：
 * 1. Metrics（values[]）：每个度量一个数字（宽表多列）
 * 2. Categories（+ 可选 Measure）：每个类别一个数字（长表，如 stage）
 * 渲染为 Plotly indicator（mode: number），多指标用 domain 分栏。
 */
import type { Aggregation, FieldMapping, Row } from '../../../shared/types'
import { aggregateRows, aggregationLabel } from './aggregate'
import { baseLayout, displayVal, distinctInOrder, seriesColor } from './shared'
import { EMPTY_FIGURE, type BuildInput, type BuildOutput } from '../types'

interface MetricItem {
  name: string
  value: number
}

function metricDomains(
  n: number,
  layout: 'row' | 'grid',
): Array<{ x: [number, number]; y: [number, number] }> {
  if (n <= 0) return []
  const gap = 0.02
  if (layout === 'row' || n === 1) {
    const w = 1 / n
    return Array.from({ length: n }, (_, i) => ({
      x: [i * w + gap / 2, (i + 1) * w - gap / 2] as [number, number],
      y: [0.05, 0.95] as [number, number],
    }))
  }
  const cols = n <= 4 ? 2 : 3
  const rows = Math.ceil(n / cols)
  const cw = 1 / cols
  const rh = 1 / rows
  return Array.from({ length: n }, (_, i) => {
    const c = i % cols
    const r = Math.floor(i / cols)
    // Plotly y 自下而上
    const rowFromBottom = rows - 1 - r
    return {
      x: [c * cw + gap / 2, (c + 1) * cw - gap / 2] as [number, number],
      y: [rowFromBottom * rh + gap / 2, (rowFromBottom + 1) * rh - gap / 2] as [number, number],
    }
  })
}

function fromValues(rows: Row[], mappings: FieldMapping[]): MetricItem[] {
  const out: MetricItem[] = []
  for (const m of mappings) {
    if (!m.field) continue
    const agg: Aggregation = m.aggregation ?? 'sum'
    const v = aggregateRows(rows, m.field, agg)
    const name = m.label?.trim() || (agg === 'none' ? m.field : `${aggregationLabel(agg)} of ${m.field}`)
    out.push({ name, value: v ?? 0 })
  }
  return out
}

function fromCategories(
  rows: Row[],
  catField: string,
  measure: FieldMapping | undefined,
): MetricItem[] {
  const cats = distinctInOrder(rows, catField).map(displayVal)
  const measureField = measure?.field
  const agg: Aggregation = measure?.aggregation ?? (measureField ? 'sum' : 'count')
  const groups = new Map<string, Row[]>()
  for (const r of rows) {
    const ck = displayVal(r[catField])
    let arr = groups.get(ck)
    if (!arr) {
      arr = []
      groups.set(ck, arr)
    }
    arr.push(r)
  }
  return cats.map((cat) => {
    const subset = groups.get(cat) ?? []
    let value: number
    if (measureField) {
      value = aggregateRows(subset, measureField, agg) ?? 0
    } else {
      value = subset.filter((r) => r[catField] !== null).length
    }
    return { name: cat, value }
  })
}

export function buildBignumberOption({ result, config, viewName }: BuildInput): BuildOutput {
  const warnings: string[] = []
  const cfg = config.configure
  const style = config.style
  const bn = style.bignumber ?? {}
  const values = cfg.values ?? []
  const catField = cfg.categories?.field

  let metrics: MetricItem[] = []
  if (values.length > 0) {
    metrics = fromValues(result.rows, values)
  } else if (catField) {
    metrics = fromCategories(result.rows, catField, cfg.measure)
  } else {
    return { option: EMPTY_FIGURE, warnings, seriesNames: [] }
  }

  if (!metrics.length) return { option: EMPTY_FIGURE, warnings, seriesNames: [] }

  const layoutMode: 'row' | 'grid' = bn.layout ?? 'row'
  const domains = metricDomains(metrics.length, layoutMode)
  const valueFontSize = bn.valueFontSize ?? 42
  const labelFontSize = bn.labelFontSize ?? 13
  const showLabel = bn.showLabel !== false
  const compact = !!bn.compact

  const data = metrics.map((m, i) => {
    const color = seriesColor(style, cfg.palette, m.name, i)
    const legendLabel = style.legend?.labels?.[m.name] ?? m.name
    return {
      type: 'indicator',
      mode: 'number',
      value: m.value,
      name: m.name,
      title: showLabel
        ? { text: legendLabel, font: { size: labelFontSize, color: '#667085' } }
        : undefined,
      number: {
        font: { size: valueFontSize, color },
        valueformat: compact ? '~s' : ',.0f',
      },
      domain: domains[i],
      hovertemplate: `${legendLabel}: %{value}<extra></extra>`,
    }
  })

  const option = {
    data,
    layout: {
      ...baseLayout(style, viewName ?? '', { legend: false }),
      // indicator 不需要坐标轴
      xaxis: { visible: false },
      yaxis: { visible: false },
    },
  }

  return { option, warnings, seriesNames: metrics.map((m) => m.name) }
}
