import { describe, expect, it } from 'vitest'
import { createChartConfig } from '../../../src/shared/factories'
import { buildPieOption } from '../../../src/modules/charts/runtime/pie'
import { EMPTY_FIGURE } from '../../../src/modules/charts/types'
import { catCols, r, vr } from './helpers'

const cfg = () => {
  const c = createChartConfig('pie')
  c.configure.categories = { field: 'cat' }
  return c
}

describe('Plotly pie builder', () => {
  it('输出 labels/values/色板颜色与 donut hole', () => {
    const c = cfg()
    c.style.pie = { ...c.style.pie, innerRadiusPct: 40, outerRadiusPct: 80 }
    const out = buildPieOption({ result: vr([r('a', 'g1', 1), r('a', 'g1', 2), r('b', 'g1', 3)], catCols), config: c })
    const trace = out.option.data[0]
    expect(trace.labels).toEqual(['a', 'b'])
    expect(trace.values).toEqual([2, 1])
    expect((trace.marker as { colors: string[] }).colors).toEqual(['#1d3fbf', '#df5638'])
    expect(trace.hole).toBe(0.4)
  })

  it('百分比阈值写入 text', () => {
    const c = cfg()
    c.style.pie = { ...c.style.pie, hideBelowPct: 40, showPercent: true }
    c.configure.measure = { field: 'val', aggregation: 'sum' }
    const trace = buildPieOption({ result: vr([r('a', 'g1', 1), r('b', 'g1', 9)], catCols), config: c }).option.data[0]
    expect(trace.text).toEqual(['', '90%'])
    expect(trace.textinfo).toBe('text')
  })

  it('负值剔除并警告', () => {
    const c = cfg()
    c.configure.measure = { field: 'val', aggregation: 'sum' }
    const out = buildPieOption({ result: vr([r('a', 'g1', 10), r('b', 'g1', -5)], catCols), config: c })
    expect(out.option.data[0].values).toEqual([10])
    expect(out.warnings.some((w) => w.includes('负值'))).toBe(true)
  })

  it('缺映射返回 EMPTY_FIGURE', () => {
    const out = buildPieOption({ result: vr([], catCols), config: createChartConfig('pie') })
    expect(out.option).toEqual(EMPTY_FIGURE)
  })
})
