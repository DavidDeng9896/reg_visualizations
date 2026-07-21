import { describe, expect, it } from 'vitest'
import { createChartConfig } from '../../../src/shared/factories'
import { buildBoxOption } from '../../../src/modules/charts/runtime/box'
import { catCols, r, vr } from './helpers'

function cfg() {
  const c = createChartConfig('box')
  c.configure.y = { field: 'val' }
  return c
}

describe('box builder', () => {
  it('仅 Y → 单箱图', () => {
    const rows = [r('a', 'g1', 1), r('a', 'g1', 2), r('a', 'g1', 3)]
    const out = buildBoxOption({ result: vr(rows, catCols), config: cfg() })
    const custom = out.option.series.find((s: { type: string }) => s.type === 'custom')
    expect(custom).toBeTruthy()
    expect(custom.data).toHaveLength(1)
    // value: [pos, low, q1, q2, q3, high, ...]
    expect(custom.data[0].value.slice(1, 6)).toEqual([1, 1.5, 2, 2.5, 3])
  })

  it('X Categories → 多箱 + 五数正确', () => {
    const rows = [
      r('a', 'g1', 1),
      r('a', 'g1', 2),
      r('a', 'g1', 3),
      r('b', 'g1', 10),
      r('b', 'g1', 20),
      r('b', 'g1', 30),
    ]
    const c = cfg()
    c.configure.x = { field: 'cat' }
    const out = buildBoxOption({ result: vr(rows, catCols), config: c })
    const custom = out.option.series.find((s: { type: string }) => s.type === 'custom')
    expect(custom.data).toHaveLength(2)
    expect(custom.data[1].value.slice(1, 6)).toEqual([10, 15, 20, 25, 30])
    expect(out.option.xAxis.data).toEqual(['a', 'b'])
  })

  it('Show Points = none → 无散点系列；outliers → 仅离群', () => {
    const rows = [1, 2, 3, 4, 5, 100].map((v) => r('a', 'g1', v))
    const c1 = cfg()
    c1.style.box = { showPoints: 'none' }
    const o1 = buildBoxOption({ result: vr(rows, catCols), config: c1 })
    expect(o1.option.series.every((s: { type: string }) => s.type !== 'scatter')).toBe(true)

    const c2 = cfg()
    c2.style.box = { showPoints: 'outliers' }
    const o2 = buildBoxOption({ result: vr(rows, catCols), config: c2 })
    const points = o2.option.series.filter((s: { type: string }) => s.type === 'scatter')
    const allPoints = points.flatMap((s: { data: { value: number[] }[] }) => s.data)
    expect(allPoints).toHaveLength(1)
    expect(allPoints[0].value[1]).toBe(100)

    const c3 = cfg()
    c3.style.box = { showPoints: 'all' }
    const o3 = buildBoxOption({ result: vr(rows, catCols), config: c3 })
    const all3 = o3.option.series
      .filter((s: { type: string }) => s.type === 'scatter')
      .flatMap((s: { data: unknown[] }) => s.data)
    expect(all3).toHaveLength(6)
  })

  it('Color 分组 → 箱数翻倍 + legend', () => {
    const rows = [r('a', 'g1', 1), r('a', 'g1', 3), r('a', 'g2', 10), r('a', 'g2', 30)]
    const c = cfg()
    c.configure.x = { field: 'cat' }
    c.configure.color = { field: 'grp' }
    const out = buildBoxOption({ result: vr(rows, catCols), config: c })
    const custom = out.option.series.find((s: { type: string }) => s.type === 'custom')
    expect(custom.data).toHaveLength(2)
    expect(out.option.legend).toBeTruthy()
    expect(out.seriesNames).toEqual(['g1', 'g2'])
  })

  it('Y 轴 Log 遇非正值 → 警告并回退', () => {
    const rows = [r('a', 'g1', 0), r('a', 'g1', 5)]
    const c = cfg()
    c.style.yAxis = { scale: 'log' }
    const out = buildBoxOption({ result: vr(rows, catCols), config: c })
    expect(out.option.yAxis.type).toBe('value')
    expect(out.warnings.some((w) => w.includes('Log'))).toBe(true)
  })

  it('4B：无 Jitter（点 x 与箱中心一致，不偏移）', () => {
    const rows = [r('a', 'g1', 1), r('a', 'g1', 2), r('a', 'g1', 3)]
    const c = cfg()
    c.style.box = { showPoints: 'all' }
    const out = buildBoxOption({ result: vr(rows, catCols), config: c })
    const custom = out.option.series.find((s: { type: string }) => s.type === 'custom')
    const points = out.option.series.filter((s: { type: string }) => s.type === 'scatter').flatMap((s: { data: { value: number[] }[] }) => s.data)
    expect(points.every((p: { value: number[] }) => p.value[0] === custom.data[0].value[0])).toBe(true)
  })
})
