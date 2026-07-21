/**
 * Scatter option builder。
 * Color/Shape 分组（2B）、Size 第三度量半径映射、双 Y、误差棒（Mean 聚合上下文）、
 * Jitter（确定性偏移）、分面 One / One Per Measure（分面后仍尊重 Y Axis Side）、网格线默认开。
 * 拟合套件（6B）：按 Color/Shape 组分别拟合，曲线叠加（虚线、同组色族）；
 * 打标 × 叠加层；Exclude flagged 联动（6F-1）；__rowIds 供套索打标定位。
 */
import type { FieldMapping, Row } from '../../../shared/types'
import { ROW_ID_FIELD } from '../../../shared/types'
import { aggregateRows, aggregationLabel, errorValue, numericValues } from './aggregate'
import { resolveAxis, dataMinOf } from './axis'
import {
  TOOLTIP_DARK,
  buildLegend,
  buildTitle,
  displayVal,
  distinctInOrder,
  errorBarSeries,
  formatNumber,
  seriesColor,
  shapeFor,
  stableRandom,
} from './shared'
import { equationOf, MODEL_LABELS, runFit, type FitInputPoint } from '../fit/engine'
import { summarizeFit, type FitGroupSummary } from '../fit/summary'
import { flagCommentOf, flagSetOf } from '../flags'
import type { BuildInput, BuildOutput, ChartOption } from '../types'

interface PointMeta {
  x: number
  y: number
  color?: string
  shape?: string
  size?: number
  err?: number | null
  rowId?: string
  flagComment?: string
}

interface FitJob {
  name: string
  color: string
  gridIdx: number
  yAxisIndex: number
  logY: boolean
  pts: FitInputPoint[]
}

interface FlaggedPoint {
  x: number
  y: number
  rowId: string
  comment?: string
  gridIdx: number
  yAxisIndex: number
}

function rangeOf(values: number[]): number {
  if (!values.length) return 0
  return Math.max(...values) - Math.min(...values)
}

