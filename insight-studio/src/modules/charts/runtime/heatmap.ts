/**
 * Heatmap option builder。
 * X 列坐标 / Y 行坐标 / 连续色值列；连续色阶 visualMap + 位置；格内数值标注（默认关）；
 * 行列排序（label / mean）+ 可选层次聚类（行/列分别开关，自实现 agglomerative）。
 */
import { compareValues } from '../../../shared/pipeline'
import { aggregateValues } from './aggregate'
import { getContinuousPalette } from './palette'
import { TOOLTIP_DARK, buildTitle, displayVal, distinctInOrder, formatNumber } from './shared'
import type { BuildInput, BuildOutput, ChartOption } from '../types'

/* --------------------------- 层次聚类（agglomerative） --------------------------- */

/** 行向量（缺失值用该列均值填补）。 */
function impute(matrix: (number | null)[][]): number[][] {
  const cols = matrix[0]?.length ?? 0
  const colMeans: number[] = []
  for (let c = 0; c < cols; c += 1) {
    const vals = matrix.map((r) => r[c]).filter((v): v is number => v !== null)
    colMeans.push(vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0)
  }
  return matrix.map((r) => r.map((v, c) => v ?? colMeans[c]))
}

function dist(a: number[], b: number[]): number {
  let s = 0
  for (let i = 0; i < a.length; i += 1) s += (a[i] - b[i]) ** 2
  return Math.sqrt(s)
}

/**
 * 凝聚层次聚类（average linkage），返回叶序索引排列。
 * 小矩阵（≤200 项）性能足够；更大时跳过（返回原序）。
 */
export function clusterOrder(vectors: number[][]): number[] {
  const n = vectors.length
  if (n <= 2 || n > 200) return vectors.map((_, i) => i)
  interface Cluster {
    members: number[]
    center: number[]
  }
  let clusters: Cluster[] = vectors.map((v, i) => ({ members: [i], center: v.slice() }))
  const order: number[] = []
  // 简单实现：反复合并最近的一对，最终按合并树展开
  interface Node {
    left?: Node
    right?: Node
    leaf?: number
  }
  const nodes: Node[] = clusters.map((_, i) => ({ leaf: i }))
  let nodeClusters = clusters.map((c, i) => ({ ...c, node: nodes[i] }))
  while (nodeClusters.length > 1) {
    let bi = 0
    let bj = 1
    let best = Number.POSITIVE_INFINITY
    for (let i = 0; i < nodeClusters.length; i += 1) {
      for (let j = i + 1; j < nodeClusters.length; j += 1) {
        // average linkage：簇间平均距离
        let s = 0
        let cnt = 0
        for (const a of nodeClusters[i].members) {
          for (const b of nodeClusters[j].members) {
            s += dist(vectors[a], vectors[b])
            cnt += 1
          }
        }
        const d = s / cnt
        if (d < best) {
          best = d
          bi = i
          bj = j
        }
      }
    }
    const A = nodeClusters[bi]
    const B = nodeClusters[bj]
    const merged = {
      members: [...A.members, ...B.members],
      center: A.center.map((v, i) => (v * A.members.length + B.center[i] * B.members.length) / (A.members.length + B.members.length)),
      node: { left: A.node, right: B.node } as Node,
    }
    nodeClusters = nodeClusters.filter((_, i) => i !== bi && i !== bj)
    nodeClusters.push(merged)
  }
  const walk = (node: Node) => {
    if (node.leaf !== undefined) {
      order.push(node.leaf)
      return
    }
    walk(node.left!)
    walk(node.right!)
  }
  walk(nodeClusters[0].node)
  void clusters
  return order
}

/* ------------------------------- builder ------------------------------- */

