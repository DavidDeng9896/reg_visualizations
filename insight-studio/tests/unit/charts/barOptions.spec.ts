import { describe, expect, it } from 'vitest'
import { createChartConfig } from '../../../src/shared/factories'
import { buildBarOption } from '../../../src/modules/charts/runtime/bar'
import { catCols, r, vr } from './helpers'

const rows = [r('a', 'g1', 1), r('a', 'g2', 2), r('b', 'g1', 3), r('b', 'g2', 4), r('b', 'g2', null)]

function cfg() {
  const c = createChartConfig('bar')
  c.configure.x = { field: 'cat' }
  return c
}

describe('bar builder', () => {
  it('无 Y → Count（柱高 = 行数）', () => {
    const out = buildBarOption({ result: vr(rows, catCols), config: cfg() })
    const s0 = out.option.series[0]
    expect(s0.type).toBe('bar')
    expect(s0.data).toEqual([2, 3]) // a:2 行, b:3 行
    expect(out.option.xAxis.type).toBe('category')
    expect(out.option.xAxis.data).toEqual(['a', 'b'])
  })

  it('Y 度量 + sum 聚合', () => {
    const c = cfg()
    c.configure.y = { field: 'val', aggregation: 'sum' }
    const out = buildBarOption({ result: vr(rows, catCols), config: c })
    expect(out.option.series[0].data).toEqual([3, 7])
  })

  it('Series 分组 → 多系列并排', () => {
    const c = cfg()
    c.configure.y = { field: 'val', aggregation: 'sum' }
    c.configure.series = { field: 'grp' }
    const out = buildBarOption({ result: vr(rows, catCols), config: c })
    const bars = out.option.series.filter((s: { type: string }) => s.type === 'bar')
    expect(bars).toHaveLength(2)
    expect(bars[0].name).toBe('g1')
    expect(bars[0].stack).toBeUndefined()
    expect(out.seriesNames).toEqual(['g1', 'g2'])
  })

  it('堆叠模式 stack=total', () => {
    const c = cfg()
    c.configure.series = { field: 'grp' }
    c.style.bar = { ...c.style.bar, mode: 'stacked' }
    const out = buildBarOption({ result: vr(rows, catCols), config: c })
    expect(out.option.series[0].stack).toBe('total')
  })

  it('水平方向：xAxis value / yAxis category', () => {
    const c = cfg()
    c.style.bar = { ...c.style.bar, direction: 'horizontal' }
    const out = buildBarOption({ result: vr(rows, catCols), config: c })
    expect(out.option.xAxis.type).toBe('value')
    expect(out.option.yAxis.type).toBe('category')
  })

  it('Mean + SD → 误差棒 custom series（已知答案 [1,2,3] sd=1）', () => {
    const data = [r('a', 'g1', 1), r('a', 'g1', 2), r('a', 'g1', 3)]
    const c = cfg()
    c.configure.y = { field: 'val', aggregation: 'mean' }
    c.configure.errorBars = 'sd'
    const out = buildBarOption({ result: vr(data, catCols), config: c })
    const custom = out.option.series.find((s: { type: string }) => s.type === 'custom')
    expect(custom).toBeTruthy()
    expect(custom.data[0][1]).toBeCloseTo(1) // low = 2 - 1
    expect(custom.data[0][2]).toBeCloseTo(3) // high = 2 + 1
  })

  it('非 mean 聚合 + errorBars → 警告且无误差棒', () => {
    const c = cfg()
    c.configure.y = { field: 'val', aggregation: 'sum' }
    c.configure.errorBars = 'sem'
    const out = buildBarOption({ result: vr(rows, catCols), config: c })
    expect(out.warnings.some((w) => w.includes('误差棒'))).toBe(true)
    expect(out.option.series.every((s: { type: string }) => s.type !== 'custom')).toBe(true)
  })

  it('Log 轴遇非正值 → 警告并回退 linear', () => {
    const data = [r('a', 'g1', 0), r('b', 'g1', 5)]
    const c = cfg()
    c.configure.y = { field: 'val', aggregation: 'sum' }
    c.style.yAxis = { scale: 'log' }
    const out = buildBarOption({ result: vr(data, catCols), config: c })
    expect(out.option.yAxis.type).toBe('value')
    expect(out.warnings.some((w) => w.includes('Log'))).toBe(true)
  })

  it('Log 轴全正值 → 保留 log', () => {
    const data = [r('a', 'g1', 1), r('b', 'g1', 10)]
    const c = cfg()
    c.configure.y = { field: 'val', aggregation: 'sum' }
    c.style.yAxis = { scale: 'log' }
    const out = buildBarOption({ result: vr(data, catCols), config: c })
    expect(out.option.yAxis.type).toBe('log')
  })

  it('逐系列颜色覆盖 + legend labels', () => {
    const c = cfg()
    c.configure.series = { field: 'grp' }
    c.style.seriesColors = { g1: '#123456' }
    const out = buildBarOption({ result: vr(rows, catCols), config: c })
    expect(out.option.series[0].itemStyle.color).toBe('#123456')
  })

  it('缺 X → 空 option', () => {
    const out = buildBarOption({ result: vr(rows, catCols), config: createChartConfig('bar') })
    expect(out.option).toEqual({})
  })
})
