import { describe, expect, it } from 'vitest'
import type { Analysis, AnalysisTable, ColumnMeta, Filter, Row, Transform, ViewNode } from '../../src/shared/types'
import { ROW_ID_FIELD } from '../../src/shared/types'
import {
  SAMPLE_LIMIT,
  applyFilter,
  applyTransforms,
  evaluateExpression,
  isIdentityOrSortOnly,
  parseExpression,
  runPipeline,
} from '../../src/shared/pipeline'

/* ------------------------------ helpers ------------------------------ */

const cols: ColumnMeta[] = [
  { field: 'name', title: 'name', dataType: 'string' },
  { field: 'value', title: 'value', dataType: 'number' },
  { field: 'group', title: 'group', dataType: 'string' },
]

function row(name: Cell, value: Cell, group: Cell = 'g1'): Row {
  return { [ROW_ID_FIELD]: `${name}-${value}`, name, value, group } as Row
}
type Cell = string | number | null

function makeTable(rows: Row[], filters: Filter[] = []): AnalysisTable {
  return { id: 't1', name: 'T', source: 'csv', columns: cols, rows, filters, views: [] }
}

function makeAnalysis(table: AnalysisTable): Analysis {
  return { id: 'a1', name: 'A', createdAt: '', updatedAt: '', tables: [table], flowchartLayout: {} }
}

function makeView(partial: Partial<ViewNode> = {}): ViewNode {
  return {
    id: partial.id ?? 'v1',
    name: 'V',
    type: 'table',
    filters: [],
    transforms: [],
    children: [],
    ...partial,
  }
}

function filter(column: string, operator: Filter['conditions'][number]['operator'], value?: unknown, value2?: unknown): Filter {
  return {
    id: 'f1',
    combinator: 'and',
    conditions: [{ id: 'c1', column, operator, value: value as never, value2: value2 as never }],
  }
}

/* ------------------------------ filters ------------------------------ */

describe('applyFilter · 全操作符', () => {
  const r: Row = { name: 'alpha', value: 10, group: 'g1' }

  it('eq / neq（数值宽松相等）', () => {
    expect(applyFilter(r, filter('value', 'eq', 10), cols)).toBe(true)
    expect(applyFilter(r, filter('value', 'eq', '10'), cols)).toBe(true)
    expect(applyFilter(r, filter('value', 'eq', 11), cols)).toBe(false)
    expect(applyFilter(r, filter('value', 'neq', 11), cols)).toBe(true)
    expect(applyFilter(r, filter('value', 'neq', 10), cols)).toBe(false)
  })

  it('contains / notContains（大小写不敏感）', () => {
    expect(applyFilter(r, filter('name', 'contains', 'ALP'), cols)).toBe(true)
    expect(applyFilter(r, filter('name', 'contains', 'beta'), cols)).toBe(false)
    expect(applyFilter(r, filter('name', 'notContains', 'beta'), cols)).toBe(true)
    expect(applyFilter(r, filter('name', 'notContains', 'alp'), cols)).toBe(false)
  })

  it('gt / gte / lt / lte', () => {
    expect(applyFilter(r, filter('value', 'gt', 9), cols)).toBe(true)
    expect(applyFilter(r, filter('value', 'gt', 10), cols)).toBe(false)
    expect(applyFilter(r, filter('value', 'gte', 10), cols)).toBe(true)
    expect(applyFilter(r, filter('value', 'lt', 11), cols)).toBe(true)
    expect(applyFilter(r, filter('value', 'lt', 10), cols)).toBe(false)
    expect(applyFilter(r, filter('value', 'lte', 10), cols)).toBe(true)
  })

  it('between（含边界）', () => {
    expect(applyFilter(r, filter('value', 'between', 5, 10), cols)).toBe(true)
    expect(applyFilter(r, filter('value', 'between', 11, 20), cols)).toBe(false)
  })

  it('isBlank / notBlank', () => {
    const blankRow: Row = { name: '', value: null }
    expect(applyFilter(blankRow, filter('name', 'isBlank'), cols)).toBe(true)
    expect(applyFilter(blankRow, filter('value', 'isBlank'), cols)).toBe(true)
    expect(applyFilter(r, filter('name', 'isBlank'), cols)).toBe(false)
    expect(applyFilter(r, filter('name', 'notBlank'), cols)).toBe(true)
    expect(applyFilter(blankRow, filter('value', 'notBlank'), cols)).toBe(false)
  })

  it('in', () => {
    expect(applyFilter(r, filter('group', 'in', ['g1', 'g2']), cols)).toBe(true)
    expect(applyFilter(r, filter('group', 'in', ['g2']), cols)).toBe(false)
    expect(applyFilter(r, filter('value', 'in', [9, 10]), cols)).toBe(true)
  })

  it('多条件 and / or', () => {
    const and: Filter = {
      id: 'f',
      combinator: 'and',
      conditions: [
        { id: 'c1', column: 'value', operator: 'gt', value: 5 },
        { id: 'c2', column: 'group', operator: 'eq', value: 'g1' },
      ],
    }
    expect(applyFilter(r, and, cols)).toBe(true)
    const or: Filter = { ...and, combinator: 'or' }
    const r2: Row = { name: 'x', value: 1, group: 'g1' }
    expect(applyFilter(r2, and, cols)).toBe(false)
    expect(applyFilter(r2, or, cols)).toBe(true)
  })
})

