import { describe, expect, it } from 'vitest'
import { coerceValue, inferColumnType, inferColumnTypes, normalizeHeaders, toCsv } from '../../src/modules/table/csv'
import { ROW_ID_FIELD } from '../../src/shared/types'

describe('normalizeHeaders', () => {
  it('空列名补 Column N（按位置从 1 起）', () => {
    expect(normalizeHeaders(['a', '', '  ', 'b'])).toEqual(['a', 'Column 2', 'Column 3', 'b'])
  })
  it('重名追加后缀', () => {
    expect(normalizeHeaders(['x', 'x', 'x_2', 'x'])).toEqual(['x', 'x_2', 'x_2_2', 'x_3'])
  })
})

describe('inferColumnType', () => {
  it('number：全部非空值为数值', () => {
    expect(inferColumnType(['1', '2.5', '-3', '1e4'])).toBe('number')
  })
  it('boolean：true/false（大小写不敏感）', () => {
    expect(inferColumnType(['true', 'FALSE', 'True'])).toBe('boolean')
  })
  it('date：YYYY-MM-DD', () => {
    expect(inferColumnType(['2026-01-01', '2025-12-31'])).toBe('date')
  })
  it('datetime：ISO 带时间', () => {
    expect(inferColumnType(['2026-01-01T08:30:00', '2026-01-02 09:00'])).toBe('datetime')
  })
  it('string：混合或文本', () => {
    expect(inferColumnType(['abc', '1'])).toBe('string')
    expect(inferColumnType(['hello'])).toBe('string')
  })
  it('空值被忽略；全空列按 string', () => {
    expect(inferColumnType(['', '  ', '3'])).toBe('number')
    expect(inferColumnType(['', ''])).toBe('string')
  })
})

describe('inferColumnTypes', () => {
  it('逐列推断并规范表头', () => {
    const cols = inferColumnTypes(
      ['name', 'value', ''],
      [
        ['a', '1', 'true'],
        ['b', '2', 'false'],
      ],
    )
    expect(cols.map((c) => c.field)).toEqual(['name', 'value', 'Column 3'])
    expect(cols.map((c) => c.dataType)).toEqual(['string', 'number', 'boolean'])
  })
})

describe('coerceValue', () => {
  it('number / boolean / date / string', () => {
    expect(coerceValue('42', 'number')).toBe(42)
    expect(coerceValue('abc', 'number')).toBe(null)
    expect(coerceValue('TRUE', 'boolean')).toBe(true)
    expect(coerceValue('no', 'boolean')).toBe(false)
    expect(coerceValue('2026-01-01', 'date')).toBe('2026-01-01')
    expect(coerceValue('not-a-date', 'date')).toBe(null)
    expect(coerceValue(' x ', 'string')).toBe('x')
  })
  it('空串 → null', () => {
    expect(coerceValue('  ', 'number')).toBe(null)
    expect(coerceValue('', 'string')).toBe(null)
  })
})

describe('toCsv', () => {
  it('转义逗号/引号/换行，跳过 __rowId', () => {
    const rows = [
      { [ROW_ID_FIELD]: 'r1', name: 'a,b', note: 'he said "hi"', n: 3 },
      { [ROW_ID_FIELD]: 'r2', name: null, note: 'line1\nline2', n: null },
    ]
    const csv = toCsv(
      [
        { field: 'name', title: 'name', dataType: 'string' },
        { field: 'note', title: 'note', dataType: 'string' },
        { field: 'n', title: 'n', dataType: 'number' },
      ],
      rows,
    )
    const lines = csv.split('\r\n')
    expect(lines[0]).toBe('name,note,n')
    expect(lines[1]).toBe('"a,b","he said ""hi""",3')
    expect(lines[2]).toBe(',"line1\nline2",')
    expect(csv).not.toContain('r1')
  })
})
