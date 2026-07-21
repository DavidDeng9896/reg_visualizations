import { describe, expect, it } from 'vitest'
import { createDemoAnalysis } from '../../src/shared/seed'
import { createFilter, createTransform, createViewNode } from '../../src/shared/factories'
import { isIdentityOrSortOnly, rowIdOf, runPipeline } from '../../src/shared/pipeline'
import { findViewPath } from '../../src/shared/tree'
import { writeBackCell } from '../../src/modules/table/editing'

/**
 * 集成验收：Demo Analysis → iris 表 → 视图加 filter + derived → runPipeline 结果正确。
 * 另验证「恒等/仅排序视图可写回源表」规则。
 */
describe('Demo Analysis → iris 视图管道', () => {
  it('filter + derived 后的 ViewResult 正确', () => {
    const a = createDemoAnalysis()
    const iris = a.tables[0]
    expect(iris.name).toContain('Iris')
    expect(iris.rows).toHaveLength(150)

    const view = createViewNode('table', 'setosa only')
    const f = createFilter('species', 'eq')
    f.conditions[0].value = 'setosa'
    view.filters.push(f)
    view.transforms.push(createTransform('derived', { name: 'sepal_area', expression: 'sepal_length * sepal_width' }))
    iris.views.push(view)

    const r = runPipeline(a, iris.id, view.id)
    expect(r.totalRows).toBe(50)
    expect(r.rows).toHaveLength(50)
    expect(r.sampled).toBe(false)
    expect(r.sourceRows).toBe(150)
    expect(r.columns.map((c) => c.field)).toContain('sepal_area')
    // 每行派生值正确
    for (const row of r.rows) {
      expect(row.species).toBe('setosa')
      const expected = Number(((row.sepal_length as number) * (row.sepal_width as number)).toFixed(10))
      expect(Number((row.sepal_area as number).toFixed(10))).toBe(expected)
      expect(rowIdOf(row)).toBeTruthy()
    }
  })

  it('含 filter 的视图不可写回；仅排序视图可写回并按 __rowId 定位', () => {
    const a = createDemoAnalysis()
    const iris = a.tables[0]

    // 带过滤视图 → 非恒等
    const filtered = createViewNode('table', 'filtered')
    const f = createFilter('species', 'eq')
    f.conditions[0].value = 'setosa'
    filtered.filters.push(f)
    // 仅排序视图 → 恒等
    const sorted = createViewNode('table', 'sorted')
    sorted.transforms.push(createTransform('sort', { keys: [{ column: 'sepal_length', direction: 'desc' }] }))
    iris.views.push(filtered, sorted)

    expect(isIdentityOrSortOnly(filtered, findViewPath(iris.views, filtered.id)!.slice(0, -1))).toBe(false)
    expect(isIdentityOrSortOnly(sorted, findViewPath(iris.views, sorted.id)!.slice(0, -1))).toBe(true)

    // 仅排序视图：行全部来自源表且可通过 __rowId 写回
    const r = runPipeline(a, iris.id, sorted.id)
    expect(r.totalRows).toBe(150)
    const first = r.rows[0]
    const rowId = rowIdOf(first)!
    expect(rowId).toBeTruthy()
    expect(writeBackCell(iris, rowId, 'sepal_length', 9.99)).toBe(true)
    expect(iris.rows.find((row) => rowIdOf(row) === rowId)!.sepal_length).toBe(9.99)
  })

  it('嵌套视图链：父视图 filter 向下生效', () => {
    const a = createDemoAnalysis()
    const iris = a.tables[0]
    const parent = createViewNode('table', 'parent')
    const f = createFilter('species', 'eq')
    f.conditions[0].value = 'virginica'
    parent.filters.push(f)
    const child = createViewNode('table', 'child')
    child.transforms.push(createTransform('select', { mode: 'keep', columns: ['species', 'petal_length'] }))
    parent.children.push(child)
    iris.views.push(parent)

    const r = runPipeline(a, iris.id, child.id)
    expect(r.totalRows).toBe(50)
    expect(r.columns.map((c) => c.field)).toEqual(['petal_length', 'species'])
    expect(r.rows.every((row) => row.species === 'virginica')).toBe(true)
  })
})
