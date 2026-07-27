import { describe, expect, it } from 'vitest'
import { createChartConfig } from '../../../src/shared/factories'
import { buildScatterOption } from '../../../src/modules/charts/runtime/scatter'
import { catCols, r, vr } from './helpers'

const rows = [r('a', 'g1', 10, 1), r('b', 'g1', 20, 2), r('c', 'g2', 30, 3), r('d', 'g2', 40, 4)]
const cfg = () => {
  const c = createChartConfig('scatter')
  c.configure.x = { field: 'val2' }
  c.configure.values = [{ field: 'val' }]
  return c
}

describe('Plotly scatter builder', () => {
  it('输出 marker trace 与网格轴', () => {
    const out = buildScatterOption({ result: vr(rows, catCols), config: cfg() })
    expect(out.option.data[0]).toMatchObject({ type: 'scatter', mode: 'markers', x: [1, 2, 3, 4], y: [10, 20, 30, 40] })
    expect((out.option.layout.xaxis as { gridcolor: string }).gridcolor).toBe('#e9edf2')
  })

  it('颜色与形状拆分，并映射 Plotly symbol', () => {
    const c = cfg()
    c.configure.color = { field: 'grp' }
    c.configure.shape = { field: 'grp' }
    const out = buildScatterOption({ result: vr(rows, catCols), config: c })
    expect(out.option.data.map((trace) => (trace.marker as { symbol: string }).symbol)).toEqual(['circle', 'triangle-up'])
  })

  it('size 和 jitter 确定性', () => {
    const c = cfg()
    c.configure.size = { field: 'val' }
    c.style.scatter = { ...c.style.scatter, jitter: true, jitterStrength: 1, sizeMin: 4, sizeMax: 24 }
    const one = buildScatterOption({ result: vr(rows, catCols), config: c }).option.data[0]
    const two = buildScatterOption({ result: vr(rows, catCols), config: c }).option.data[0]
    expect(one.x).toEqual(two.x)
    expect((one.marker as { size: number[] }).size).toEqual([4, expect.any(Number), expect.any(Number), 24])
  })

  it('mean 误差棒附着到 trace', () => {
    const c = cfg()
    c.configure.values = [{ field: 'val', aggregation: 'mean' }]
    c.configure.errorBars = 'sem'
    const trace = buildScatterOption({ result: vr([r('a', 'g1', 1, 5), r('b', 'g1', 2, 5), r('c', 'g1', 3, 5)], catCols), config: c }).option.data[0]
    expect((trace.error_y as { array: number[] }).array[0]).toBeCloseTo(1 / Math.sqrt(3))
  })
})