export function buildScatterOption({ result, config, viewName, flags }: BuildInput): BuildOutput {
  const warnings: string[] = []
  const cfg = config.configure
  const style = config.style
  const xField = cfg.x?.field
  const measures: FieldMapping[] = cfg.values?.length ? cfg.values : cfg.y ? [cfg.y] : []
  const colorField = cfg.color?.field
  const shapeField = cfg.shape?.field
  const sizeField = cfg.size?.field
  if (!xField || !measures.length) return { option: {}, warnings, seriesNames: [] }

  const rows = result.rows
  const flagSet = flagSetOf(flags)
  const regression = cfg.regression
  const regModel = regression?.model ?? 'none'
  const weightsField = regression?.weightsField
  const weightOf = (r: Row): number => {
    if (!weightsField) return 1
    const n = Number(r[weightsField])
    return Number.isFinite(n) && n > 0 ? n : 1
  }

  const colorVals: (string | null)[] = colorField ? distinctInOrder(rows, colorField).map(displayVal) : [null]
  const shapeVals: (string | null)[] = shapeField ? distinctInOrder(rows, shapeField).map(displayVal) : [null]
  const errType = cfg.errorBars ?? 'none'
  const opacity = style.opacity ?? 1
  const baseSize = style.scatter?.pointSize ?? 8
  const sizeMin = style.scatter?.sizeMin ?? 4
  const sizeMax = style.scatter?.sizeMax ?? 24
  const jitterOn = !!style.scatter?.jitter
  const jitterStrength = style.scatter?.jitterStrength ?? 0.4
  const facet = style.scatter?.facet === 'per-measure' && measures.length > 1
  const grids = facet ? measures.length : 1

  const measureLabel = (m: FieldMapping) =>
    m.aggregation && m.aggregation !== 'none' ? `${aggregationLabel(m.aggregation)} of ${m.field}` : m.field

  // Size 值域
  const sizeVals = sizeField ? numericValues(rows, sizeField) : []
  const sizeDomain: [number, number] = sizeVals.length ? [Math.min(...sizeVals), Math.max(...sizeVals)] : [0, 1]
  const sizeRadius = (v: number): number => {
    const [lo, hi] = sizeDomain
    if (hi === lo) return (sizeMin + sizeMax) / 2
    return sizeMin + ((v - lo) / (hi - lo)) * (sizeMax - sizeMin)
  }

  const comboName = (cv: string | null, sv: string | null): string | null => {
    if (cv !== null && sv !== null) return `${cv} · ${sv}`
    return cv ?? sv
  }

  // log 轴判定（与 resolveAxis 回退逻辑一致：数据含非正值则视为 linear）
  const xValsAll = numericValues(rows, xField)
  const logXApplied = style.xAxis?.scale === 'log' && xValsAll.length > 0 && Math.min(...xValsAll) > 0

  const seriesNames: string[] = []
  const series: ChartOption[] = []
  const errSeries: ChartOption[] = []
  const fitJobs: FitJob[] = []
  const flaggedPts: FlaggedPoint[] = []
  const allY: number[] = []
  let dropped = 0

  // jitter 幅度参考：全体数据范围
  const xRangeAll = rangeOf(xValsAll)
  const yRangeAll = rangeOf(measures.flatMap((m) => numericValues(rows, m.field)))

  const emitFor = (m: FieldMapping, gridIdx: number) => {
    const agg = m.aggregation ?? 'none'
    const side = m.axis?.side === 'right' ? 1 : 0
    const yAxisIndex = facet ? gridIdx * 2 + side : side
    const ySpec = side === 1 ? style.yAxisRight : style.yAxis
    for (const cv of colorVals) {
      shapeVals.forEach((sv, si) => {
        const subset = rows.filter(
          (r) => (cv === null || displayVal(r[colorField!]) === cv) && (sv === null || displayVal(r[shapeField!]) === sv),
        )
        if (!subset.length) return
        const combo = comboName(cv, sv)
        const name = measures.length > 1 ? (combo ? `${measureLabel(m)} · ${combo}` : measureLabel(m)) : (combo ?? measureLabel(m))
        const idx = seriesNames.length
        const color = seriesColor(style, cfg.palette, name, colorField && cv !== null ? colorVals.indexOf(cv) : idx)
        const symbol = shapeField && sv !== null ? shapeFor(si) : (style.scatter?.pointShape ?? 'circle')

        const points: ChartOption[] = []
        const rowIds: string[][] = []
        const fitPts: FitInputPoint[] = []
        const errData: { x: number; low: number; high: number; color: string }[] = []

        if (agg !== 'none') {
          // Mean 聚合上下文：按 (x, color, shape) 分桶 → 聚合点 + 误差棒
          const buckets = new Map<number, Row[]>()
          for (const r of subset) {
            const xv = Number(r[xField])
            if (!Number.isFinite(xv)) continue
            const arr = buckets.get(xv)
            if (arr) arr.push(r)
            else buckets.set(xv, [r])
          }
          for (const [xv, bucket] of buckets) {
            const v = aggregateRows(bucket, m.field, agg)
            if (v === null) continue
            const vals = numericValues(bucket, m.field)
            const err = errType !== 'none' ? errorValue(vals, errType) : null
            allY.push(v)
            const bucketIds = bucket.map((r) => String(r[ROW_ID_FIELD] ?? ''))
            const meta: PointMeta = { x: xv, y: v, color: cv ?? undefined, shape: sv ?? undefined, err }
            points.push({ value: [xv, v], meta })
            rowIds.push(bucketIds)
            // 聚合点拟合输入：全桶打标才视为 flagged；权重取桶内均值
            const allFlagged = bucketIds.length > 0 && bucketIds.every((id) => id !== '' && flagSet.has(id))
            const wMean = bucket.reduce((s, r) => s + weightOf(r), 0) / bucket.length
            fitPts.push({ x: xv, y: v, flagged: allFlagged, weight: wMean })
            if (err !== null) errData.push({ x: xv, low: v - err, high: v + err, color })
            for (const r of bucket) {
              const rid = String(r[ROW_ID_FIELD] ?? '')
              if (rid && flagSet.has(rid)) {
                const fy = Number(r[m.field])
                if (Number.isFinite(fy)) {
                  flaggedPts.push({ x: xv, y: fy, rowId: rid, comment: flagCommentOf(flags, rid), gridIdx, yAxisIndex })
                }
              }
            }
          }
        } else {
          subset.forEach((r, i) => {
            const xv = Number(r[xField])
            const yv = Number(r[m.field])
            if (!Number.isFinite(xv) || !Number.isFinite(yv)) {
              dropped += 1
              return
            }
            const rowId = String(r[ROW_ID_FIELD] ?? '')
            const flagged = rowId !== '' && flagSet.has(rowId)
            let px = xv
            let py = yv
            if (jitterOn) {
              // 确定性 jitter：按数据范围比例偏移
              px += (stableRandom(i * 2 + 1) - 0.5) * 2 * jitterStrength * 0.01 * (xRangeAll || 1)
              py += (stableRandom(i * 2 + 2) - 0.5) * 2 * jitterStrength * 0.01 * (yRangeAll || 1)
            }
            const sizeV = sizeField ? (Number(r[sizeField]) || null) : null
            const meta: PointMeta = {
              x: xv,
              y: yv,
              color: cv ?? undefined,
              shape: sv ?? undefined,
              size: sizeV ?? undefined,
              rowId,
              flagComment: flagged ? flagCommentOf(flags, rowId) : undefined,
            }
            allY.push(yv)
            points.push({ value: [px, py], meta, symbolSize: sizeV !== null ? sizeRadius(sizeV) : undefined })
            rowIds.push(rowId ? [rowId] : [])
            fitPts.push({ x: xv, y: yv, rowId, flagged, weight: weightOf(r) })
            if (flagged) flaggedPts.push({ x: xv, y: yv, rowId, comment: meta.flagComment, gridIdx, yAxisIndex })
          })
        }

        seriesNames.push(name)
        series.push({
          type: 'scatter',
          name,
          data: points,
          symbol,
          symbolSize: sizeField ? undefined : baseSize,
          xAxisIndex: gridIdx,
          yAxisIndex,
          itemStyle: { color, opacity },
          emphasis: { focus: 'series' },
          __rowIds: rowIds,
        })
        if (fitPts.length) {
          const minY = Math.min(...fitPts.map((p) => p.y))
          fitJobs.push({ name, color, gridIdx, yAxisIndex, logY: ySpec?.scale === 'log' && minY > 0, pts: fitPts })
        }
        if (errData.length) {
          errSeries.push(
            errorBarSeries({
              name: `${name} error`,
              data: errData,
              color,
              yAxisIndex,
              xAxisIndex: gridIdx,
            }),
          )
        }
      })
    }
  }

  if (facet) measures.forEach((m, gi) => emitFor(m, gi))
  else measures.forEach((m) => emitFor(m, 0))

  if (dropped > 0) warnings.push(`已忽略 ${dropped} 个非数值点`)
  if (errType !== 'none' && !measures.some((m) => (m.aggregation ?? 'none') === 'mean')) {
    warnings.push('误差棒仅在聚合为 Average(mean) 时生效')
  }

  /* ------------------------------- 拟合叠加（6B） ------------------------------- */
  const fitSeries: ChartOption[] = []
  const fitSummaries: FitGroupSummary[] = []
  if (regModel !== 'none' && regression) {
    for (const job of fitJobs) {
      const fit = runFit(job.pts, regression, { logX: logXApplied, logY: job.logY })
      for (const w of fit.warnings) warnings.push(fitJobs.length > 1 ? `[${job.name}] ${w}` : w)
      if (!fit.ok) continue
      fitSummaries.push(summarizeFit(fitJobs.length > 1 ? job.name : '', fit, job.pts))
      const statsLines = [`<b>${job.name} · ${MODEL_LABELS[regModel]}</b>`, equationOf(fit)]
      if (fit.r2 !== null) statsLines.push(`R² = ${formatNumber(fit.r2)}`)
      if (fit.converged === false) statsLines.push('⚠ 未完全收敛')
      const params = fit.params
      fitSeries.push({
        type: 'line',
        name: `${job.name} · fit`,
        data: fit.curve.map((p) => [p.x, p.y]),
        symbol: 'none',
        showSymbol: false,
        smooth: regModel !== 'point-to-point',
        xAxisIndex: job.gridIdx,
        yAxisIndex: job.yAxisIndex,
        lineStyle: { width: 2, type: regModel === 'point-to-point' ? 'solid' : 'dashed', color: job.color },
        itemStyle: { color: job.color },
        z: 2,
        silent: false,
        tooltip: { formatter: () => statsLines.join('<br/>') },
        markLine:
          regression.showAsymptotes && params?.kind === '4pl'
            ? {
                silent: true,
                symbol: 'none',
                lineStyle: { color: '#98a2b3', type: 'dotted', width: 1 },
                label: { fontSize: 10, color: '#667085', formatter: '{b}' },
                data: [
                  { name: 'min', yAxis: params.min },
                  { name: 'max', yAxis: params.max },
                ],
              }
            : undefined,
      })
    }
  }

  /* ------------------------------- 打标 × 叠加 ------------------------------- */
  const flagSeries: ChartOption[] = []
  const flagGroups = new Map<string, FlaggedPoint[]>()
  for (const p of flaggedPts) {
    const key = `${p.gridIdx}:${p.yAxisIndex}`
    const arr = flagGroups.get(key)
    if (arr) arr.push(p)
    else flagGroups.set(key, [p])
  }
  for (const [key, pts] of flagGroups) {
    const [gi, yi] = key.split(':').map(Number)
    flagSeries.push({
      type: 'scatter',
      name: 'Flagged',
      data: pts.map((p) => ({ value: [p.x, p.y], meta: { x: p.x, y: p.y, flagComment: p.comment } })),
      symbol: 'x',
      symbolSize: 11,
      xAxisIndex: gi,
      yAxisIndex: yi,
      itemStyle: { color: '#d92d20', borderWidth: 2 },
      z: 6,
      __rowIds: pts.map((p) => [p.rowId]),
      tooltip: {
        formatter: (p: ChartOption) => {
          const meta = p.data?.meta as PointMeta | undefined
          const lines = ['<b>🚩 Flagged</b>', `${xField}: ${formatNumber(meta?.x ?? Number.NaN)}`, `Y: ${formatNumber(meta?.y ?? Number.NaN)}`]
          if (meta?.flagComment) lines.push(`Comment: ${meta.flagComment}`)
          return lines.join('<br/>')
        },
      },
    })
  }

  const xLabel = style.xAxis?.label ?? cfg.x?.label ?? xField
  const leftLabel = style.yAxis?.label ?? (measures.length === 1 ? measureLabel(measures[0]) : undefined)
  const rightLabel = style.yAxisRight?.label ?? undefined
  const leftAxis = resolveAxis(style.yAxis, dataMinOf(allY), leftLabel, warnings, 'Y 轴(左)')
  const rightAxis = resolveAxis(style.yAxisRight, dataMinOf(allY), rightLabel, warnings, 'Y 轴(右)')
  const xAxisResolved = resolveAxis(style.xAxis, dataMinOf(xValsAll), xLabel, warnings, 'X 轴')

  const m2 = style.margins
  const useRight = measures.some((mm) => mm.axis?.side === 'right')
  const gridsOpt: ChartOption[] = []
  const xAxes: ChartOption[] = []
  const yAxes: ChartOption[] = []
  const splitOn = { show: true, lineStyle: { color: '#eef1f5' } } // 网格线默认开
  for (let gi = 0; gi < grids; gi += 1) {
    const topPct = (gi / grids) * 100
    gridsOpt.push({
      left: m2?.left ?? 64,
      right: m2?.right ?? (useRight ? 64 : 32),
      top: `${topPct + 4}%`,
      height: `${100 / grids - 6}%`,
      containLabel: true,
    })
    xAxes.push({
      ...xAxisResolved,
      gridIndex: gi,
      name: gi === grids - 1 ? xAxisResolved.name : undefined,
      axisLabel: { color: '#667085' },
      splitLine: splitOn,
    })
    yAxes.push({ ...leftAxis, gridIndex: gi, name: facet ? measureLabel(measures[gi]) : leftAxis.name, axisLabel: { color: '#667085' }, splitLine: splitOn })
    yAxes.push({ ...rightAxis, gridIndex: gi, show: useRight, axisLabel: { color: '#667085' }, splitLine: { show: false } })
  }

  const tooltipFormatter = (p: ChartOption) => {
    const meta = p.data?.meta as PointMeta | undefined
    if (!meta) return p.name
    const dot = `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color};margin-right:6px"></span>`
    const lines = [`${dot}<b>${p.seriesName}</b>`]
    lines.push(`${xField}: ${formatNumber(meta.x)}`)
    lines.push(`${measures.length > 1 ? p.seriesName.split(' · ')[0] : 'Y'}: ${formatNumber(meta.y)}`)
    if (meta.color !== undefined && colorField) lines.push(`${colorField}: ${meta.color}`)
    if (meta.shape !== undefined && shapeField) lines.push(`${shapeField}: ${meta.shape}`)
    if (meta.size !== undefined && sizeField) lines.push(`${sizeField}: ${formatNumber(meta.size)}`)
    if (meta.err != null) lines.push(`Error: ±${formatNumber(meta.err)}`)
    if (meta.flagComment) lines.push(`🚩 ${meta.flagComment}`)
    return lines.join('<br/>')
  }

  const legendOpt = buildLegend(style, seriesNames.length > 1)
  if (legendOpt) legendOpt.data = [...seriesNames] // 拟合线 / Flagged 不进图例

  const option: ChartOption = {
    title: buildTitle(style, viewName ?? ''),
    tooltip: { ...TOOLTIP_DARK, trigger: 'item', formatter: tooltipFormatter },
    legend: legendOpt,
    grid: gridsOpt,
    xAxis: xAxes,
    yAxis: yAxes,
    series: [...series, ...errSeries, ...fitSeries, ...flagSeries],
  }
  return { option, warnings, seriesNames, fits: fitSummaries.length ? fitSummaries : undefined }
}
