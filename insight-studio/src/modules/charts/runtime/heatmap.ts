import { compareValues } from '../../../shared/pipeline'
import { aggregateValues } from './aggregate'
import { getContinuousPalette } from './palette'
import { AXIS_STYLE, baseLayout, withRefLines, displayVal, distinctInOrder, formatNumber } from './shared'
import { EMPTY_FIGURE, type BuildInput, type BuildOutput } from '../types'

function impute(matrix: (number | null)[][]): number[][] {
  const means = (matrix[0] ?? []).map((_, i) => {
    const values = matrix.map((row) => row[i]).filter((v): v is number => v !== null)
    return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0
  })
  return matrix.map((row) => row.map((value, i) => value ?? means[i]))
}

function distance(a: number[], b: number[]): number {
  return Math.sqrt(a.reduce((sum, value, i) => sum + (value - b[i]) ** 2, 0))
}

export function clusterOrder(vectors: number[][]): number[] {
  if (vectors.length <= 2 || vectors.length > 200) return vectors.map((_, i) => i)
  type Node = { leaves: number[]; left?: Node; right?: Node }
  let nodes: Node[] = vectors.map((_, i) => ({ leaves: [i] }))
  while (nodes.length > 1) {
    let pair: [number, number] = [0, 1]
    let best = Infinity
    for (let i = 0; i < nodes.length; i += 1) {
      for (let j = i + 1; j < nodes.length; j += 1) {
        const distances = nodes[i].leaves.flatMap((a) => nodes[j].leaves.map((b) => distance(vectors[a], vectors[b])))
        const d = distances.reduce((a, b) => a + b, 0) / distances.length
        if (d < best) {
          best = d
          pair = [i, j]
        }
      }
    }
    const [i, j] = pair
    const left = nodes[i]
    const right = nodes[j]
    nodes = nodes.filter((_, index) => index !== i && index !== j)
    nodes.push({ leaves: [...left.leaves, ...right.leaves], left, right })
  }
  const order: number[] = []
  const walk = (node: Node) => {
    if (!node.left || !node.right) order.push(...node.leaves)
    else {
      walk(node.left)
      walk(node.right)
    }
  }
  walk(nodes[0])
  return order
}

export function buildHeatmapOption({ result, config, viewName }: BuildInput): BuildOutput {
  const warnings: string[] = []
  const cfg = config.configure
  const style = config.style
  const xField = cfg.x?.field
  const yField = cfg.y?.field
  const valueField = cfg.color?.field
  if (!xField || !yField || !valueField) return { option: EMPTY_FIGURE, warnings, seriesNames: [] }

  const buckets = new Map<string, number[]>()
  for (const row of result.rows) {
    const value = Number(row[valueField])
    if (!Number.isFinite(value)) continue
    const key = JSON.stringify([displayVal(row[xField]), displayVal(row[yField])])
    buckets.set(key, [...(buckets.get(key) ?? []), value])
  }
  let x = distinctInOrder(result.rows, xField).map(displayVal)
  let y = distinctInOrder(result.rows, yField).map(displayVal)
  const cell = (col: string, row: string): number | null => {
    const values = buckets.get(JSON.stringify([col, row]))
    return values ? aggregateValues(values, 'mean') : null
  }
  const mean = (values: Array<number | null>) => aggregateValues(values.filter((v): v is number => v !== null), 'mean') ?? 0
  if ((style.heatmap?.colSort ?? 'label') === 'label') x.sort(compareValues)
  else x.sort((a, b) => mean(y.map((row) => cell(a, row))) - mean(y.map((row) => cell(b, row))))
  if ((style.heatmap?.rowSort ?? 'label') === 'label') y.sort(compareValues)
  else y.sort((a, b) => mean(x.map((col) => cell(col, a))) - mean(x.map((col) => cell(col, b))))

  const legacy = style.heatmap?.cluster === true
  let matrix = y.map((row) => x.map((col) => cell(col, row)))
  if ((style.heatmap?.clusterRows ?? legacy) && y.length > 2) y = clusterOrder(impute(matrix)).map((i) => y[i])
  matrix = y.map((row) => x.map((col) => cell(col, row)))
  if ((style.heatmap?.clusterCols ?? legacy) && x.length > 2) {
    const transposed = x.map((_, i) => matrix.map((row) => row[i]))
    x = clusterOrder(impute(transposed)).map((i) => x[i])
  }
  matrix = y.map((row) => x.map((col) => cell(col, row)))
  const values = matrix.flat().filter((v): v is number => v !== null)
  if (!values.length) warnings.push(`列「${valueField}」无有效数值`)
  const palette = getContinuousPalette(cfg.palette)
  const colorscale = palette.stops.map((color, i) => [i / (palette.stops.length - 1), color])
  const legendPos = style.legend?.position ?? 'right'
  const colorbar: Record<string, unknown> = {
    tickfont: { color: '#667085', size: 11 },
    xref: 'container',
    yref: 'container',
  }
  if (legendPos === 'left') Object.assign(colorbar, { x: 0, xanchor: 'left', y: 0.5, yanchor: 'middle' })
  else if (legendPos === 'bottom') Object.assign(colorbar, { orientation: 'h', x: 0.5, xanchor: 'center', y: 0, yanchor: 'bottom' })
  else if (legendPos === 'top') Object.assign(colorbar, { orientation: 'h', x: 0.5, xanchor: 'center', y: 1, yanchor: 'top' })
  else Object.assign(colorbar, { x: 1, xanchor: 'right', y: 0.5, yanchor: 'middle' })

  const showText = style.heatmap?.showCellValues ?? false
  return {
    option: {
      data: [{
        type: 'heatmap',
        x,
        y,
        z: matrix,
        zmin: values.length ? Math.min(...values) : 0,
        zmax: values.length ? Math.max(...values) : 1,
        colorscale,
        colorbar,
        opacity: style.opacity ?? 1,
        text: showText ? matrix.map((row) => row.map((value) => value === null ? '' : formatNumber(value))) : undefined,
        texttemplate: showText ? '%{text}' : undefined,
        hovertemplate: `${xField}: %{x}<br>${yField}: %{y}<br>${valueField}: %{z}<extra></extra>`,
      }],
      layout: withRefLines(
        {
          ...baseLayout(style, ''),
          xaxis: { ...AXIS_STYLE, type: 'category', title: { text: style.xAxis?.label ?? xField, font: AXIS_STYLE.titlefont } },
          yaxis: { ...AXIS_STYLE, type: 'category', autorange: 'reversed', title: { text: style.yAxis?.label ?? yField, font: AXIS_STYLE.titlefont } },
        },
        style,
      ),
    },
    warnings,
    seriesNames: [],
  }
}
