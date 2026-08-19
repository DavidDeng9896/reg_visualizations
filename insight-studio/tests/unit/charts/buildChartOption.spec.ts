import { describe, expect, it } from 'vitest'
import { createChartConfig } from '../../../src/shared/factories'
import { buildChartOption } from '../../../src/modules/charts/registry'
import { EMPTY_FIGURE } from '../../../src/modules/charts/types'
import { catCols, r, vr } from './helpers'

describe('buildChartOption 规范化', () => {
  it('bignumber 旧配置 y 槽位仍能出 KPI 数字', () => {
    const c = createChartConfig('bignumber')
    c.configure = { y: { field: 'val' } } as typeof c.configure
    const out = buildChartOption(vr([r('a', 'g1', 12), r('b', 'g1', 8)], catCols), c, 'KPI')
    expect(out.option).not.toEqual(EMPTY_FIGURE)
    expect(out.option.data[0]).toMatchObject({ type: 'indicator', value: 20 })
  })

  it('hideTitle 不剥掉用户在 STYLE 里写的 Title', () => {
    const c = createChartConfig('bar')
    c.configure.x = { field: 'cat' }
    c.configure.y = { field: 'val', aggregation: 'sum' }
    c.style.title = '自定义标题'
    const out = buildChartOption(vr([r('a', 'g1', 1)], catCols), c, 'Bar chart', [], { hideTitle: true })
    expect(out.option.layout.title).toMatchObject({ text: '自定义标题' })
  })
})
