import { describe, expect, it } from 'vitest'
import { createChartConfig } from '../../../src/shared/factories'
import type { ColumnMeta, Row } from '../../../src/shared/types'
import { buildHeatmapOption, clusterOrder } from '../../../src/modules/charts/runtime/heatmap'
import { vr } from './helpers'

const columns: ColumnMeta[] = [
  { field: 'col', title: 'col', dataType: 'string' },
  { field: 'row', title: 'row', dataType: 'string' },
  { field: 'v', title: 'v', dataType: 'number' },
]
const cell = (col: string, row: string, v: number): Row => ({ col, row, v })
const rows = [cell('c2', 'r1', 10), cell('c1', 'r1', 20), cell('c2', 'r2', 30), cell('c1', 'r2', 40)]
const cfg = () => {
  const c = createChartConfig('heatmap')
  c.configure.x = { field: 'col' }
  c.configure.y = { field: 'row' }
  c.configure.color = { field: 'v' }
  return c
}

describe('Plotly heatmap builder', () => {
  it('输出 z 矩阵与原色板 colorscale', () => {
    const trace = buildHeatmapOption({ result: vr(rows, columns), config: cfg() }).option.data[0]
    expect(trace).toMatchObject({ type: 'heatmap', x: ['c1', 'c2'], y: ['r1', 'r2'], z: [[20, 10], [40, 30]], zmin: 10, zmax: 40 })
    expect(trace.colorscale).toEqual([
      [0, '#f7fbff'],
      [0.25, '#c6dbef'],
      [0.5, '#6baed6'],
      [0.75, '#2171b5'],
      [1, '#08306b'],
    ])
  })

  it('重复坐标聚合 mean 并支持文字', () => {
    const c = cfg()
    c.style.heatmap = { ...c.style.heatmap, showCellValues: true }
    const trace = buildHeatmapOption({ result: vr([cell('c1', 'r1', 10), cell('c1', 'r1', 30)], columns), config: c }).option.data[0]
    expect(trace.z).toEqual([[20]])
    expect(trace.texttemplate).toBe('%{text}')
  })

  it('聚类顺序稳定且相似向量相邻', () => {
    const order = clusterOrder([[0, 0], [10, 10], [0.1, 0], [10, 10.1]])
    expect(Math.abs(order.indexOf(0) - order.indexOf(2))).toBe(1)
    expect(Math.abs(order.indexOf(1) - order.indexOf(3))).toBe(1)
  })
})
