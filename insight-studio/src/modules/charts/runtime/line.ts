/**
 * Line option builder。
 * 双 Y 轴（Y Axis Side）；分面 One / One Per Measure；轴级可选聚合；
 * 5B：无误差棒、无 Line Width / Point Size；点形状 + 默认色（无 Series 时）。
 * 拟合套件（6B）：按 Series 组分别拟合（仅数值/时间 X；category X 警告不拟合）；
 * 打标 × 叠加层；Exclude flagged 联动（6F-1）；__rowIds 供套索打标定位。
 */
import type { FieldMapping, Row } from '../../../shared/types'
import { ROW_ID_FIELD } from '../../../shared/types'
import { parseDateLike } from '../../../shared/datetime'
import { aggregateRows, aggregationLabel } from './aggregate'
import { resolveAxis, dataMinOf } from './axis'
import {
  TOOLTIP_DARK,
  buildLegend,
  buildTitle,
  columnType,
  displayVal,
  distinctInOrder,
  formatNumber,
  seriesColor,
} from './shared'
import { equationOf, MODEL_LABELS, runFit, type FitInputPoint } from '../fit/engine'
import { summarizeFit, type FitGroupSummary } from '../fit/summary'
import { flagCommentOf, flagSetOf } from '../flags'
import type { BuildInput, BuildOutput, ChartOption } from '../types'

type XKind = 'value' | 'time' | 'category'

interface FitJob {
  name: string
  color: string
  gridIdx: number
  yAxisIndex: number
  logY: boolean
  pts: FitInputPoint[]
}

function xValueOf(row: Row, field: string, kind: XKind): number | string | null {
  const raw = row[field]
  if (kind === 'category') return displayVal(raw)
  if (kind === 'time') return parseDateLike(raw)
  const n = typeof raw === 'number' ? raw : Number(raw)
  return Number.isFinite(n) ? n : null
}

