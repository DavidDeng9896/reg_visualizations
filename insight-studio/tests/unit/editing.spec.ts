import { describe, expect, it } from 'vitest'
import type { AnalysisTable, ColumnMeta, Row } from '../../src/shared/types'
import { ROW_ID_FIELD } from '../../src/shared/types'
import {
  buildPasteRect,
  findRowIndexById,
  makeAddDerivedColumnCommand,
  makeDeleteColumnCommand,
  makeDeleteRowCommand,
  makeEditCellCommand,
  makeInsertRowCommand,
  makePasteCommand,
  makeRenameColumnCommand,
  parseCellInput,
  parseTsv,
  writeBackCell,
} from '../../src/modules/table/editing'

const cols: ColumnMeta[] = [
  { field: 'name', title: 'name', dataType: 'string' },
  { field: 'value', title: 'value', dataType: 'number' },
  { field: 'when', title: 'when', dataType: 'date' },
]

function makeTable(rowCount = 3): AnalysisTable {
  const rows: Row[] = Array.from({ length: rowCount }, (_, i) => ({
    [ROW_ID_FIELD]: `r${i + 1}`,
    name: `n${i + 1}`,
    value: (i + 1) * 10,
    when: `2026-01-0${i + 1}`,
  }))
  return { id: 't1', name: 'T', source: 'csv', columns: cols.map((c) => ({ ...c })), rows, filters: [], views: [] }
}

describe('parseCellInput', () => {
  it('number 合法/非法', () => {
    expect(parseCellInput('3.14', 'number')).toEqual({ ok: true, value: 3.14 })
    expect(parseCellInput('abc', 'number').ok).toBe(false)
  })
  it('date/datetime 解析失败不通过', () => {
    expect(parseCellInput('2026-01-01', 'date')).toEqual({ ok: true, value: '2026-01-01' })
    expect(parseCellInput('32/13/99', 'date').ok).toBe(false)
    expect(parseCellInput('2026-01-01T08:00', 'datetime').ok).toBe(true)
  })
  it('boolean 与 string；空串 → null', () => {
    expect(parseCellInput('true', 'boolean')).toEqual({ ok: true, value: true })
    expect(parseCellInput('maybe', 'boolean').ok).toBe(false)
    expect(parseCellInput('hello', 'string')).toEqual({ ok: true, value: 'hello' })
    expect(parseCellInput('   ', 'number')).toEqual({ ok: true, value: null })
  })
})

describe('writeBackCell · 写回定位边界', () => {
  it('rowId 缺失/未找到 → false 且不写入', () => {
    const t = makeTable()
    expect(writeBackCell(t, undefined, 'name', 'x')).toBe(false)
    expect(writeBackCell(t, 'no-such', 'name', 'x')).toBe(false)
    expect(t.rows[0].name).toBe('n1')
  })
  it('列不存在 → false', () => {
    const t = makeTable()
    expect(writeBackCell(t, 'r1', 'ghost', 'x')).toBe(false)
  })
  it('按 __rowId 精确定位（排序后行序变化不受影响）', () => {
    const t = makeTable()
    t.rows.reverse()
    expect(writeBackCell(t, 'r2', 'value', 999)).toBe(true)
    const idx = findRowIndexById(t, 'r2')
    expect(t.rows[idx].value).toBe(999)
    expect(t.rows.filter((r) => r.value === 999)).toHaveLength(1)
  })
})

describe('makeEditCellCommand · undo/redo 往返', () => {
  it('立即应用；undo 恢复；redo 再应用', () => {
    const t = makeTable()
    const entry = makeEditCellCommand(t, 'r1', 'value', 555)!
    expect(entry).toBeTruthy()
    expect(t.rows[0].value).toBe(555)
    entry.undo()
    expect(t.rows[0].value).toBe(10)
    entry.redo()
    expect(t.rows[0].value).toBe(555)
  })
  it('rowId 缺失返回 null', () => {
    const t = makeTable()
    expect(makeEditCellCommand(t, undefined, 'value', 1)).toBeNull()
    expect(makeEditCellCommand(t, 'ghost', 'value', 1)).toBeNull()
  })
  it('undo 时行位置变化仍按 rowId 定位', () => {
    const t = makeTable()
    const entry = makeEditCellCommand(t, 'r2', 'name', 'changed')!
    t.rows.reverse()
    entry.undo()
    expect(t.rows.find((r) => r[ROW_ID_FIELD] === 'r2')!.name).toBe('n2')
  })
})