/* ----------------------------- transforms ----------------------------- */

describe('applyTransforms', () => {
  const rows: Row[] = [
    row('a', 3, 'g1'),
    row('b', 1, 'g2'),
    row('a', 3, 'g1'),
    row('c', 2, 'g2'),
  ]

  it('select keep / drop', () => {
    const keep = applyTransforms(cols, rows, [{ id: 't', type: 'select', mode: 'keep', columns: ['name', 'value'] }])
    expect(keep.columns.map((c) => c.field)).toEqual(['name', 'value'])
    const drop = applyTransforms(cols, rows, [{ id: 't', type: 'select', mode: 'drop', columns: ['group'] }])
    expect(drop.columns.map((c) => c.field)).toEqual(['name', 'value'])
  })

  it('rename（含冲突自动后缀）', () => {
    const out = applyTransforms(cols, rows, [
      { id: 't', type: 'rename', renames: [{ from: 'name', to: 'label' }] },
    ])
    expect(out.columns.map((c) => c.field)).toEqual(['label', 'value', 'group'])
    expect(out.rows[0].label).toBe('a')
    // 冲突：name → group，group 已存在 → group_2
    const conflict = applyTransforms(cols, rows, [
      { id: 't', type: 'rename', renames: [{ from: 'name', to: 'group' }] },
    ])
    expect(conflict.columns.map((c) => c.field)).toEqual(['group_2', 'value', 'group'])
  })

  it('derived：四则、常量、括号', () => {
    const out = applyTransforms(cols, rows, [
      { id: 't', type: 'derived', name: 'double', expression: 'value * 2 + 1' },
    ])
    expect(out.columns.map((c) => c.field)).toContain('double')
    expect(out.rows[0].double).toBe(7)
    expect(out.columns.find((c) => c.field === 'double')?.dataType).toBe('number')
  })

  it('derived：concat 与除零/非数值置空', () => {
    const out = applyTransforms(cols, rows, [
      { id: 't1', type: 'derived', name: 'label', expression: "concat(name, '-', group)" },
      { id: 't2', type: 'derived', name: 'bad', expression: 'value / 0' },
      { id: 't3', type: 'derived', name: 'mixed', expression: "name + 1" },
    ])
    expect(out.rows[0].label).toBe('a-g1')
    expect(out.rows[0].bad).toBeNull()
    expect(out.rows[0].mixed).toBeNull()
  })

  it('derived：非法表达式抛错（阻断保存）', () => {
    expect(() => parseExpression('value *')).toThrow()
    expect(() => parseExpression('')).toThrow()
    expect(() => parseExpression('foo(')).toThrow()
    expect(() =>
      applyTransforms(cols, rows, [{ id: 't', type: 'derived', name: 'x', expression: '1 +' }]),
    ).toThrow()
    // 方括号列引用
    const out = applyTransforms(cols, rows, [
      { id: 't', type: 'derived', name: 'x', expression: '[value] * 3' },
    ])
    expect(out.rows[0].x).toBe(9)
  })

  it('dedupe：按列保留首行', () => {
    const out = applyTransforms(cols, rows, [{ id: 't', type: 'dedupe', columns: ['name'] }])
    expect(out.rows).toHaveLength(3)
    expect(out.rows.map((r) => r.name)).toEqual(['a', 'b', 'c'])
  })

  it('sort：多列、升降序、数值感知', () => {
    const data: Row[] = [row('b', 2), row('a', 10), row('a', 2)]
    const out = applyTransforms(cols, data, [
      {
        id: 't',
        type: 'sort',
        keys: [
          { column: 'name', direction: 'asc' },
          { column: 'value', direction: 'desc' },
        ],
      },
    ])
    expect(out.rows.map((r) => `${r.name}${r.value}`)).toEqual(['a10', 'a2', 'b2'])
  })
})

/* ------------------------------ pipeline ------------------------------ */

