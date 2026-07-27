import { describe, expect, it } from 'vitest'
import { createChartConfig } from '../../../src/shared/factories'
import { buildBoxOption } from '../../../src/modules/charts/runtime/box'
import { catCols, r, vr } from './helpers'

const cfg = () => {
  const c = createChartConfig('box')
  c.configure.y = { field: 'val' }
  return c
}

describe('Plotly box builder', () => {
  it('输出 five-number arrays', () => {
    const trace = buildBoxOption({ result: vr([r('a', 'g1', 1), r('a', 'g1', 2), r('a', 'g1', 3)], catCols), config: cfg() }).option.data[0]
    expect(trace).toMatchObject({
      type: 'box',
      lowerfence: [1],
      q1: [1.5],
      median: [2],
      q3: [2.5],
      upperfence: [3],
      boxpoints: false,
      boxmean: false,
    })
  })

  it('X 分类和颜色分组生成多个 box traces', () => {
    const c = cfg()
    c.configure.x = { field: 'cat' }
    c.configure.color = { field: 'grp' }
    const out = buildBoxOption({ result: vr([r('a', 'g1', 1), r('a', 'g2', 2)], catCols), config: c })
    expect(out.option.data.filter((trace) => trace.type === 'box')).toHaveLength(2)
    expect(out.seriesNames).toEqual(['g1', 'g2'])
  })

  it('points 使用独立 scatter trace', () => {
    const c = cfg()
    c.style.box = { showPoints: 'all' }
    const out = buildBoxOption({ result: vr([r('a', 'g1', 1), r('a', 'g1', 2)], catCols), config: c })
    expect(out.option.data.find((trace) => trace.type === 'scatter')).toMatchObject({ mode: 'markers', y: [1, 2] })
  })
})
