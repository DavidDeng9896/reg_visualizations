import { describe, expect, it } from 'vitest'
import { createChartConfig } from '../../../src/shared/factories'
import { buildLineOption } from '../../../src/modules/charts/runtime/line'
import { catCols, r, vr } from './helpers'

function cfg() {
  const c = createChartConfig('line')
  c.configure.x = { field: 'cat' }
  c.configure.values = [{ field: 'val' }]
  return c
}

describe('line builder', () => {
  it('基础：category x + 单度量单系列', () => {
    const rows = [r('a', 'g1', 1), r('b', 'g1', 2)]
    const out = buildLineOption({ result: vr(rows, catCols), config: cfg() })
    const lines = out.option.series.filter((s: { type: string }) => s.type === 'line')
    expect(lines).toHaveLength(1)
    expect(lines[0].data).toEqual([
      ['a', 1],
      ['b', 2],
    ])
    expect(out.option.xAxis[0].type).toBe('category')
  })

  it('Series 拆分多线', () => {
    const rows = [r('a', 'g1', 1), r('a', 'g2', 5), r('b', 'g1', 2), r('b', 'g2', 6)]
    const c = cfg()
    c.configure.series = { field: 'grp' }
    const out = buildLineOption({ result: vr(rows, catCols), config: c })
    const lines = out.option.series.filter((s: { type: string }) => s.type === 'line')
    expect(lines).toHaveLength(2)
    expect(lines.map((l: { name: string }) => l.name)).toEqual(['g1', 'g2'])
  })

  it('双 Y 轴：右轴度量 → yAxisIndex=1 且出现两个 y 轴', () => {
    const rows = [r('a', 'g1', 1, 100), r('b', 'g1', 2, 200)]
    const c = cfg()
    c.configure.values = [{ field: 'val' }, { field: 'val2', axis: { side: 'right' } }]
    const out = buildLineOption({ result: vr(rows, catCols), config: c })
    expect(out.option.yAxis).toHaveLength(2)
    const lines = out.option.series.filter((s: { type: string }) => s.type === 'line')
    expect(lines[0].yAxisIndex).toBe(0)
    expect(lines[1].yAxisIndex).toBe(1)
  })

  it('轴级聚合：mean 按 x 分桶', () => {
    const rows = [r('a', 'g1', 1), r('a', 'g1', 3), r('b', 'g1', 10)]
    const c = cfg()
    c.configure.values = [{ field: 'val', aggregation: 'mean' }]
    const out = buildLineOption({ result: vr(rows, catCols), config: c })
    const line = out.option.series.find((s: { type: string }) => s.type === 'line')
    expect(line.data).toEqual([
      ['a', 2],
      ['b', 10],
    ])
  })

  it('数值 X → value 轴且按 x 排序', () => {
    const cols = [
      { field: 'n', title: 'n', dataType: 'number' as const },
      { field: 'val', title: 'val', dataType: 'number' as const },
    ]
    const rows = [
      { n: 3, val: 30 },
      { n: 1, val: 10 },
      { n: 2, val: 20 },
    ]
    const c = cfg()
    c.configure.x = { field: 'n' }
    const out = buildLineOption({ result: vr(rows, cols), config: c })
    const line = out.option.series.find((s: { type: string }) => s.type === 'line')
    expect(line.data.map((d: number[]) => d[0])).toEqual([1, 2, 3])
    expect(out.option.xAxis[0].type).toBe('value')
  })

  it('分面 One Per Measure → 多 grid，且分面后仍尊重 Y Axis Side', () => {
    const rows = [r('a', 'g1', 1, 100)]
    const c = cfg()
    c.configure.values = [{ field: 'val' }, { field: 'val2', axis: { side: 'right' } }]
    c.style.line = { facet: 'per-measure' }
    const out = buildLineOption({ result: vr(rows, catCols), config: c })
    expect(out.option.grid).toHaveLength(2)
    expect(out.option.xAxis).toHaveLength(2)
    expect(out.option.yAxis).toHaveLength(4)
    const lines = out.option.series.filter((s: { type: string }) => s.type === 'line')
    // 第二个度量在 grid 1 且右轴（yAxisIndex = 1*2+1 = 3）
    expect(lines[1].yAxisIndex).toBe(3)
    expect(lines[1].xAxisIndex).toBe(1)
  })

  it('5B：无误差棒 / 无线宽设置残留（series 全为 line 且 lineStyle.width 固定）', () => {
    const rows = [r('a', 'g1', 1), r('a', 'g1', 3)]
    const c = cfg()
    c.configure.errorBars = 'sd'
    const out = buildLineOption({ result: vr(rows, catCols), config: c })
    expect(out.option.series.every((s: { type: string }) => s.type === 'line')).toBe(true)
    expect(out.option.series[0].lineStyle.width).toBe(2)
  })

  it('无 Series 单度量 → Default Color 生效', () => {
    const rows = [r('a', 'g1', 1)]
    const c = cfg()
    c.style.line = { defaultColor: '#123456' }
    const out = buildLineOption({ result: vr(rows, catCols), config: c })
    expect(out.option.series[0].itemStyle.color).toBe('#123456')
  })
})