describe('makePasteCommand · 批量原子', () => {
  it('多单元格应用与撤销', () => {
    const t = makeTable()
    const entry = makePasteCommand(t, [
      { rowId: 'r1', field: 'value', value: 100 },
      { rowId: 'r3', field: 'name', value: 'zz' },
    ])!
    expect(t.rows[0].value).toBe(100)
    expect(t.rows[2].name).toBe('zz')
    entry.undo()
    expect(t.rows[0].value).toBe(10)
    expect(t.rows[2].name).toBe('n3')
    entry.redo()
    expect(t.rows[0].value).toBe(100)
  })
  it('空编辑列表返回 null', () => {
    expect(makePasteCommand(makeTable(), [])).toBeNull()
  })
})

describe('行/列命令', () => {
  it('插入行（越界收敛）+ undo/redo', () => {
    const t = makeTable()
    const entry = makeInsertRowCommand(t, 99)
    expect(t.rows).toHaveLength(4)
    expect(t.rows[3][ROW_ID_FIELD]).toBeTruthy()
    expect(t.rows[3].name).toBe(null)
    entry.undo()
    expect(t.rows).toHaveLength(3)
    entry.redo()
    expect(t.rows).toHaveLength(4)
  })
  it('删除行 + undo 恢复原位置', () => {
    const t = makeTable()
    const entry = makeDeleteRowCommand(t, 'r2')!
    expect(t.rows.map((r) => r[ROW_ID_FIELD])).toEqual(['r1', 'r3'])
    entry.undo()
    expect(t.rows.map((r) => r[ROW_ID_FIELD])).toEqual(['r1', 'r2', 'r3'])
    expect(t.rows[1].value).toBe(20)
  })
  it('删除不存在的行返回 null', () => {
    expect(makeDeleteRowCommand(makeTable(), 'ghost')).toBeNull()
  })
  it('重命名列只改 title，field 稳定', () => {
    const t = makeTable()
    const entry = makeRenameColumnCommand(t, 'value', '测量值')!
    expect(t.columns[1]).toEqual({ field: 'value', title: '测量值', dataType: 'number' })
    entry.undo()
    expect(t.columns[1].title).toBe('value')
  })
  it('删除列 + undo 恢复列与全部行值', () => {
    const t = makeTable()
    const entry = makeDeleteColumnCommand(t, 'value')!
    expect(t.columns.map((c) => c.field)).toEqual(['name', 'when'])
    expect(t.rows[0].value).toBeUndefined()
    entry.undo()
    expect(t.columns.map((c) => c.field)).toEqual(['name', 'value', 'when'])
    expect(t.rows.map((r) => r.value)).toEqual([10, 20, 30])
  })
  it('派生列物化：求值写入 + undo 移除', () => {
    const t = makeTable()
    const entry = makeAddDerivedColumnCommand(t, 'double', 'value * 2', 'value')!
    expect(t.columns.map((c) => c.field)).toEqual(['name', 'value', 'double', 'when'])
    expect(t.columns[2].dataType).toBe('number')
    expect(t.rows.map((r) => r.double)).toEqual([20, 40, 60])
    entry.undo()
    expect(t.columns.map((c) => c.field)).toEqual(['name', 'value', 'when'])
    expect(t.rows[0].double).toBeUndefined()
  })
  it('派生列重名返回 null', () => {
    expect(makeAddDerivedColumnCommand(makeTable(), 'value', '1 + 1')).toBeNull()
  })
})

describe('parseTsv / buildPasteRect', () => {
  it('TSV 解析（CRLF、末尾空行）', () => {
    expect(parseTsv('a\tb\r\nc\td\r\n')).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ])
    expect(parseTsv('single')).toEqual([['single']])
  })
  it('矩形粘贴：越界部分计入 clipped', () => {
    const rect = buildPasteRect(1, 1, parseTsv('a\tb\nc\td'), 2, 3)
    expect(rect.cells).toEqual([
      { row: 1, col: 1, raw: 'a' },
      { row: 1, col: 2, raw: 'b' },
    ])
    expect(rect.clipped).toBe(2)
  })
  it('完全越界', () => {
    const rect = buildPasteRect(5, 0, parseTsv('x'), 2, 2)
    expect(rect.cells).toEqual([])
    expect(rect.clipped).toBe(1)
  })
})
