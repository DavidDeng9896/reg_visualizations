import { describe, expect, it } from 'vitest'
import type { ColumnMeta, Row } from '../../src/shared/types'
import { ROW_ID_FIELD } from '../../src/shared/types'
import { CombineError, combineTables, type TableInput } from '../../src/shared/join'

function table(columns: string[], rows: Array<Record<string, string | number>>): TableInput {
  const cols: ColumnMeta[] = columns.map((f) => ({ field: f, title: f, dataType: 'string' }))
  return {
    columns: cols,
    rows: rows.map((r) => ({ [ROW_ID_FIELD]: JSON.stringify(r), ...r }) as Row),
  }
}

const left = table(
  ['id', 'name'],
  [
    { id: 1, name: 'a' },
    { id: 2, name: 'b' },
    { id: 3, name: 'c' },
  ],
)

const right = table(
  ['id', 'score'],
  [
    { id: 2, score: 90 },
    { id: 3, score: 80 },
    { id: 4, score: 70 },
  ],
)

const KEY = [{ left: 'id', right: 'id' }]

describe('combineTables · join', () => {
  it('left join：保留左表全部，未匹配补 null；同名键列不重复', () => {
    const out = combineTables(left, right, { joinType: 'left', keys: KEY })
    expect(out.columns.map((c) => c.field)).toEqual(['id', 'name', 'score'])
    expect(out.rows).toHaveLength(3)
    expect(out.rows[0].score).toBeNull()
    expect(out.rows[1].score).toBe(90)
    expect(out.rows[2].score).toBe(80)
  })

  it('inner join：仅匹配行', () => {
    const out = combineTables(left, right, { joinType: 'inner', keys: KEY })
    expect(out.rows).toHaveLength(2)
    expect(out.rows.map((r) => r.id)).toEqual([2, 3])
  })

  it('right join：保留右表全部，未匹配左列补 null', () => {
    const out = combineTables(left, right, { joinType: 'right', keys: KEY })
    expect(out.rows).toHaveLength(3)
    const last = out.rows.find((r) => r.id === 4)
    expect(last?.name).toBeNull()
    expect(last?.score).toBe(70)
  })

  it('full join：两侧未匹配均保留', () => {
    const out = combineTables(left, right, { joinType: 'full', keys: KEY })
    expect(out.rows).toHaveLength(4)
    expect(out.rows.filter((r) => r.name === null)).toHaveLength(1)
    expect(out.rows.filter((r) => r.score === null)).toHaveLength(1)
  })

  it('键完全不匹配：inner 为空，left 全部保留', () => {
    const noMatch = table(['id', 'score'], [{ id: 99, score: 1 }])
    expect(combineTables(left, noMatch, { joinType: 'inner', keys: KEY }).rows).toHaveLength(0)
    expect(combineTables(left, noMatch, { joinType: 'left', keys: KEY }).rows).toHaveLength(3)
  })

  it('重复键笛卡尔展开', () => {
    const dup = table(
      ['id', 'score'],
      [
        { id: 2, score: 1 },
        { id: 2, score: 2 },
      ],
    )
    const out = combineTables(left, dup, { joinType: 'inner', keys: KEY })
    expect(out.rows).toHaveLength(2)
  })

  it('列冲突加后缀；不同名键列两侧均保留', () => {
    const l = table(['id', 'val'], [{ id: 1, val: 'L' }])
    const r = table(['rid', 'val'], [{ rid: 1, val: 'R' }])
    const out = combineTables(l, r, { joinType: 'inner', keys: [{ left: 'id', right: 'rid' }] })
    expect(out.columns.map((c) => c.field)).toEqual(['id', 'val', 'rid', 'val_right'])
    expect(out.rows[0].val).toBe('L')
    expect(out.rows[0].val_right).toBe('R')
  })

  it('自定义后缀', () => {
    const l = table(['id', 'x'], [{ id: 1, x: 'a' }])
    const r = table(['id', 'x'], [{ id: 1, x: 'b' }])
    const out = combineTables(l, r, { joinType: 'inner', keys: KEY, suffix: '_r' })
    expect(out.columns.map((c) => c.field)).toEqual(['id', 'x', 'x_r'])
  })

  it('join 缺键抛 CombineError', () => {
    expect(() => combineTables(left, right, { joinType: 'left' })).toThrow(CombineError)
  })

  it('多键匹配', () => {
    const l = table(['a', 'b', 'v'], [{ a: 1, b: 2, v: 'x' }])
    const r = table(
      ['a', 'b', 'w'],
      [
        { a: 1, b: 2, w: 'hit' },
        { a: 1, b: 3, w: 'miss' },
      ],
    )
    const out = combineTables(l, r, {
      joinType: 'inner',
      keys: [
        { left: 'a', right: 'a' },
        { left: 'b', right: 'b' },
      ],
    })
    expect(out.rows).toHaveLength(1)
    expect(out.rows[0].w).toBe('hit')
  })
})

describe('combineTables · append', () => {
  it('按列名对齐，列取并集', () => {
    const a = table(['id', 'name'], [{ id: 1, name: 'a' }])
    const b = table(['id', 'extra'], [{ id: 2, extra: 'e' }])
    const out = combineTables(a, b, { joinType: 'append' })
    expect(out.columns.map((c) => c.field)).toEqual(['id', 'name', 'extra'])
    expect(out.rows).toHaveLength(2)
    expect(out.rows[0].extra).toBeNull()
    expect(out.rows[1].name).toBeNull()
    expect(out.rows[1].id).toBe(2)
  })
})
