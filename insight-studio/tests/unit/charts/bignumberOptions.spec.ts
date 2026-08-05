import { describe, expect, it } from 'vitest'
import { createChartConfig } from '../../../src/shared/factories'
import { buildBignumberOption } from '../../../src/modules/charts/runtime/bignumber'
import { validateChartMapping } from '../../../src/modules/charts/registry'
import { EMPTY_FIGURE } from '../../../src/modules/charts/types'
import { catCols, r, vr } from './helpers'

describe('Plotly bignumber builder', () => {
  it('Categories 模式：每个类别一个 indicator', () => {
    const c = createChartConfig('bignumber')
    c.configure.categories = { field: 'cat' }
    const out = buildBignumberOption({
      result: vr(
        [
          r('开发中', 'g1', 1),
          r('开发中', 'g1', 2),
          r('评估中', 'g1', 3),
          r('CRO测试', 'g1', 4),
          r('CRO测试', 'g1', 5),
          r('CRO测试', 'g1', 6),
        ],
        catCols,
      ),
      config: c,
    })
    expect(out.option.data).toHaveLength(3)
    expect(out.option.data.map((d) => d.type)).toEqual(['indicator', 'indicator', 'indicator'])
    expect(out.option.data.map((d) => d.value)).toEqual([2, 1, 3])
    expect(out.seriesNames).toEqual(['开发中', '评估中', 'CRO测试'])
    expect((out.option.data[0].title as { text: string }).text).toBe('开发中')
  })

  it('Metrics 模式：多度量各出一个数字', () => {
    const c = createChartConfig('bignumber')
    c.configure.values = [
      { field: 'val', aggregation: 'sum', label: '开发中' },
      { field: 'val2', aggregation: 'sum', label: '评估中' },
    ]
    const out = buildBignumberOption({
      result: vr([r('a', 'g1', 10, 3), r('b', 'g1', 5, 7)], catCols),
      config: c,
    })
    expect(out.option.data.map((d) => d.value)).toEqual([15, 10])
    expect(out.seriesNames).toEqual(['开发中', '评估中'])
  })

  it('Categories + Measure 聚合', () => {
    const c = createChartConfig('bignumber')
    c.configure.categories = { field: 'cat' }
    c.configure.measure = { field: 'val', aggregation: 'sum' }
    const out = buildBignumberOption({
      result: vr([r('开发中', 'g1', 10), r('开发中', 'g1', 5), r('评估中', 'g1', 3)], catCols),
      config: c,
    })
    expect(out.option.data.map((d) => d.value)).toEqual([15, 3])
  })

  it('Metrics 优先于 Categories', () => {
    const c = createChartConfig('bignumber')
    c.configure.values = [{ field: 'val', aggregation: 'sum', label: '总量' }]
    c.configure.categories = { field: 'cat' }
    const out = buildBignumberOption({
      result: vr([r('a', 'g1', 4), r('b', 'g1', 6)], catCols),
      config: c,
    })
    expect(out.option.data).toHaveLength(1)
    expect(out.option.data[0].value).toBe(10)
    expect(out.seriesNames).toEqual(['总量'])
  })

  it('grid 布局写入多行 domain', () => {
    const c = createChartConfig('bignumber')
    c.configure.categories = { field: 'cat' }
    c.style.bignumber = { ...c.style.bignumber, layout: 'grid' }
    const out = buildBignumberOption({
      result: vr([r('a', 'g1', 1), r('b', 'g1', 1), r('c', 'g1', 1), r('d', 'g1', 1)], catCols),
      config: c,
    })
    expect(out.option.data).toHaveLength(4)
    const d0 = out.option.data[0].domain as { x: number[]; y: number[] }
    const d2 = out.option.data[2].domain as { x: number[]; y: number[] }
    // 2 列：第 3 项应落在第二行
    expect(d0.y[1]).toBeGreaterThan(d2.y[1])
  })

  it('compact 使用 SI valueformat', () => {
    const c = createChartConfig('bignumber')
    c.configure.values = [{ field: 'val', aggregation: 'sum' }]
    c.style.bignumber = { ...c.style.bignumber, compact: true }
    const trace = buildBignumberOption({
      result: vr([r('a', 'g1', 1200)], catCols),
      config: c,
    }).option.data[0]
    expect((trace.number as { valueformat: string }).valueformat).toBe('~s')
  })

  it('缺映射返回 EMPTY_FIGURE', () => {
    const out = buildBignumberOption({ result: vr([], catCols), config: createChartConfig('bignumber') })
    expect(out.option).toEqual(EMPTY_FIGURE)
  })

  it('校验：Metrics 或 Categories 至少其一', () => {
    const empty = createChartConfig('bignumber')
    expect(validateChartMapping(empty, catCols).some((e) => e.kind === 'required')).toBe(true)

    const withCats = createChartConfig('bignumber')
    withCats.configure.categories = { field: 'cat' }
    expect(validateChartMapping(withCats, catCols)).toEqual([])

    const withVals = createChartConfig('bignumber')
    withVals.configure.values = [{ field: 'val', aggregation: 'sum' }]
    expect(validateChartMapping(withVals, catCols)).toEqual([])
  })
})
