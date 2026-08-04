import type { FieldMapping, Row } from '../../../shared/types'
import { ROW_ID_FIELD } from '../../../shared/types'
import { parseDateLike } from '../../../shared/datetime'
import { aggregateRows, aggregationLabel } from './aggregate'
import { dataMinOf, resolveAxis } from './axis'
import { AXIS_NO_GRID_STYLE, AXIS_STYLE, baseLayout, columnType, displayVal, distinctInOrder, seriesColor, withRefLines, ciBandTraces, fitAnnotations } from './shared'
import { runFit, equationOf, type FitInputPoint } from '../fit/engine'
import { summarizeFit, type FitGroupSummary } from '../fit/summary'
import { flagSetOf } from '../flags'
import { EMPTY_FIGURE, type BuildInput, type BuildOutput } from '../types'

type XKind = 'linear' | 'date' | 'category'
interface FitJob {
  name: string
  color: string
  xaxis: string
  yaxis: string
  logY: boolean
  points: FitInputPoint[]
}

function xValue(row: Row, field: string, kind: XKind): number | string | null {
  if (kind === 'category') return displayVal(row[field])
  if (kind === 'date') return parseDateLike(row[field])
  const value = Number(row[field])
  return Number.isFinite(value) ? value : null
}

export function buildLineOption({ result, config, viewName, flags }: BuildInput): BuildOutput {
  const warnings: string[] = []
  const cfg = config.configure
  const style = config.style
  const xField = cfg.x?.field
  const measures: FieldMapping[] = cfg.values?.length ? cfg.values : cfg.y ? [cfg.y] : []
  if (!xField || !measures.length) return { option: EMPTY_FIGURE, warnings, seriesNames: [] }

  const rows = result.rows
  const seriesField = cfg.series?.field
  const seriesVals = seriesField ? distinctInOrder(rows, seriesField).map(displayVal) : [null]
  // 单遍分组：series → rows，替代每系列 rows.filter 的 O(measures×series×N)
  const seriesGroups = new Map<string, Row[]>()
  if (seriesField) {
    for (const r of rows) {
      const sk = displayVal(r[seriesField])
      let arr = seriesGroups.get(sk)
      if (!arr) {
        arr = []
        seriesGroups.set(sk, arr)
      }
      arr.push(r)
    }
  }
  const kind: XKind =
    columnType(result.columns, xField) === 'number'
      ? 'linear'
      : columnType(result.columns, xField) === 'date' || columnType(result.columns, xField) === 'datetime'
        ? 'date'
        : 'category'
  const facet = style.line?.facet === 'per-measure' && measures.length > 1
  const useRight = measures.some((m) => m.axis?.side === 'right')
  const flagSet = flagSetOf(flags)
  const seriesNames: string[] = []
  const data: Array<Record<string, unknown>> = []
  const jobs: FitJob[] = []
  const allY: number[] = []
  const measureLabel = (m: FieldMapping) =>
    m.aggregation && m.aggregation !== 'none' ? `${aggregationLabel(m.aggregation)} of ${m.field}` : m.field

  measures.forEach((measure, mi) => {
    seriesVals.forEach((sv) => {
      const label = measureLabel(measure)
      const name = sv === null ? label : measures.length > 1 ? `${label} · ${sv}` : sv
      const idx = seriesNames.length
      seriesNames.push(name)
      const color =
        seriesField || measures.length > 1
          ? seriesColor(style, cfg.palette, name, idx)
          : (style.line?.defaultColor ?? seriesColor(style, cfg.palette, name, idx))
      const subset = seriesField ? (seriesGroups.get(sv ?? '') ?? []) : rows
      const agg = measure.aggregation ?? 'none'
      const points: Array<[number | string, number]> = []
      const customdata: string[][] = []
      const fitPoints: FitInputPoint[] = []

      if (agg === 'none') {
        for (const row of subset) {
          const x = xValue(row, xField, kind)
          const y = Number(row[measure.field])
          if (x === null || !Number.isFinite(y)) continue
          const rowId = String(row[ROW_ID_FIELD] ?? '')
          points.push([x, y])
          customdata.push(rowId ? [rowId] : [])
          allY.push(y)
          if (kind !== 'category') fitPoints.push({ x: Number(x), y, rowId, flagged: !!rowId && flagSet.has(rowId), weight: 1 })
        }
      } else {
        const buckets = new Map<string, Row[]>()
        for (const row of subset) {
          const x = xValue(row, xField, kind)
          if (x === null) continue
          const key = String(x)
          buckets.set(key, [...(buckets.get(key) ?? []), row])
        }
        for (const [key, bucket] of buckets) {
          const y = aggregateRows(bucket, measure.field, agg)
          if (y === null) continue
          const x = kind === 'category' ? key : Number(key)
          const ids = bucket.map((row) => String(row[ROW_ID_FIELD] ?? ''))
          points.push([x, y])
          customdata.push(ids)
          allY.push(y)
          if (kind !== 'category') fitPoints.push({ x: Number(x), y, flagged: ids.length > 0 && ids.every((id) => flagSet.has(id)), weight: 1 })
        }
      }
      if (kind !== 'category') {
        const order = points.map((_, i) => i).sort((a, b) => Number(points[a][0]) - Number(points[b][0]))
        points.splice(0, points.length, ...order.map((i) => points[i]))
        customdata.splice(0, customdata.length, ...order.map((i) => customdata[i]))
      }

      const grid = facet ? mi + 1 : 1
      const right = measure.axis?.side === 'right'
      const xaxis = grid === 1 ? 'x' : `x${grid}`
      const yIndex = facet ? mi * 2 + (right ? 2 : 1) : right ? 2 : 1
      const yaxis = yIndex === 1 ? 'y' : `y${yIndex}`
      data.push({
        type: 'scatter',
        mode: 'lines+markers',
        name,
        x: points.map((p) => p[0]),
        y: points.map((p) => p[1]),
        xaxis,
        yaxis,
        line: { color, width: 2 },
        marker: { color, size: 6, symbol: style.line?.pointShape ?? 'circle', opacity: style.opacity ?? 1 },
        customdata,
      })
      if (cfg.regression?.model !== 'none' && fitPoints.length) {
        const ySpec = right ? style.yAxisRight : style.yAxis
        jobs.push({ name, color, xaxis, yaxis, logY: ySpec?.scale === 'log' && Math.min(...fitPoints.map((p) => p.y)) > 0, points: fitPoints })
      }
    })
  })

  const fits: FitGroupSummary[] = []
  const shapes: Array<Record<string, unknown>> = []
  const annotationItems: Array<{ name: string; equation: string; r2: number | null }> = []
  if (cfg.regression && cfg.regression.model !== 'none') {
    if (kind === 'category') warnings.push('拟合需要数值或时间 X 轴，当前为分类轴，未绘制拟合线')
    else {
      for (const job of jobs) {
        const fit = runFit(job.points, cfg.regression, { logX: false, logY: job.logY })
        warnings.push(...fit.warnings.map((w) => (jobs.length > 1 ? `[${job.name}] ${w}` : w)))
        if (!fit.ok) continue
        fits.push(summarizeFit(jobs.length > 1 ? job.name : '', fit, job.points))
        // 95% 置信带画在拟合线下层（Linear/Quadratic，引擎已产出 ciBand）
        for (const band of ciBandTraces(fit, job.color, job.xaxis, job.yaxis)) data.push(band)
        data.push({
          type: 'scatter',
          mode: 'lines',
          name: `${job.name} · fit`,
          x: fit.curve.map((p) => p.x),
          y: fit.curve.map((p) => p.y),
          xaxis: job.xaxis,
          yaxis: job.yaxis,
          line: { color: job.color, width: 2, dash: style.fitLineStyle ?? 'solid' },
          showlegend: false,
        })
        annotationItems.push({ name: job.name, equation: equationOf(fit), r2: fit.r2 })
        if (cfg.regression.showAsymptotes && fit.params?.kind === '4pl') {
          for (const y of [fit.params.min, fit.params.max]) {
            shapes.push({ type: 'line', xref: `${job.xaxis} domain`, yref: job.yaxis, x0: 0, x1: 1, y0: y, y1: y, line: { color: '#98a2b3', dash: 'dot', width: 1 } })
          }
        }
      }
    }
  }

  const flagged = rows.filter((row) => flagSet.has(String(row[ROW_ID_FIELD] ?? '')))
  measures.forEach((measure, mi) => {
    const pts = flagged.flatMap((row) => {
      const x = xValue(row, xField, kind)
      const y = Number(row[measure.field])
      return x === null || !Number.isFinite(y) ? [] : [{ x, y, id: String(row[ROW_ID_FIELD]) }]
    })
    if (!pts.length) return
    const right = measure.axis?.side === 'right'
    const grid = facet ? mi + 1 : 1
    const yIndex = facet ? mi * 2 + (right ? 2 : 1) : right ? 2 : 1
    data.push({
      type: 'scatter',
      mode: 'markers',
      name: 'Flagged',
      x: pts.map((p) => p.x),
      y: pts.map((p) => p.y),
      xaxis: grid === 1 ? 'x' : `x${grid}`,
      yaxis: yIndex === 1 ? 'y' : `y${yIndex}`,
      marker: { symbol: 'x', color: '#d92d20', size: 11 },
      customdata: pts.map((p) => [p.id]),
      showlegend: false,
    })
  })

  const layout: Record<string, unknown> = withRefLines({
    ...baseLayout(style, '', { legend: seriesNames.length > 1, legendItemCount: seriesNames.length }),
    shapes,
  }, style)
  if (style.fitAnnotation && annotationItems.length) {
    layout.annotations = [...(Array.isArray(layout.annotations) ? (layout.annotations as unknown[]) : []), ...fitAnnotations(annotationItems)]
  }
  const xLabel = style.xAxis?.label ?? cfg.x?.label ?? xField
  const leftLabel = style.yAxis?.label ?? (measures.length === 1 ? measureLabel(measures[0]) : undefined)
  const rightLabel = style.yAxisRight?.label
  const leftAxis = { ...AXIS_STYLE, ...resolveAxis(style.yAxis, dataMinOf(allY), leftLabel, warnings, 'Y 轴(左)') }
  const rightAxis = { ...AXIS_STYLE, ...resolveAxis(style.yAxisRight, dataMinOf(allY), rightLabel, warnings, 'Y 轴(右)'), overlaying: 'y', side: 'right' }
  for (let i = 0; i < (facet ? measures.length : 1); i += 1) {
    const suffix = i === 0 ? '' : String(i + 1)
    const domain: [number, number] = facet ? [1 - (i + 1) / measures.length + 0.04, 1 - i / measures.length - 0.04] : [0, 1]
    layout[`xaxis${suffix}`] = { ...(kind === 'category' ? AXIS_NO_GRID_STYLE : AXIS_STYLE), type: kind, title: { text: i === measures.length - 1 ? xLabel : undefined, font: AXIS_STYLE.titlefont }, domain, anchor: `y${i === 0 ? '' : i * 2 + 1}` }
    layout[`yaxis${i === 0 ? '' : i * 2 + 1}`] = { ...leftAxis, domain, anchor: `x${suffix}` }
    if (useRight) layout[`yaxis${i * 2 + 2}`] = { ...rightAxis, domain, anchor: `x${suffix}`, overlaying: facet ? `y${i === 0 ? '' : i * 2 + 1}` : 'y' }
  }
  return { option: { data, layout }, warnings, seriesNames, fits: fits.length ? fits : undefined }
}
