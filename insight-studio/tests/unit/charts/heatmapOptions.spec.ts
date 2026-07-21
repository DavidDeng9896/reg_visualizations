import { describe, expect, it } from 'vitest'
import { createChartConfig } from '../../../src/shared/factories'
import { buildHeatmapOption, clusterOrder } from '../../../src/modules/charts/runtime/heatmap'
import { vr } from './helpers'
import type { ColumnMeta, Row } from '../../../src/shared/types'

const cols: ColumnMeta[] = [
  { field: 'col', title: 'col', dataType: 'string' },
  { field: 'row', title: 'row', dataType: 'string' },
  { field: 'v', title: 'v', dataType: 'number' },
]

function cell(col: string, row: string, v: number | null): Row {
  return { col, row, v }
}

const rows = [
  cell('c2', 'r1', 10),
  cell('c1', 'r1', 20),
  cell('c2', 'r2', 30),
  cell('c1', 'r2', 40),
]

function cfg() {
  const c = createChartConfig('heatmap')
  c.configure.x = { field: 'col' }
  c.configure.y = { field: 'row' }
  c.configure.color = { field: 'v' }
  return c
}

describe('heatmap builder', () => {
  it('矩阵 + visualMap 范围 + 连续色阶', () => {
    const out = buildHeatmapOption({ result: vr(rows, cols), config: cfg() })
    expect(out.option.xAxis.data).toEqual(['c1', 'c2']) // label 排序
    expect(out.option.yAxis.data).toEqual(['r1', 'r2'])
    const data = out.option.series[0].data
    expect(data).toHaveLength(4)
    // c1/r2 = 40 → [ci=0, ri=1, 40]
    expect(data).toContainEqual([0, 1, 40])
    expect(out.option.visualMap.min).toBe(10)
    expect(out.option.visualMap.max).toBe(40)
    expect(out.option.visualMap.inRange.color.length).toBeGreaterThanOrEqual(3)
  })

  it('重复坐标取 mean', () => {
    const dup = [cell('c1', 'r1', 10), cell('c1', 'r1', 30)]
    const out = buildHeatmapOption({ result: vr(dup, cols), config: cfg() })
    expect(out.option.series[0].data).toEqual([[0, 0, 20]])
  })

  it('行排序 = 均值', () => {
    const many = [
      cell('c1', 'low', 1),
      cell('c2', 'low', 3),
      cell('c1', 'high', 100),
      cell('c2', 'high', 200),
    ]
    const c = cfg()
    c.style.heatmap = { ...c.style.heatmap, rowSort: 'mean' }
    const out = buildHeatmapOption({ result: vr(many, cols), config: c })
    expect(out.option.yAxis.data).toEqual(['low', 'high'])
  })

  it('格内标注开关默认关，开启后 label.show=true', () => {
    const o1 = buildHeatmapOption({ result: vr(rows, cols), config: cfg() })
    expect(o1.option.series[0].label.show).toBe(false)
    const c = cfg()
    c.style.heatmap = { ...c.style.heatmap, showCellValues: true }
    const o2 = buildHeatmapOption({ result: vr(rows, cols), config: c })
    expect(o2.option.series[0].label.show).toBe(true)
  })

  it('聚类开关：重排行/列且长度不变、确定性', () => {
    const c = cfg()
    c.style.heatmap = { ...c.style.heatmap, clusterRows: true, clusterCols: true }
    const o1 = buildHeatmapOption({ result: vr(rows, cols), config: c })
    const o2 = buildHeatmapOption({ result: vr(rows, cols), config: c })
    expect(o1.option.yAxis.data).toEqual(o2.option.yAxis.data)
    expect(o1.option.yAxis.data.slice().sort()).toEqual(['r1', 'r2'])
    expect(o1.option.xAxis.data.slice().sort()).toEqual(['c1', 'c2'])
  })

  it('clusterOrder：相似向量相邻', () => {
    const order = clusterOrder([
      [0, 0],
      [10, 10],
      [0.1, 0],
      [10, 10.1],
    ])
    // [0,0] 与 [0.1,0] 应相邻；[10,10] 与 [10,10.1] 应相邻
    const i0 = order.indexOf(0)
    const i2 = order.indexOf(2)
    const i1 = order.indexOf(1)
    const i3 = order.indexOf(3)
    expect(Math.abs(i0 - i2)).toBe(1)
    expect(Math.abs(i1 - i3)).toBe(1)
  })

  it('visualMap 位置跟随 legend.position', () => {
    const c = cfg()
    c.style.legend = { show: true, position: 'bottom' }
    const out = buildHeatmapOption({ result: vr(rows, cols), config: c })
    expect(out.option.visualMap.orient).toBe('horizontal')
    expect(out.option.visualMap.bottom).toBe(8)
  })

  it('缺 Color value → 空 option', () => {
    const c = createChartConfig('heatmap')
    c.configure.x = { field: 'col' }
    c.configure.y = { field: 'row' }
    const out = buildHeatmapOption({ result: vr(rows, cols), config: c })
    expect(out.option).toEqual({})
  })
})
