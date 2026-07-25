import { describe, expect, it } from 'vitest'
import { createChartConfig } from '../../../src/shared/factories'
import { buildLineOption } from '../../../src/modules/charts/runtime/line'
import { catCols, r, vr } from './helpers'

const cfg = () => {
  const c = createChartConfig('line')
  c.configure.x = { field: 'cat' }
  c.configure.values = [{ field: 'val' }]
  return c
}

describe('Plotly line builder', () => {
  it('输出 lines+markers 与分类轴', () => {
    const out = buildLineOption({ result: vr([r('a', 'g1', 1), r('b', 'g1', 2)], catCols), config: cfg() })
    expect(out.option.data[0]).toMatchObject({ type: 'scatter', mode: 'lines+markers', x: ['a', 'b'], y: [1, 2] })
    expect((out.option.layout.xaxis as { type: string }).type).toBe('category')
  })

  it('分组与双 Y 轴', () => {
    const c = cfg()
    c.configure.series = { field: 'grp' }
    c.configure.values = [{ field: 'val' }, { field: 'val2', axis: { side: 'right' } }]
    const out = buildLineOption({ result: vr([r('a', 'g1', 1, 100), r('a', 'g2', 2, 200)], catCols), config: c })
    expect(out.option.data).toHaveLength(4)
    expect(out.option.data[2].yaxis).toBe('y2')
    expect(out.option.layout.yaxis2).toBeTruthy()
  })

  it('聚合并携带 customdata', () => {
    const c = cfg()
    c.configure.values = [{ field: 'val', aggregation: 'mean' }]
    const trace = buildLineOption({ result: vr([r('a', 'g1', 1), r('a', 'g1', 3)], catCols), config: c }).option.data[0]
    expect(trace.y).toEqual([2])
    expect(trace.customdata).toHaveLength(1)
  })
})
