import { describe, expect, it } from 'vitest'
import { createChartConfig } from '../../../src/shared/factories'
import { getChartDef, validateChartMapping } from '../../../src/modules/charts/registry'
import { migrateConfigure, migrateStyle } from '../../../src/modules/charts/runtime/mapping'
import { catCols } from './helpers'

describe('validateMapping', () => {
  it('必填缺失 → required 错误', () => {
    const c = createChartConfig('bar')
    const errors = validateChartMapping(c, catCols)
    expect(errors.some((e) => e.slot === 'x' && e.kind === 'required')).toBe(true)
  })

  it('绑定列消失 → missing-column 错误', () => {
    const c = createChartConfig('bar')
    c.configure.x = { field: 'ghost' }
    const errors = validateChartMapping(c, catCols)
    expect(errors.some((e) => e.kind === 'missing-column' && e.message.includes('ghost'))).toBe(true)
  })

  it('类型不符（数值槽绑文本列）→ 错误', () => {
    const c = createChartConfig('scatter')
    c.configure.x = { field: 'val' }
    c.configure.values = [{ field: 'cat' }] // cat 是 string
    const errors = validateChartMapping(c, catCols)
    expect(errors.some((e) => e.slot === 'values')).toBe(true)
  })

  it('多值槽（values）必填：空数组 → required', () => {
    const c = createChartConfig('line')
    c.configure.x = { field: 'cat' }
    const errors = validateChartMapping(c, catCols)
    expect(errors.some((e) => e.slot === 'values' && e.kind === 'required')).toBe(true)
  })

  it('合法映射 → 无错误', () => {
    const c = createChartConfig('bar')
    c.configure.x = { field: 'cat' }
    c.configure.y = { field: 'val', aggregation: 'sum' }
    expect(validateChartMapping(c, catCols)).toEqual([])
  })
})

describe('图种互切迁移（11A）', () => {
  it('bar → scatter：x→x、y→values、series→color（2B）', () => {
    const from = createChartConfig('bar')
    from.configure.x = { field: 'val' }
    from.configure.y = { field: 'val2', aggregation: 'sum' }
    from.configure.series = { field: 'grp' }
    const { configure, carried } = migrateConfigure(from, getChartDef('scatter'), catCols)
    expect(carried).toBe(true)
    expect(configure.x?.field).toBe('val')
    expect(configure.values?.[0]?.field).toBe('val2')
    expect(configure.color?.field).toBe('grp')
    expect(configure.series).toBeUndefined()
  })

  it('scatter → bar：color→series、values[0]→y', () => {
    const from = createChartConfig('scatter')
    from.configure.x = { field: 'val' }
    from.configure.values = [{ field: 'val2' }]
    from.configure.color = { field: 'grp' }
    const { configure } = migrateConfigure(from, getChartDef('bar'), catCols)
    expect(configure.x?.field).toBe('val')
    expect(configure.y?.field).toBe('val2')
    expect(configure.series?.field).toBe('grp')
  })

  it('pie → bar：categories→x、measure→y', () => {
    const from = createChartConfig('pie')
    from.configure.categories = { field: 'cat' }
    from.configure.measure = { field: 'val', aggregation: 'mean' }
    const { configure } = migrateConfigure(from, getChartDef('bar'), catCols)
    expect(configure.x?.field).toBe('cat')
    expect(configure.y?.field).toBe('val')
    expect(configure.y?.aggregation).toBe('mean')
  })

  it('类型不符的目标槽位 → 清空（文本列不能进 line Y）', () => {
    const from = createChartConfig('bar')
    from.configure.x = { field: 'cat' }
    from.configure.y = { field: 'cat' } // 文本列不能进 line values（仅 number）
    from.configure.series = { field: 'cat' }
    const { configure } = migrateConfigure(from, getChartDef('line'), catCols)
    // line values 只接受 number；x/series 保留
    expect(configure.x?.field).toBe('cat')
    expect(configure.values).toBeUndefined()
    expect(configure.series?.field).toBe('cat')
  })

  it('不可聚合槽位剥离聚合（y→series 不带 aggregation）', () => {
    const from = createChartConfig('scatter')
    from.configure.x = { field: 'val' }
    from.configure.values = [{ field: 'val2', aggregation: 'mean' }]
    from.configure.color = { field: 'grp' }
    const { configure } = migrateConfigure(from, getChartDef('bar'), catCols)
    expect(configure.series?.aggregation).toBeUndefined()
  })

  it('迁入 heatmap：默认连续色板；迁出回分类色板', () => {
    const from = createChartConfig('scatter')
    from.configure.x = { field: 'cat' }
    from.configure.values = [{ field: 'val' }]
    const into = migrateConfigure(from, getChartDef('heatmap'), catCols)
    expect(into.configure.palette).toBe('blues')
    const back = migrateConfigure(
      { ...from, chartType: 'heatmap', configure: { ...into.configure } },
      getChartDef('bar'),
      catCols,
    )
    expect(back.configure.palette).toBe('light')
  })

  it('样式迁移保留通用项、丢弃图种专属', () => {
    const from = createChartConfig('bar')
    from.style.title = 'T'
    from.style.opacity = 0.5
    from.style.bar = { direction: 'horizontal' }
    from.style.seriesColors = { g1: '#111111' }
    const style = migrateStyle(from.style)
    expect(style.title).toBe('T')
    expect(style.opacity).toBe(0.5)
    expect(style.seriesColors?.g1).toBe('#111111')
    expect(style.bar).toBeUndefined()
  })

  it('无可复用映射 → carried=false', () => {
    const from = createChartConfig('pie')
    const { carried } = migrateConfigure(from, getChartDef('heatmap'), catCols)
    expect(carried).toBe(false)
  })
})
