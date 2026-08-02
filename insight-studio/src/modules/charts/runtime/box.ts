import { ROW_ID_FIELD } from '../../../shared/types'
import { fiveNumber } from './aggregate'
import { dataMinOf, resolveAxis } from './axis'
import { AXIS_STYLE, baseLayout, displayVal, distinctInOrder, seriesColor, shapeFor, withRefLines } from './shared'
import { EMPTY_FIGURE, type BuildInput, type BuildOutput } from '../types'

export function buildBoxOption({ result, config, viewName }: BuildInput): BuildOutput {
  const warnings: string[] = []
  const cfg = config.configure
  const style = config.style
  const yField = cfg.y?.field
  if (!yField) return { option: EMPTY_FIGURE, warnings, seriesNames: [] }

  const rows = result.rows
  const xField = cfg.x?.field
  const colorField = cfg.color?.field
  const shapeField = cfg.shape?.field
  const cats = xField ? distinctInOrder(rows, xField).map(displayVal) : ['']
  const colorVals: (string | null)[] = colorField ? distinctInOrder(rows, colorField).map(displayVal) : [null]
  const shapeVals: (string | null)[] = shapeField ? distinctInOrder(rows, shapeField).map(displayVal) : [null]
  const seriesNames: string[] = []
  const data: Array<Record<string, unknown>> = []
  const allY: number[] = []
  const showPoints = style.box?.showPoints ?? 'outliers'

  // 单遍分组：color → cat → rows，替代每格 rows.filter 的 O(colors×cats×N)
  const groups = new Map<string, Map<string, typeof rows>>()
  for (const row of rows) {
    const ck = colorField ? displayVal(row[colorField]) : ''
    let byCat = groups.get(ck)
    if (!byCat) {
      byCat = new Map()
      groups.set(ck, byCat)
    }
    const xk = xField ? displayVal(row[xField]) : ''
    let arr = byCat.get(xk)
    if (!arr) {
      arr = []
      byCat.set(xk, arr)
    }
    arr.push(row)
  }

  colorVals.forEach((cv, ci) => {
    const name = cv ?? yField
    seriesNames.push(name)
    const color = style.box?.fillColor ?? seriesColor(style, cfg.palette, name, ci)
    const violin = style.box?.mode === 'violin'
    const q1: number[] = []
    const median: number[] = []
    const q3: number[] = []
    const lowerfence: number[] = []
    const upperfence: number[] = []
    const labels: string[] = []
    const ids: string[][] = []
    const violinY: number[] = []
    const violinX: string[] = []
    const violinIds: string[][] = []
    const pointGroups = new Map<string, { x: string[]; y: number[]; ids: string[][]; symbol: string }>()
    const byCat = groups.get(cv ?? '')
    for (const cat of cats) {
      const subset = byCat?.get(cat) ?? []
      const values = subset.map((row) => Number(row[yField])).filter(Number.isFinite)
      const stats = fiveNumber(values)
      if (!stats) continue
      labels.push(cat || name)
      q1.push(stats.q1)
      median.push(stats.q2)
      q3.push(stats.q3)
      lowerfence.push(stats.low)
      upperfence.push(stats.high)
      ids.push(subset.map((row) => String(row[ROW_ID_FIELD] ?? '')))
      allY.push(stats.low, stats.high, ...stats.outliers)
      if (violin) {
        for (const row of subset) {
          const value = Number(row[yField])
          if (!Number.isFinite(value)) continue
          violinX.push(cat || name)
          violinY.push(value)
          violinIds.push([String(row[ROW_ID_FIELD] ?? '')])
        }
        continue
      }
      if (showPoints === 'none') continue
      const outliers = new Set(stats.outliers)
      for (const row of subset) {
        const value = Number(row[yField])
        if (!Number.isFinite(value) || (showPoints === 'outliers' && !outliers.has(value))) continue
        const shape = shapeField ? displayVal(row[shapeField]) : ''
        const shapeIndex = shapeField ? shapeVals.indexOf(shape) : -1
        const key = shape
        const group = pointGroups.get(key) ?? { x: [], y: [], ids: [], symbol: shapeIndex >= 0 ? shapeFor(shapeIndex) : (style.box?.pointShape ?? 'circle') }
        group.x.push(cat || name)
        group.y.push(value)
        group.ids.push([String(row[ROW_ID_FIELD] ?? '')])
        pointGroups.set(key, group)
      }
    }
    if (violin) {
      data.push({
        type: 'violin',
        name,
        x: violinX,
        y: violinY,
        box: { visible: true },
        meanline: { visible: true },
        points: showPoints === 'none' ? false : showPoints === 'all' ? 'all' : 'outliers',
        marker: { color, opacity: style.opacity ?? 1 },
        line: { color: style.box?.lineColor ?? '#1d2939', width: style.box?.lineWidth ?? 1.5 },
        customdata: violinIds,
      })
      return
    }
    data.push({
      type: 'box',
      name,
      x: labels,
      q1,
      median,
      q3,
      lowerfence,
      upperfence,
      marker: { color, opacity: style.opacity ?? 1 },
      line: { color: style.box?.lineColor ?? '#1d2939', width: style.box?.lineWidth ?? 1.5 },
      boxpoints: false,
      boxmean: false,
      customdata: ids,
    })
    for (const group of pointGroups.values()) {
      data.push({
        type: 'scatter',
        mode: 'markers',
        name,
        x: group.x,
        y: group.y,
        marker: { color, symbol: group.symbol, size: style.box?.pointSize ?? 5, opacity: Math.min(1, (style.opacity ?? 1) + 0.1) },
        customdata: group.ids,
        showlegend: false,
      })
    }
  })

  return {
    option: {
      data,
      layout: withRefLines(
        {
          ...baseLayout(style, '', { legend: colorVals.length > 1 }),
          boxmode: 'group',
          xaxis: { ...AXIS_STYLE, type: 'category', title: { text: style.xAxis?.label ?? cfg.x?.label ?? xField ?? '', font: AXIS_STYLE.titlefont } },
          yaxis: { ...AXIS_STYLE, ...resolveAxis(style.yAxis, dataMinOf(allY), style.yAxis?.label ?? cfg.y?.label ?? yField, warnings, 'Y 轴') },
        },
        style,
      ),
    },
    warnings,
    seriesNames,
  }
}
