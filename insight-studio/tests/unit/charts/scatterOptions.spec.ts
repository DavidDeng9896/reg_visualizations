import { describe, expect, it } from 'vitest'
import { createChartConfig } from '../../../src/shared/factories'
import { buildScatterOption } from '../../../src/modules/charts/runtime/scatter'
import { catCols, r, vr } from './helpers'

function cfg() {
  const c = createChartConfig('scatter')
  c.configure.x = { field: 'val2' }
  c.configure.values = [{ field: 'val' }]
  return c
}

const rows = [
  r('a', 'g1', 10, 1),
  r('b', 'g1', 20, 2),
  r('c', 'g2', 30, 3),
  r('d', 'g2', 40, 4),
]

describe('scatter builder', () => {
  it('基础点图 + 网格线默认开', () => {
    const out = buildScatterOption({ result: vr(rows, catCols), config: cfg() })
    const s = out.option.series[0]
    expect(s.type).toBe('scatter')
    expect(s.data).toHaveLength(4)
    expect(s.data[0].value).toEqual([1, 10])
    expect(out.option.xAxis[0].splitLine.show).toBe(true)
    expect(out.option.yAxis[0].splitLine.show).toBe(true)
  })

  it('Color 分组 → 每色值一个系列', () => {
    const c = cfg()
    c.configure.color = { field: 'grp' }
    const out = buildScatterOption({ result: vr(rows, catCols), config: c })
    const scatters = out.option.series.filter((s: { type: string }) => s.type === 'scatter')
    expect(scatters).toHaveLength(2)
    expect(scatters.map((s: { name: string }) => s.name)).toEqual(['g1', 'g2'])
    expect(scatters[0].data).toHaveLength(2)
  })

  it('Shape 分组 → 不同 symbol（5 种系统形状循环）', () => {
    const c = cfg()
    c.configure.shape = { field: 'grp' }
    const out = buildScatterOption({ result: vr(rows, catCols), config: c })
    const scatters = out.option.series.filter((s: { type: string }) => s.type === 'scatter')
    expect(scatters[0].symbol).toBe('circle')
    expect(scatters[1].symbol).toBe('triangle')
  })

  it('Size 度量 → 点半径 min/max 映射', () => {
    const c = cfg()
    c.configure.size = { field: 'val' } // 10..40
    c.style.scatter = { ...c.style.scatter, sizeMin: 4, sizeMax: 24 }
    const out = buildScatterOption({ result: vr(rows, catCols), config: c })
    const s = out.option.series[0]
    const sizes = s.data.map((d: { symbolSize?: number }) => d.symbolSize)
    expect(Math.min(...sizes)).toBeCloseTo(4)
    expect(Math.max(...sizes)).toBeCloseTo(24)
  })

  it('Jitter：确定性（两次构建一致）且偏移有界', () => {
    const c = cfg()
    c.style.scatter = { ...c.style.scatter, jitter: true, jitterStrength: 1 }
    const o1 = buildScatterOption({ result: vr(rows, catCols), config: c })
    const o2 = buildScatterOption({ result: vr(rows, catCols), config: c })
    const d1 = o1.option.series[0].data.map((d: { value: number[] }) => d.value)
    const d2 = o2.option.series[0].data.map((d: { value: number[] }) => d.value)
    expect(d1).toEqual(d2)
    // 至少一个点偏离原始值
    expect(d1.some((v: number[], i: number) => v[0] !== rows[i].val2 || v[1] !== rows[i].val)).toBe(true)
  })

  it('Mean 聚合 + SEM → 误差棒 custom series', () => {
    const data = [r('a', 'g1', 1, 5), r('b', 'g1', 2, 5), r('c', 'g1', 3, 5)]
    const c = cfg()
    c.configure.values = [{ field: 'val', aggregation: 'mean' }]
    c.configure.errorBars = 'sem'
    const out = buildScatterOption({ result: vr(data, catCols), config: c })
    const custom = out.option.series.find((s: { type: string }) => s.type === 'custom')
    expect(custom).toBeTruthy()
    // mean=2, sd=1, sem=1/√3
    expect(custom.data[0][1]).toBeCloseTo(2 - 1 / Math.sqrt(3), 6)
    expect(custom.data[0][2]).toBeCloseTo(2 + 1 / Math.sqrt(3), 6)
  })

  it('双 Y 轴', () => {
    const c = cfg()
    c.configure.values = [{ field: 'val' }, { field: 'val2', axis: { side: 'right' } }]
    const out = buildScatterOption({ result: vr(rows, catCols), config: c })
    expect(out.option.yAxis).toHaveLength(2)
    const scatters = out.option.series.filter((s: { type: string }) => s.type === 'scatter')
    expect(scatters[1].yAxisIndex).toBe(1)
  })

  it('非数值点被剔除并警告', () => {
    const data = [r('a', 'g1', 10, 1), { cat: 'b', grp: 'g1', val: 'oops', val2: 2 }]
    const out = buildScatterOption({ result: vr(data, catCols), config: cfg() })
    expect(out.option.series[0].data).toHaveLength(1)
    expect(out.warnings.some((w) => w.includes('非数值'))).toBe(true)
  })
})
