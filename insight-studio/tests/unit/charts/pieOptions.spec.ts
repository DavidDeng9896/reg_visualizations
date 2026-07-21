import { describe, expect, it } from 'vitest'
import { createChartConfig } from '../../../src/shared/factories'
import { buildPieOption } from '../../../src/modules/charts/runtime/pie'
import { catCols, r, vr } from './helpers'

function cfg() {
  const c = createChartConfig('pie')
  c.configure.categories = { field: 'cat' }
  return c
}

describe('pie builder', () => {
  it('默认 Count 扇区', () => {
    const rows = [r('a', 'g1', 1), r('a', 'g1', 2), r('b', 'g1', 3)]
    const out = buildPieOption({ result: vr(rows, catCols), config: cfg() })
    const data = out.option.series[0].data
    expect(data).toEqual([
      { name: 'a', value: 2, itemStyle: { color: expect.any(String) } },
      { name: 'b', value: 1, itemStyle: { color: expect.any(String) } },
    ])
  })

  it('空值 → [Blank] 扇区', () => {
    const rows = [r('a', 'g1', 1), r(null, 'g1', 2)]
    const out = buildPieOption({ result: vr(rows, catCols), config: cfg() })
    const names = out.option.series[0].data.map((d: { name: string }) => d.name)
    expect(names).toContain('[Blank]')
  })

  it('Measure + sum 聚合', () => {
    const rows = [r('a', 'g1', 10), r('a', 'g1', 20), r('b', 'g1', 5)]
    const c = cfg()
    c.configure.measure = { field: 'val', aggregation: 'sum' }
    const out = buildPieOption({ result: vr(rows, catCols), config: c })
    expect(out.option.series[0].data.map((d: { value: number }) => d.value)).toEqual([30, 5])
  })

  it('非 Count 聚合遇负值 → 剔除并警告', () => {
    const rows = [r('a', 'g1', 10), r('b', 'g1', -5)]
    const c = cfg()
    c.configure.measure = { field: 'val', aggregation: 'sum' }
    const out = buildPieOption({ result: vr(rows, catCols), config: c })
    expect(out.option.series[0].data).toHaveLength(1)
    expect(out.warnings.some((w) => w.includes('负值'))).toBe(true)
  })

  it('Inner Radius > 0 → Donut 半径数组', () => {
    const c = cfg()
    c.style.pie = { ...c.style.pie, innerRadiusPct: 40, outerRadiusPct: 80 }
    const out = buildPieOption({ result: vr([r('a', 'g1', 1)], catCols), config: c })
    expect(out.option.series[0].radius).toEqual(['40%', '80%'])
  })

  it('Hide % 阈值过滤：formatter 小于阈值返回空', () => {
    const c = cfg()
    c.style.pie = { ...c.style.pie, showPercent: true, hideBelowPct: 5, percentColor: '#ffffff' }
    const out = buildPieOption({ result: vr([r('a', 'g1', 1)], catCols), config: c })
    const label = out.option.series[0].label
    expect(label.position).toBe('inside')
    expect(label.color).toBe('#ffffff')
    expect(label.formatter({ percent: 3 })).toBe('')
    expect(label.formatter({ percent: 12 })).toBe('12%')
  })

  it('Show Percentages 关 → 外侧类别名 + 引导线', () => {
    const c = cfg()
    c.style.pie = { ...c.style.pie, showPercent: false }
    const out = buildPieOption({ result: vr([r('a', 'g1', 1)], catCols), config: c })
    expect(out.option.series[0].label.position).toBe('outside')
    expect(out.option.series[0].labelLine.show).toBe(true)
  })

  it('缺 Categories → 空 option', () => {
    const out = buildPieOption({ result: vr([r('a', 'g1', 1)], catCols), config: createChartConfig('pie') })
    expect(out.option).toEqual({})
  })
})
