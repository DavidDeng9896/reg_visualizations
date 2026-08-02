import { describe, expect, it } from 'vitest'
import { createChartConfig } from '../../../src/shared/factories'
import { ROW_ID_FIELD } from '../../../src/shared/types'
import { buildBarOption } from '../../../src/modules/charts/runtime/bar'
import { buildBoxOption } from '../../../src/modules/charts/runtime/box'
import { buildScatterOption } from '../../../src/modules/charts/runtime/scatter'
import { catCols, r, vr } from './helpers'

const rows = [r('a', 'g1', 1), r('a', 'g2', 2), r('b', 'g1', 3), r('b', 'g2', 4)]
const cfg = () => {
  const c = createChartConfig('bar')
  c.configure.x = { field: 'cat' }
  c.configure.y = { field: 'val', aggregation: 'sum' }
  return c
}

describe('参考线 shapes', () => {
  it('Y/X 参考线进入 layout.shapes，未填数值忽略', () => {
    const c = cfg()
    c.style.referenceLines = [
      { axis: 'y', value: 2, label: '阈值' },
      { axis: 'x', value: 1 },
      { axis: 'y' },
    ]
    const layout = buildBarOption({ result: vr(rows, catCols), config: c }).option.layout
    const shapes = layout.shapes as Array<Record<string, unknown>>
    expect(shapes).toHaveLength(2)
    expect(shapes[0]).toMatchObject({ type: 'line', yref: 'y', y0: 2, label: { text: '阈值' } })
    expect(shapes[1]).toMatchObject({ type: 'line', xref: 'x', x0: 1 })
  })
})

describe('bar 数据标签与 100% 堆叠', () => {
  it('showValues → text 标注附着', () => {
    const c = cfg()
    c.style.bar = { showValues: true }
    const trace = buildBarOption({ result: vr(rows, catCols), config: c }).option.data[0]
    expect(trace.text).toEqual(['3', '7'])
    expect(trace.textposition).toBe('outside')
  })

  it('percent 模式按 cat 归一且轴为百分比', () => {
    const c = cfg()
    c.configure.series = { field: 'grp' }
    c.style.bar = { mode: 'percent' }
    const out = buildBarOption({ result: vr(rows, catCols), config: c })
    const [g1, g2] = out.option.data
    const g1y = g1.y as number[]
    const g2y = g2.y as number[]
    // cat a: g1=1/(1+2), g2=2/3；cat b: g1=3/7, g2=4/7
    expect(g1y[0]).toBeCloseTo(1 / 3, 6)
    expect(g2y[0]).toBeCloseTo(2 / 3, 6)
    expect(g1y[0] + g2y[0]).toBeCloseTo(1, 6)
    expect(out.option.layout.barmode).toBe('stack')
    expect((out.option.layout.yaxis as { tickformat: string }).tickformat).toBe('.0%')
  })
})

describe('box 小提琴形态', () => {
  const boxCols = [
    { field: 'cat', title: 'cat', dataType: 'string' as const },
    { field: 'val', title: 'val', dataType: 'number' as const },
  ]
  const boxRows = [
    { [ROW_ID_FIELD]: 'r1', cat: 'a', val: 1 },
    { [ROW_ID_FIELD]: 'r2', cat: 'a', val: 2 },
    { [ROW_ID_FIELD]: 'r3', cat: 'b', val: 3 },
    { [ROW_ID_FIELD]: 'r4', cat: 'b', val: 4 },
  ]
  it('mode=violin → violin trace（保留分组与点显示）', () => {
    const c = createChartConfig('box')
    c.configure.y = { field: 'val' }
    c.configure.x = { field: 'cat' }
    c.style.box = { mode: 'violin', showPoints: 'all' }
    const out = buildBoxOption({ result: vr(boxRows, boxCols), config: c })
    const trace = out.option.data[0]
    expect(trace.type).toBe('violin')
    expect(trace.points).toBe('all')
    expect(out.option.data).toHaveLength(1)
  })

  it('默认 mode=box 行为不变', () => {
    const c = createChartConfig('box')
    c.configure.y = { field: 'val' }
    c.configure.x = { field: 'cat' }
    const out = buildBoxOption({ result: vr(boxRows, boxCols), config: c })
    expect(out.option.data[0].type).toBe('box')
  })
})

describe('拟合置信带与注释', () => {
  const pts = [1, 2, 3, 4, 5].map((n, i) => ({ [ROW_ID_FIELD]: `r${i}`, n, val: 2 * n + 1 }))
  const cols = [
    { field: 'n', title: 'n', dataType: 'number' as const },
    { field: 'val', title: 'val', dataType: 'number' as const },
  ]
  const scatterCfg = () => {
    const c = createChartConfig('scatter')
    c.configure.x = { field: 'n' }
    c.configure.values = [{ field: 'val' }]
    c.configure.regression = { model: 'linear' }
    return c
  }

  it('Linear 拟合渲染置信带（fill 到上边界）', () => {
    const out = buildScatterOption({ result: vr(pts, cols), config: scatterCfg() })
    const band = out.option.data.filter((t) => t.fill === 'tonexty')
    expect(band).toHaveLength(1)
    expect(band[0].showlegend).toBe(false)
    expect((band[0].y as number[]).length).toBeGreaterThan(0)
  })

  it('fitAnnotation 关闭时无注释，开启后方程 + R² 上屏', () => {
    const off = buildScatterOption({ result: vr(pts, cols), config: scatterCfg() })
    expect(off.option.layout.annotations ?? []).toHaveLength(0)

    const c = scatterCfg()
    c.style.fitAnnotation = true
    const on = buildScatterOption({ result: vr(pts, cols), config: c })
    const annotations = on.option.layout.annotations as Array<{ text: string }>
    expect(annotations).toHaveLength(1)
    expect(annotations[0].text).toContain('y =')
    expect(annotations[0].text).toContain('R²=1.000')
  })
})
