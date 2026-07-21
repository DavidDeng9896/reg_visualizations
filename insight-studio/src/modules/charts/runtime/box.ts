/**
 * Box option builder：自算五数（须 = 1.5×IQR 内最值）+ custom series 箱体渲染。
 * Color/Shape 分组（2B）；Show Points：全部 / 仅离群 / 不显示；Y 轴 Linear/Log；无 Jitter（4B）。
 * 误差棒：Box 无 Mean 聚合上下文，不提供（box-plots.md §1.5 产品默认）。
 */
import { fiveNumber } from './aggregate'
import { resolveAxis, dataMinOf } from './axis'
import {
  TOOLTIP_DARK,
  buildGrid,
  buildLegend,
  buildTitle,
  displayVal,
  distinctInOrder,
  formatNumber,
  seriesColor,
  shapeFor,
} from './shared'
import type { BuildInput, BuildOutput, ChartOption } from '../types'

interface BoxMeta {
  cat: string
  color?: string
  n: number
  low: number
  q1: number
  q2: number
  q3: number
  high: number
}

export function buildBoxOption({ result, config, viewName }: BuildInput): BuildOutput {
  const warnings: string[] = []
  const cfg = config.configure
  const style = config.style
  const yField = cfg.y?.field
  if (!yField) return { option: {}, warnings, seriesNames: [] }

  const rows = result.rows
  const xField = cfg.x?.field
  const colorField = cfg.color?.field
  const shapeField = cfg.shape?.field
  const cats: string[] = xField ? distinctInOrder(rows, xField).map(displayVal) : ['']
  const colorVals: (string | null)[] = colorField ? distinctInOrder(rows, colorField).map(displayVal) : [null]
  const shapeVals: (string | null)[] = shapeField ? distinctInOrder(rows, shapeField).map(displayVal) : [null]
  const nColors = colorVals.length
  const showPoints = style.box?.showPoints ?? 'outliers'
  const pointSize = style.box?.pointSize ?? 5
  const lineWidth = style.box?.lineWidth ?? 1.5
  const opacity = style.opacity ?? 1

  const seriesNames: string[] = []
  const boxData: ChartOption[] = []
  const pointSeries: ChartOption[] = []
  const allY: number[] = []

  // 颜色组 → 箱内点系列（按 shape 值再拆分）
  const pointBuckets = new Map<string, { color: string; symbol: string; name: string; data: ChartOption[] }>()

  cats.forEach((cat, ci) => {
    colorVals.forEach((cv, k) => {
      const subset = rows.filter(
        (r) =>
          (!xField || displayVal(r[xField]) === cat) && (cv === null || displayVal(r[colorField!]) === cv),
      )
      const vals = subset.map((r) => Number(r[yField])).filter((v) => Number.isFinite(v))
      if (!vals.length) return
      const stats = fiveNumber(vals)!
      const name = cv ?? yField
      if (!seriesNames.includes(name)) seriesNames.push(name)
      const color = style.box?.fillColor ?? seriesColor(style, cfg.palette, name, cv !== null ? k : 0)
      const lineColor = style.box?.lineColor ?? '#1d2939'
      const pos = ci + (k - (nColors - 1) / 2) * (0.7 / nColors)
      const meta: BoxMeta = { cat, color: cv ?? undefined, n: vals.length, ...stats }
      allY.push(stats.low, stats.high, ...stats.outliers)
      boxData.push({
        value: [pos, stats.low, stats.q1, stats.q2, stats.q3, stats.high, lineColor, color, lineWidth, nColors],
        meta,
        name,
      })

      // 点（全部 / 仅离群）
      if (showPoints !== 'none') {
        const outlierSet = new Set(stats.outliers)
        for (const r of subset) {
          const yv = Number(r[yField])
          if (!Number.isFinite(yv)) continue
          const isOut = outlierSet.has(yv)
          if (showPoints === 'outliers' && !isOut) continue
          const sv = shapeField ? displayVal(r[shapeField]) : null
          const key = `${cv ?? ''}__${sv ?? ''}`
          let bucket = pointBuckets.get(key)
          if (!bucket) {
            const shapeIdx = sv !== null ? shapeVals.indexOf(sv) : -1
            bucket = {
              color,
              symbol: shapeIdx >= 0 ? shapeFor(shapeIdx) : (style.box?.pointShape ?? 'circle'),
              name,
              data: [],
            }
            pointBuckets.set(key, bucket)
          }
          bucket.data.push({ value: [pos, yv], meta: { y: yv, cat, color: cv ?? undefined, outlier: isOut }, name })
        }
      }
    })
  })

  for (const bucket of pointBuckets.values()) {
    pointSeries.push({
      type: 'scatter',
      name: bucket.name,
      data: bucket.data,
      symbol: bucket.symbol,
      symbolSize: pointSize,
      itemStyle: { color: bucket.color, opacity: Math.min(1, opacity + 0.1) },
      legendHoverLink: false,
    })
  }

  const boxSeries: ChartOption = {
    type: 'custom',
    name: 'box',
    data: boxData,
    renderItem: (_params: unknown, api: ChartOption) => {
      const pos = api.value(0)
      const low = api.value(1)
      const q1 = api.value(2)
      const q2 = api.value(3)
      const q3 = api.value(4)
      const high = api.value(5)
      const stroke = api.value(6)
      const fill = api.value(7)
      const lw = api.value(8)
      const nCol = Number(api.value(9)) || 1
      const bandPx = api.size([1, 0])[0]
      const half = Math.min(bandPx * (0.28 / nCol), 40)
      const pLow = api.coord([pos, low])
      const pQ1 = api.coord([pos, q1])
      const pQ2 = api.coord([pos, q2])
      const pQ3 = api.coord([pos, q3])
      const pHigh = api.coord([pos, high])
      const line = (x1: number, y1: number, x2: number, y2: number, width = lw) => ({
        type: 'line',
        shape: { x1, y1, x2, y2 },
        style: { stroke, lineWidth: width },
      })
      return {
        type: 'group',
        children: [
          {
            type: 'rect',
            shape: { x: pQ3[0] - half, y: pQ3[1], width: half * 2, height: Math.max(1, pQ1[1] - pQ3[1]) },
            style: { fill, stroke, lineWidth: lw, opacity: 0.9 },
          },
          line(pQ2[0] - half, pQ2[1], pQ2[0] + half, pQ2[1], lw + 0.5),
          line(pLow[0], pLow[1], pQ1[0], pQ1[1]),
          line(pHigh[0], pHigh[1], pQ3[0], pQ3[1]),
          line(pLow[0] - half / 2, pLow[1], pLow[0] + half / 2, pLow[1]),
          line(pHigh[0] - half / 2, pHigh[1], pHigh[0] + half / 2, pHigh[1]),
        ],
      }
    },
  }

  const yAxisResolved = resolveAxis(style.yAxis, dataMinOf(allY), style.yAxis?.label ?? cfg.y?.label ?? yField, warnings, 'Y 轴')
  const xLabel = style.xAxis?.label ?? cfg.x?.label ?? (xField ?? '')

  const tooltipFormatter = (p: ChartOption) => {
    const dot = `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color};margin-right:6px"></span>`
    if (p.seriesType === 'custom') {
      const m = p.data?.meta as BoxMeta
      const head = m.cat ? `${m.color ? `${m.color} · ` : ''}${m.cat}` : (m.color ?? yField)
      return [
        `${dot}<b>${head}</b>`,
        `Max (whisker): ${formatNumber(m.high)}`,
        `Q3: ${formatNumber(m.q3)}`,
        `Median: ${formatNumber(m.q2)}`,
        `Q1: ${formatNumber(m.q1)}`,
        `Min (whisker): ${formatNumber(m.low)}`,
        `n = ${m.n}`,
      ].join('<br/>')
    }
    const meta = p.data?.meta as { y: number; cat: string; color?: string; outlier: boolean }
    return `${dot}${meta.cat ? `${meta.cat} · ` : ''}${yField}: ${formatNumber(meta.y)}${meta.outlier ? '（离群）' : ''}`
  }

  const option: ChartOption = {
    title: buildTitle(style, viewName ?? ''),
    tooltip: { ...TOOLTIP_DARK, trigger: 'item', formatter: tooltipFormatter },
    legend: buildLegend(style, colorVals.length > 1),
    grid: buildGrid(style),
    xAxis: { type: 'category', data: cats, name: xLabel, nameGap: 28, axisLabel: { color: '#667085' } },
    yAxis: { ...yAxisResolved, axisLabel: { color: '#667085' }, splitLine: { show: true, lineStyle: { color: '#eef1f5' } } },
    series: [boxSeries, ...pointSeries],
  }
  return { option, warnings, seriesNames }
}