export function buildHeatmapOption({ result, config, viewName }: BuildInput): BuildOutput {
  const warnings: string[] = []
  const cfg = config.configure
  const style = config.style
  const xField = cfg.x?.field
  const yField = cfg.y?.field
  const valueField = cfg.color?.field
  if (!xField || !yField || !valueField) return { option: {}, warnings, seriesNames: [] }

  const rows = result.rows

  // 单元格聚合（重复坐标取 mean）
  const cellBuckets = new Map<string, number[]>()
  for (const r of rows) {
    const v = Number(r[valueField])
    if (!Number.isFinite(v)) continue
    const key = `${displayVal(r[xField])}${displayVal(r[yField])}`
    const arr = cellBuckets.get(key)
    if (arr) arr.push(v)
    else cellBuckets.set(key, [v])
  }

  let colLabels = distinctInOrder(rows, xField).map(displayVal)
  let rowLabels = distinctInOrder(rows, yField).map(displayVal)

  const cellValue = (x: string, y: string): number | null => {
    const bucket = cellBuckets.get(`${x}${y}`)
    return bucket ? aggregateValues(bucket, 'mean') : null
  }

  // 排序：label / mean
  const colSort = style.heatmap?.colSort ?? 'label'
  const rowSort = style.heatmap?.rowSort ?? 'label'
  if (colSort === 'label') colLabels = colLabels.slice().sort((a, b) => compareValues(a, b))
  if (rowSort === 'label') rowLabels = rowLabels.slice().sort((a, b) => compareValues(a, b))
  if (colSort === 'mean') {
    colLabels = colLabels.slice().sort((a, b) => {
      const ma = aggregateValues(rowLabels.map((r) => cellValue(a, r)).filter((v): v is number => v !== null), 'mean') ?? 0
      const mb = aggregateValues(rowLabels.map((r) => cellValue(b, r)).filter((v): v is number => v !== null), 'mean') ?? 0
      return ma - mb
    })
  }
  if (rowSort === 'mean') {
    rowLabels = rowLabels.slice().sort((a, b) => {
      const ma = aggregateValues(colLabels.map((c) => cellValue(c, a)).filter((v): v is number => v !== null), 'mean') ?? 0
      const mb = aggregateValues(colLabels.map((c) => cellValue(c, b)).filter((v): v is number => v !== null), 'mean') ?? 0
      return ma - mb
    })
  }

  // 聚类（覆盖排序结果；行/列分别开关；兼容旧 cluster 字段）
  const legacyCluster = style.heatmap?.cluster === true
  const clusterRows = style.heatmap?.clusterRows ?? legacyCluster
  const clusterCols = style.heatmap?.clusterCols ?? legacyCluster
  const matrix = rowLabels.map((r) => colLabels.map((c) => cellValue(c, r)))
  if (clusterRows && rowLabels.length > 2) {
    const order = clusterOrder(impute(matrix))
    rowLabels = order.map((i) => rowLabels[i])
  }
  if (clusterCols && colLabels.length > 2) {
    const transposed = colLabels.map((_, ci) => matrix.map((row) => row[ci]))
    const order = clusterOrder(impute(transposed))
    colLabels = order.map((i) => colLabels[i])
  }

  // 最终数据
  const data: [number, number, number][] = []
  let min = Number.POSITIVE_INFINITY
  let max = Number.NEGATIVE_INFINITY
  rowLabels.forEach((r, ri) => {
    colLabels.forEach((c, ci) => {
      const v = cellValue(c, r)
      if (v === null) return
      data.push([ci, ri, v])
      if (v < min) min = v
      if (v > max) max = v
    })
  })
  if (!data.length) {
    warnings.push(`列「${valueField}」无有效数值`)
    min = 0
    max = 1
  }

  const palette = getContinuousPalette(cfg.palette)
  const legendPos = style.legend?.position ?? 'right'
  const visualMap: ChartOption = {
    type: 'continuous',
    min,
    max,
    calculable: true,
    inRange: { color: palette.stops },
    textStyle: { color: '#667085', fontSize: 11 },
    ...(legendPos === 'left' || legendPos === 'right'
      ? { orient: 'vertical', [legendPos]: 8, top: 'middle' }
      : { orient: 'horizontal', [legendPos === 'top' ? 'top' : 'bottom']: 8, left: 'center' }),
  }

  const showCellValues = style.heatmap?.showCellValues ?? false

  const option: ChartOption = {
    title: buildTitle(style, viewName ?? ''),
    tooltip: {
      ...TOOLTIP_DARK,
      trigger: 'item',
      formatter: (p: ChartOption) => {
        const [ci, ri, v] = p.value as [number, number, number]
        return [
          `<b>${p.marker ?? ''}${colLabels[ci]} · ${rowLabels[ri]}</b>`,
          `${xField}: ${colLabels[ci]}`,
          `${yField}: ${rowLabels[ri]}`,
          `${valueField}: ${formatNumber(v)}`,
        ].join('<br/>')
      },
    },
    grid: { top: 40, bottom: 60, left: 70, right: legendPos === 'right' ? 90 : 24, containLabel: true },
    xAxis: { type: 'category', data: colLabels, name: style.xAxis?.label ?? xField, splitArea: { show: true }, axisLabel: { color: '#667085' } },
    yAxis: { type: 'category', data: rowLabels, name: style.yAxis?.label ?? yField, inverse: true, splitArea: { show: true }, axisLabel: { color: '#667085' } },
    visualMap,
    series: [
      {
        type: 'heatmap',
        data,
        label: showCellValues
          ? { show: true, fontSize: 10, color: '#1d2939', formatter: (p: ChartOption) => formatNumber((p.value as number[])[2]) }
          : { show: false },
        itemStyle: { opacity: style.opacity ?? 1 },
        emphasis: { itemStyle: { shadowBlur: 8, shadowColor: 'rgba(0,0,0,0.25)' } },
      },
    ],
  }
  return { option, warnings, seriesNames: [] }
}