export function buildLineOption({ result, config, viewName, flags }: BuildInput): BuildOutput {
  const warnings: string[] = []
  const cfg = config.configure
  const style = config.style
  const xField = cfg.x?.field
  const measures: FieldMapping[] = cfg.values?.length ? cfg.values : cfg.y ? [cfg.y] : []
  const seriesField = cfg.series?.field
  if (!xField || !measures.length) return { option: {}, warnings, seriesNames: [] }
  const xCol: string = xField

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

  const xKind: XKind =
    columnType(result.columns, xCol) === 'number'
      ? 'value'
      : columnType(result.columns, xCol) === 'date' || columnType(result.columns, xCol) === 'datetime'
        ? 'time'
        : 'category'
  const cats = xKind === 'category' ? distinctInOrder(rows, xCol).map(displayVal) : []
  const seriesVals = seriesField ? distinctInOrder(rows, seriesField).map(displayVal) : [null]
  const symbol = style.line?.pointShape ?? 'circle'
  const opacity = style.opacity ?? 1

  const useRight = measures.some((m) => m.axis?.side === 'right')
  const facet = style.line?.facet === 'per-measure' && measures.length > 1
  const grids = facet ? measures.length : 1

  const measureLabel = (m: FieldMapping) =>
    m.aggregation && m.aggregation !== 'none' ? `${aggregationLabel(m.aggregation)} of ${m.field}` : m.field

  const fitJobs: FitJob[] = []
  const fitStats = new Map<string, string>()
  const flaggedByAxis = new Map<string, { value: [number | string, number]; rowId: string; comment?: string }[]>()

  // (measure, seriesVal) → 显示数据 + rowIds + 拟合输入
  function collectFor(
    m: FieldMapping,
    sv: string | null,
  ): { data: [number | string, number][]; rowIds: string[][]; fitPts: FitInputPoint[] } {
    const agg = m.aggregation ?? 'none'
    const subset = rows.filter((r) => sv === null || displayVal(r[seriesField!]) === sv)
    const data: [number | string, number][] = []
    const rowIds: string[][] = []
    const fitPts: FitInputPoint[] = []
    if (agg !== 'none') {
      // 按 x 分桶聚合
      const buckets = new Map<string, Row[]>()
      for (const r of subset) {
        const xv = xValueOf(r, xCol, xKind)
        if (xv === null) continue
        const key = String(xv)
        const arr = buckets.get(key)
        if (arr) arr.push(r)
        else buckets.set(key, [r])
      }
      for (const [key, bucket] of buckets) {
        const v = aggregateRows(bucket, m.field, agg)
        if (v === null) continue
        const xv: number | string = xKind === 'category' ? key : Number(key)
        data.push([xv, v])
        const bucketIds = bucket.map((r) => String(r[ROW_ID_FIELD] ?? ''))
        rowIds.push(bucketIds)
        if (xKind !== 'category') {
          const allFlagged = bucketIds.length > 0 && bucketIds.every((id) => id !== '' && flagSet.has(id))
          const wMean = bucket.reduce((s, r) => s + weightOf(r), 0) / bucket.length
          fitPts.push({ x: Number(xv), y: v, flagged: allFlagged, weight: wMean })
        }
      }
    } else {
      let dropped = 0
      for (const r of subset) {
        const xv = xValueOf(r, xCol, xKind)
        const yv = Number(r[m.field])
        if (xv === null || !Number.isFinite(yv)) {
          dropped += 1
          continue
        }
        const rowId = String(r[ROW_ID_FIELD] ?? '')
        data.push([xv, yv])
        rowIds.push(rowId ? [rowId] : [])
        if (xKind !== 'category') {
          fitPts.push({ x: Number(xv), y: yv, rowId, flagged: rowId !== '' && flagSet.has(rowId), weight: weightOf(r) })
        }
      }
      if (dropped > 0) warnings.push(`已忽略 ${dropped} 行无效数值（${m.field}）`)
    }
    if (xKind !== 'category') {
      const order = data.map((_, i) => i).sort((a, b) => Number(data[a][0]) - Number(data[b][0]))
      const sortedData = order.map((i) => data[i])
      const sortedIds = order.map((i) => rowIds[i])
      const sortedFit = [...fitPts].sort((a, b) => a.x - b.x)
      return { data: sortedData, rowIds: sortedIds, fitPts: sortedFit }
    }
    return { data, rowIds, fitPts }
  }

  // 系列命名
  const seriesNames: string[] = []
  const series: ChartOption[] = []
  const addSeries = (m: FieldMapping, sv: string | null, gridIdx: number) => {
    const mLabel = measureLabel(m)
    const name = sv === null ? mLabel : measures.length > 1 ? `${mLabel} · ${sv}` : sv
    seriesNames.push(name)
    const side = m.axis?.side === 'right' ? 1 : 0
    const yAxisIndex = facet ? gridIdx * 2 + side : side
    const idx = seriesNames.length - 1
    const color =
      seriesField || measures.length > 1
        ? seriesColor(style, cfg.palette, name, idx)
        : (style.line?.defaultColor ?? seriesColor(style, cfg.palette, name, idx))
    const collected = collectFor(m, sv)
    series.push({
      type: 'line',
      name,
      data: collected.data,
      symbol,
      symbolSize: 6,
      showSymbol: true,
      xAxisIndex: gridIdx,
      yAxisIndex,
      lineStyle: { width: 2, color },
      itemStyle: { color, opacity },
      emphasis: { focus: 'series' },
      __rowIds: collected.rowIds,
    })
    if (regModel !== 'none' && collected.fitPts.length) {
      const ySpec = side === 1 ? style.yAxisRight : style.yAxis
      const minY = Math.min(...collected.fitPts.map((p) => p.y))
      fitJobs.push({ name, color, gridIdx, yAxisIndex, logY: ySpec?.scale === 'log' && minY > 0, pts: collected.fitPts })
    }
    // 打标 × 叠加（原始坐标）
    const subset = rows.filter((r) => sv === null || displayVal(r[seriesField!]) === sv)
    for (const r of subset) {
      const rowId = String(r[ROW_ID_FIELD] ?? '')
      if (!rowId || !flagSet.has(rowId)) continue
      const xv = xValueOf(r, xCol, xKind)
      const yv = Number(r[m.field])
      if (xv === null || !Number.isFinite(yv)) continue
      const key = `${gridIdx}:${yAxisIndex}`
      const arr = flaggedByAxis.get(key)
      const item = { value: [xv, yv] as [number | string, number], rowId, comment: flagCommentOf(flags, rowId) }
      if (arr) arr.push(item)
      else flaggedByAxis.set(key, [item])
    }
  }

  if (facet) {
    measures.forEach((m, gi) => seriesVals.forEach((sv) => addSeries(m, sv, gi)))
  } else {
    measures.forEach((m) => seriesVals.forEach((sv) => addSeries(m, sv, 0)))
  }

  /* ------------------------------- 拟合叠加（6B） ------------------------------- */
  const fitSeries: ChartOption[] = []
  const fitSummaries: FitGroupSummary[] = []
  if (regModel !== 'none' && regression) {
    if (xKind === 'category') {
      warnings.push('拟合需要数值或时间 X 轴，当前为分类轴，未绘制拟合线')
    } else {
      for (const job of fitJobs) {
        const fit = runFit(job.pts, regression, { logX: false, logY: job.logY })
        for (const w of fit.warnings) warnings.push(fitJobs.length > 1 ? `[${job.name}] ${w}` : w)
        if (!fit.ok) continue
        fitSummaries.push(summarizeFit(fitJobs.length > 1 ? job.name : '', fit, job.pts))
        const fitName = `${job.name} · fit`
        const statsLines = [`<b>${job.name} · ${MODEL_LABELS[regModel]}</b>`, equationOf(fit)]
        if (fit.r2 !== null) statsLines.push(`R² = ${formatNumber(fit.r2)}`)
        if (fit.converged === false) statsLines.push('⚠ 未完全收敛')
        fitStats.set(fitName, statsLines.join('<br/>'))
        const params = fit.params
        fitSeries.push({
          type: 'line',
          name: fitName,
          data: fit.curve.map((p) => [p.x, p.y]),
          symbol: 'none',
          showSymbol: false,
          smooth: regModel !== 'point-to-point',
          xAxisIndex: job.gridIdx,
          yAxisIndex: job.yAxisIndex,
          lineStyle: { width: 2, type: regModel === 'point-to-point' ? 'solid' : 'dashed', color: job.color },
          itemStyle: { color: job.color },
          z: 2,
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
  }

  /* ------------------------------- 打标 × 叠加 ------------------------------- */
  const flagSeries: ChartOption[] = []
  for (const [key, pts] of flaggedByAxis) {
    const [gi, yi] = key.split(':').map(Number)
    flagSeries.push({
      type: 'scatter',
      name: 'Flagged',
      data: pts.map((p) => p.value),
      symbol: 'x',
      symbolSize: 11,
      xAxisIndex: gi,
      yAxisIndex: yi,
      itemStyle: { color: '#d92d20', borderWidth: 2 },
      z: 6,
      __rowIds: pts.map((p) => [p.rowId]),
    })
  }

  // 轴
  const allY = () => {
    const vals: number[] = []
    for (const s of series) {
      for (const p of s.data as [unknown, number][]) if (Number.isFinite(p[1])) vals.push(p[1])
    }
    return vals
  }
  const xLabel = style.xAxis?.label ?? cfg.x?.label ?? xField
  const leftLabel = style.yAxis?.label ?? (measures.length === 1 ? measureLabel(measures[0]) : undefined)
  const rightLabel = style.yAxisRight?.label ?? (measures.filter((m) => m.axis?.side === 'right').length === 1 ? measureLabel(measures.find((m) => m.axis?.side === 'right')!) : undefined)

  const leftAxis = resolveAxis(style.yAxis, dataMinOf(allY()), leftLabel, warnings, 'Y 轴(左)')
  const rightAxis = resolveAxis(style.yAxisRight, dataMinOf(allY()), rightLabel, warnings, 'Y 轴(右)')

  const valAxis = (a: typeof leftAxis): ChartOption => ({
    ...a,
    axisLabel: { color: '#667085' },
    splitLine: { show: true, lineStyle: { color: '#eef1f5' } },
  })
  const xAxisBase: ChartOption =
    xKind === 'category'
      ? { type: 'category', data: cats, name: xLabel, nameGap: 28, axisLabel: { color: '#667085' } }
      : { type: xKind, name: xLabel, nameGap: 28, axisLabel: { color: '#667085' }, splitLine: { show: false } }

  const m = style.margins
  const gridsOpt: ChartOption[] = []
  const xAxes: ChartOption[] = []
  const yAxes: ChartOption[] = []
  for (let gi = 0; gi < grids; gi += 1) {
    const topPct = (gi / grids) * 100
    const heightPct = 100 / grids - 6
    gridsOpt.push({
      left: m?.left ?? 64,
      right: m?.right ?? (useRight ? 64 : 32),
      top: `${topPct + 4}%`,
      height: `${heightPct}%`,
      containLabel: true,
    })
    xAxes.push({ ...xAxisBase, gridIndex: gi, name: gi === grids - 1 ? xLabel : undefined })
    yAxes.push({ ...valAxis(leftAxis), gridIndex: gi, name: facet ? measureLabel(measures[gi]) : leftAxis.name })
    yAxes.push({ ...valAxis(rightAxis), gridIndex: gi, show: useRight, name: rightAxis.name, splitLine: { show: false } })
  }

  // 轴触发 tooltip：拟合系列显示统计量，数据系列显示数值
  const tooltipOpt: ChartOption = { ...TOOLTIP_DARK, trigger: 'axis' }
  if (fitStats.size > 0) {
    tooltipOpt.formatter = (params: ChartOption[]) => {
      const list = Array.isArray(params) ? params : [params]
      const lines: string[] = []
      const title = list[0]?.axisValue
      if (title !== undefined) lines.push(`<b>${typeof title === 'number' ? formatNumber(title) : title}</b>`)
      for (const p of list) {
        const stats = fitStats.get(p.seriesName)
        if (stats) {
          lines.push(stats)
          continue
        }
        const v = Array.isArray(p.value) ? p.value[1] : p.value
        lines.push(`${p.marker ?? ''}${p.seriesName}: <b>${typeof v === 'number' ? formatNumber(v) : v}</b>`)
      }
      return lines.join('<br/>')
    }
  }

  const legendOpt = buildLegend(style, seriesNames.length > 1)
  if (legendOpt) legendOpt.data = [...seriesNames] // 拟合线 / Flagged 不进图例

  const option: ChartOption = {
    title: buildTitle(style, viewName ?? ''),
    tooltip: tooltipOpt,
    legend: legendOpt,
    grid: gridsOpt,
    xAxis: xAxes,
    yAxis: yAxes,
    series: [...series, ...fitSeries, ...flagSeries],
  }
  return { option, warnings, seriesNames, fits: fitSummaries.length ? fitSummaries : undefined }
}
