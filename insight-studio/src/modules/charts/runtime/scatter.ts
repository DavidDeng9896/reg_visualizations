import type { FieldMapping, Row } from '../../../shared/types'
import { ROW_ID_FIELD } from '../../../shared/types'
import { aggregateRows, aggregationLabel, errorValue, numericValues } from './aggregate'
import { dataMinOf, resolveAxis } from './axis'
import { AXIS_STYLE, baseLayout, displayVal, distinctInOrder, plotlyError, plotlySymbol, seriesColor, shapeFor, stableRandom, withRefLines, ciBandTraces, fitAnnotations } from './shared'
import { runFit, equationOf, type FitInputPoint } from '../fit/engine'
import { summarizeFit, type FitGroupSummary } from '../fit/summary'
import { flagSetOf } from '../flags'
import { EMPTY_FIGURE, type BuildInput, type BuildOutput } from '../types'

interface FitJob {
  name: string
  color: string
  xaxis: string
  yaxis: string
  points: FitInputPoint[]
  logY: boolean
}

export function buildScatterOption({ result, config, viewName, flags }: BuildInput): BuildOutput {
  const warnings: string[] = []
  const cfg = config.configure
  const style = config.style
  const xField = cfg.x?.field
  const measures: FieldMapping[] = cfg.values?.length ? cfg.values : cfg.y ? [cfg.y] : []
  if (!xField || !measures.length) return { option: EMPTY_FIGURE, warnings, seriesNames: [] }

  const rows = result.rows
  const colorField = cfg.color?.field
  const shapeField = cfg.shape?.field
  const sizeField = cfg.size?.field
  const colorVals: (string | null)[] = colorField ? distinctInOrder(rows, colorField).map(displayVal) : [null]
  const shapeVals: (string | null)[] = shapeField ? distinctInOrder(rows, shapeField).map(displayVal) : [null]
  const facet = style.scatter?.facet === 'per-measure' && measures.length > 1
  const flagSet = flagSetOf(flags)
  const xAll = numericValues(rows, xField)
  const yAll = measures.flatMap((m) => numericValues(rows, m.field))
  // 大数组禁用 spread（栈上限风险），循环求 min/max
  const rangeOf = (vals: number[]): number => {
    if (!vals.length) return 1
    let lo = Infinity
    let hi = -Infinity
    for (const v of vals) {
      if (v < lo) lo = v
      if (v > hi) hi = v
    }
    return hi - lo
  }
  const xRange = rangeOf(xAll)
  const yRange = rangeOf(yAll)
  const sizeVals = sizeField ? numericValues(rows, sizeField) : []
  const sizeDomain: [number, number] = sizeVals.length
    ? (() => {
        let lo = Infinity
        let hi = -Infinity
        for (const v of sizeVals) {
          if (v < lo) lo = v
          if (v > hi) hi = v
        }
        return [lo, hi] as [number, number]
      })()
    : [0, 1]
  const sizeOf = (value: number) => {
    const [lo, hi] = sizeDomain
    const min = style.scatter?.sizeMin ?? 4
    const max = style.scatter?.sizeMax ?? 24
    return hi === lo ? (min + max) / 2 : min + ((value - lo) / (hi - lo)) * (max - min)
  }
  const labelOf = (m: FieldMapping) =>
    m.aggregation && m.aggregation !== 'none' ? `${aggregationLabel(m.aggregation)} of ${m.field}` : m.field

  const data: Array<Record<string, unknown>> = []
  const seriesNames: string[] = []
  const jobs: FitJob[] = []
  const flaggedByAxis = new Map<string, Array<{ x: number; y: number; id: string }>>()
  let dropped = 0

  // 单遍分组：color|shape → rows，替代每格 rows.filter 的 O(colors×shapes×N)
  const groupKeyOf = (row: (typeof rows)[number]): string =>
    `${colorField ? displayVal(row[colorField]) : ''}\u0001${shapeField ? displayVal(row[shapeField]) : ''}`
  const scatterGroups = new Map<string, typeof rows>()
  if (colorField || shapeField) {
    for (const row of rows) {
      const key = groupKeyOf(row)
      let arr = scatterGroups.get(key)
      if (!arr) {
        arr = []
        scatterGroups.set(key, arr)
      }
      arr.push(row)
    }
  }

  measures.forEach((measure, mi) => {
    const right = measure.axis?.side === 'right'
    const grid = facet ? mi + 1 : 1
    const yIndex = facet ? mi * 2 + (right ? 2 : 1) : right ? 2 : 1
    const xaxis = grid === 1 ? 'x' : `x${grid}`
    const yaxis = yIndex === 1 ? 'y' : `y${yIndex}`
    colorVals.forEach((cv) => {
      shapeVals.forEach((sv, si) => {
        const subset =
          colorField || shapeField
            ? (scatterGroups.get(`${cv ?? ''}\u0001${sv ?? ''}`) ?? [])
            : rows
        if (!subset.length) return
        const group = cv !== null && sv !== null ? `${cv} · ${sv}` : cv ?? sv
        const name = measures.length > 1 ? (group ? `${labelOf(measure)} · ${group}` : labelOf(measure)) : (group ?? labelOf(measure))
        const color = seriesColor(style, cfg.palette, name, colorField && cv !== null ? colorVals.indexOf(cv) : seriesNames.length)
        const symbol = shapeField && sv !== null ? shapeFor(si) : plotlySymbol(style.scatter?.pointShape ?? 'circle')
        const agg = measure.aggregation ?? 'none'
        const points: Array<{ x: number; y: number; ids: string[]; size?: number; error?: number | null }> = []
        const fitPoints: FitInputPoint[] = []
        if (agg === 'none') {
          subset.forEach((row, i) => {
            const originalX = Number(row[xField])
            const originalY = Number(row[measure.field])
            if (!Number.isFinite(originalX) || !Number.isFinite(originalY)) {
              dropped += 1
              return
            }
            const id = String(row[ROW_ID_FIELD] ?? '')
            const jitter = !!style.scatter?.jitter
            const strength = style.scatter?.jitterStrength ?? 0.4
            const x = jitter ? originalX + (stableRandom(i * 2 + 1) - 0.5) * 0.02 * strength * (xRange || 1) : originalX
            const y = jitter ? originalY + (stableRandom(i * 2 + 2) - 0.5) * 0.02 * strength * (yRange || 1) : originalY
            const size = sizeField ? sizeOf(Number(row[sizeField])) : undefined
            points.push({ x, y, ids: id ? [id] : [], size })
            fitPoints.push({ x: originalX, y: originalY, rowId: id, flagged: !!id && flagSet.has(id), weight: 1 })
            if (id && flagSet.has(id)) {
              const key = `${xaxis}:${yaxis}`
              flaggedByAxis.set(key, [...(flaggedByAxis.get(key) ?? []), { x: originalX, y: originalY, id }])
            }
          })
        } else {
          const buckets = new Map<number, Row[]>()
          for (const row of subset) {
            const x = Number(row[xField])
            if (Number.isFinite(x)) buckets.set(x, [...(buckets.get(x) ?? []), row])
          }
          for (const [x, bucket] of buckets) {
            const y = aggregateRows(bucket, measure.field, agg)
            if (y === null) continue
            const ids = bucket.map((row) => String(row[ROW_ID_FIELD] ?? ''))
            const error = cfg.errorBars !== 'none' ? errorValue(numericValues(bucket, measure.field), cfg.errorBars ?? 'none') : null
            points.push({ x, y, ids, error })
            fitPoints.push({ x, y, flagged: ids.length > 0 && ids.every((id) => flagSet.has(id)), weight: 1 })
          }
        }
        seriesNames.push(name)
        const trace: Record<string, unknown> = {
          type: 'scatter',
          mode: 'markers',
          name,
          x: points.map((p) => p.x),
          y: points.map((p) => p.y),
          xaxis,
          yaxis,
          marker: {
            color,
            symbol,
            size: sizeField ? points.map((p) => p.size ?? style.scatter?.pointSize ?? 8) : style.scatter?.pointSize ?? 8,
            opacity: style.opacity ?? 1,
          },
          customdata: points.map((p) => p.ids),
        }
        if (points.some((p) => p.error != null)) trace.error_y = plotlyError(points.map((p) => p.y), points.map((p) => p.error ?? null), color)
        data.push(trace)
        if (fitPoints.length) jobs.push({ name, color, xaxis, yaxis, points: fitPoints, logY: (right ? style.yAxisRight : style.yAxis)?.scale === 'log' && Math.min(...fitPoints.map((p) => p.y)) > 0 })
      })
    })
  })
  if (dropped) warnings.push(`已忽略 ${dropped} 个非数值点`)
  if (cfg.errorBars !== 'none' && !measures.some((m) => (m.aggregation ?? 'none') === 'mean')) warnings.push('误差棒仅在聚合为 Average(mean) 时生效')

  const fits: FitGroupSummary[] = []
  const shapes: Array<Record<string, unknown>> = []
  const annotationItems: Array<{ name: string; equation: string; r2: number | null }> = []
  if (cfg.regression && cfg.regression.model !== 'none') {
    for (const job of jobs) {
      const fit = runFit(job.points, cfg.regression, { logX: style.xAxis?.scale === 'log' && dataMinOf(xAll) > 0, logY: job.logY })
      warnings.push(...fit.warnings.map((w) => (jobs.length > 1 ? `[${job.name}] ${w}` : w)))
      if (!fit.ok) continue
      fits.push(summarizeFit(jobs.length > 1 ? job.name : '', fit, job.points))
      // 95% 置信带画在拟合线下层（Linear/Quadratic，引擎已产出 ciBand）
      for (const band of ciBandTraces(fit, job.color, job.xaxis, job.yaxis)) data.push(band)
      data.push({
        type: 'scatter', mode: 'lines', name: `${job.name} · fit`,
        x: fit.curve.map((p) => p.x), y: fit.curve.map((p) => p.y), xaxis: job.xaxis, yaxis: job.yaxis,
        line: { color: job.color, width: 2, dash: style.fitLineStyle ?? 'solid' }, showlegend: false,
      })
      annotationItems.push({ name: job.name, equation: equationOf(fit), r2: fit.r2 })
      if (cfg.regression.showAsymptotes && fit.params?.kind === '4pl') {
        for (const y of [fit.params.min, fit.params.max]) shapes.push({ type: 'line', xref: `${job.xaxis} domain`, yref: job.yaxis, x0: 0, x1: 1, y0: y, y1: y, line: { color: '#98a2b3', dash: 'dot', width: 1 } })
      }
    }
  }
  for (const [key, points] of flaggedByAxis) {
    const [xaxis, yaxis] = key.split(':')
    data.push({ type: 'scatter', mode: 'markers', name: 'Flagged', x: points.map((p) => p.x), y: points.map((p) => p.y), xaxis, yaxis, marker: { symbol: 'x', color: '#d92d20', size: 11 }, customdata: points.map((p) => [p.id]), showlegend: false })
  }

  const layout: Record<string, unknown> = withRefLines({
    ...baseLayout(style, '', { legend: seriesNames.length > 1, legendItemCount: seriesNames.length }),
    shapes,
  }, style)
  if (style.fitAnnotation && annotationItems.length) {
    layout.annotations = [...(Array.isArray(layout.annotations) ? (layout.annotations as unknown[]) : []), ...fitAnnotations(annotationItems)]
  }
  const useRight = measures.some((m) => m.axis?.side === 'right')
  for (let i = 0; i < (facet ? measures.length : 1); i += 1) {
    const suffix = i === 0 ? '' : String(i + 1)
    const domain: [number, number] = facet ? [1 - (i + 1) / measures.length + 0.04, 1 - i / measures.length - 0.04] : [0, 1]
    layout[`xaxis${suffix}`] = { ...AXIS_STYLE, ...resolveAxis(style.xAxis, dataMinOf(xAll), style.xAxis?.label ?? cfg.x?.label ?? xField, warnings, 'X 轴', 'x'), domain }
    layout[`yaxis${i === 0 ? '' : i * 2 + 1}`] = { ...AXIS_STYLE, ...resolveAxis(style.yAxis, dataMinOf(yAll), style.yAxis?.label ?? (measures.length === 1 ? labelOf(measures[0]) : undefined), warnings, 'Y 轴(左)'), domain }
    if (useRight) layout[`yaxis${i * 2 + 2}`] = { ...AXIS_STYLE, ...resolveAxis(style.yAxisRight, dataMinOf(yAll), style.yAxisRight?.label, warnings, 'Y 轴(右)'), domain, overlaying: i === 0 ? 'y' : `y${i * 2 + 1}`, side: 'right' }
  }
  return { option: { data, layout }, warnings, seriesNames, fits: fits.length ? fits : undefined }
}
