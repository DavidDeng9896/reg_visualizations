import { describe, expect, it } from 'vitest'
import { createChartConfig } from '../../../src/shared/factories'
import { buildBarOption } from '../../../src/modules/charts/runtime/bar'
import { EMPTY_FIGURE } from '../../../src/modules/charts/types'
import { catCols, r, vr } from './helpers'

const rows = [r('a', 'g1', 1), r('a', 'g2', 2), r('b', 'g1', 3), r('b', 'g2', 4)]
const cfg = () => {
  const c = createChartConfig('bar')
  c.configure.x = { field: 'cat' }
  return c
}

describe('Plotly bar builder', () => {
  it('输出分类坐标和柱值', () => {
    const out = buildBarOption({ result: vr(rows, catCols), config: cfg() })
    expect(out.option.data[0]).toMatchObject({ type: 'bar', x: ['a', 'b'], y: [2, 2] })
    expect((out.option.layout.xaxis as { type: string }).type).toBe('category')
  })

  it('分组、堆叠与水平布局', () => {
    const c = cfg()
    c.configure.series = { field: 'grp' }
    c.style.bar = { mode: 'stacked', direction: 'horizontal' }
    const out = buildBarOption({ result: vr(rows, catCols), config: c })
    expect(out.option.data).toHaveLength(2)
    expect(out.option.data[0].orientation).toBe('h')
    expect(out.option.layout.barmode).toBe('stack')
  })

  it('mean 误差棒附着到 trace', () => {
    const c = cfg()
    c.configure.y = { field: 'val', aggregation: 'mean' }
    c.configure.errorBars = 'sd'
    const trace = buildBarOption({ result: vr([r('a', 'g1', 1), r('a', 'g1', 2), r('a', 'g1', 3)], catCols), config: c }).option.data[0]
    expect((trace.error_y as { array: number[] }).array[0]).toBeCloseTo(1)
  })

  it('log 回退并保留系列覆盖色', () => {
    const c = cfg()
    c.configure.y = { field: 'val', aggregation: 'sum' }
    c.style.yAxis = { scale: 'log' }
    c.style.seriesColors = { 'Sum of val': '#123456' }
    const out = buildBarOption({ result: vr([r('a', 'g1', 0)], catCols), config: c })
    expect((out.option.layout.yaxis as { type: string }).type).toBe('linear')
    expect((out.option.data[0].marker as { color: string }).color).toBe('#123456')
    expect(out.warnings.some((w) => w.includes('Log'))).toBe(true)
  })

  it('缺映射返回 EMPTY_FIGURE', () => {
    expect(buildBarOption({ result: vr(rows, catCols), config: createChartConfig('bar') }).option).toEqual(EMPTY_FIGURE)
  })
})