describe('runPipeline', () => {
  it('表级 filters → 视图 filters → transforms 按序', () => {
    const table = makeTable(
      [row('a', 1, 'g1'), row('b', 5, 'g1'), row('c', 9, 'g2'), row('d', 20, 'g2')],
      [filter('group', 'eq', 'g2')], // 表级：只剩 g2
    )
    const view = makeView({
      id: 'v1',
      filters: [filter('value', 'gt', 5)], // 视图级：value > 5
      transforms: [{ id: 't', type: 'derived', name: 'half', expression: 'value / 2' }],
    })
    table.views = [view]
    const result = runPipeline(makeAnalysis(table), 't1', 'v1')
    expect(result.rows).toHaveLength(2)
    expect(result.rows[0].name).toBe('c')
    expect(result.rows[0].half).toBe(4.5)
    expect(result.sourceRows).toBe(4)
    expect(result.totalRows).toBe(2)
    expect(result.sampled).toBe(false)
  })

  it('多级嵌套视图沿父链逐层应用', () => {
    const table = makeTable([
      row('a', 1), row('b', 2), row('c', 3), row('d', 4), row('e', 5), row('f', 6),
    ])
    const parent = makeView({ id: 'vp', filters: [filter('value', 'gte', 2)] })
    const child = makeView({ id: 'vc', filters: [filter('value', 'lte', 5)] })
    const grandChild = makeView({
      id: 'vg',
      transforms: [{ id: 't', type: 'sort', keys: [{ column: 'value', direction: 'desc' }] }],
    })
    parent.children = [child]
    child.children = [grandChild]
    table.views = [parent]
    const result = runPipeline(makeAnalysis(table), 't1', 'vg')
    expect(result.rows.map((r) => r.value)).toEqual([5, 4, 3, 2])
  })

  it('超过 10000 行随机采样并标记', () => {
    const many: Row[] = Array.from({ length: SAMPLE_LIMIT + 1 }, (_, i) => row(`n${i}`, i))
    const table = makeTable(many)
    const result = runPipeline(makeAnalysis(table), 't1')
    expect(result.sampled).toBe(true)
    expect(result.totalRows).toBe(SAMPLE_LIMIT + 1)
    expect(result.rows).toHaveLength(SAMPLE_LIMIT)
  })

  it('不传 viewId 时仅应用表级 filters', () => {
    const table = makeTable([row('a', 1, 'g1'), row('b', 2, 'g2')], [filter('group', 'eq', 'g1')])
    const result = runPipeline(makeAnalysis(table), 't1')
    expect(result.rows).toHaveLength(1)
    expect(result.rows[0].name).toBe('a')
  })

  it('表 / 视图不存在抛错', () => {
    const table = makeTable([])
    const a = makeAnalysis(table)
    expect(() => runPipeline(a, 'nope')).toThrow()
    expect(() => runPipeline(a, 't1', 'nope')).toThrow()
  })
})

/* ------------------------- isIdentityOrSortOnly ------------------------- */

describe('isIdentityOrSortOnly', () => {
  it('恒等视图可写回', () => {
    expect(isIdentityOrSortOnly(makeView())).toBe(true)
  })
  it('仅排序可写回', () => {
    const v = makeView({ transforms: [{ id: 't', type: 'sort', keys: [{ column: 'value', direction: 'asc' }] }] })
    expect(isIdentityOrSortOnly(v)).toBe(true)
  })
  it('有过滤或其他转换不可写回', () => {
    expect(isIdentityOrSortOnly(makeView({ filters: [filter('value', 'gt', 1)] }))).toBe(false)
    const derived: Transform = { id: 't', type: 'derived', name: 'x', expression: '1' }
    expect(isIdentityOrSortOnly(makeView({ transforms: [derived] }))).toBe(false)
  })
  it('沿父链判断：祖先有过滤则不可写回', () => {
    const parent = makeView({ id: 'p', filters: [filter('value', 'gt', 1)] })
    const child = makeView({ id: 'c' })
    expect(isIdentityOrSortOnly(child, [parent])).toBe(false)
    expect(isIdentityOrSortOnly(child, [makeView({ id: 'p2' })])).toBe(true)
  })
})

/* ------------------------- evaluateExpression ------------------------- */

describe('evaluateExpression', () => {
  it('优先级与负号', () => {
    const r: Row = { a: 2, b: 3 }
    expect(evaluateExpression('a + b * 4', r)).toBe(14)
    expect(evaluateExpression('(a + b) * 4', r)).toBe(20)
    expect(evaluateExpression('-a + b', r)).toBe(1)
    expect(evaluateExpression('2 * (a - b)', r)).toBe(-2)
  })
})
