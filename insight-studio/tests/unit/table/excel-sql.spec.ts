import { describe, expect, it } from 'vitest'
import * as XLSX from 'xlsx'
import { parseExcelBuffer } from '../../../src/modules/table/excel'
import { buildSqlSchema, runSqlQuery, toSqlIdent } from '../../../src/modules/table/sqlQuery'
import { createTable } from '../../../src/shared/factories'
import type { AnalysisTable } from '../../../src/shared/types'

describe('excel parse', () => {
  it('reads first row as headers and remaining as data', async () => {
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet([
      ['id', 'name'],
      [1, 'a'],
      [2, 'b'],
    ])
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
    const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer
    const result = await Promise.resolve(parseExcelBuffer(buf))
    expect(result.sheetNames).toEqual(['Sheet1'])
    expect(result.sheets.Sheet1.headers).toEqual(['id', 'name'])
    expect(result.sheets.Sheet1.dataRows).toHaveLength(2)
    expect(result.sheets.Sheet1.dataRows[0]).toEqual(['1', 'a'])
  })
})

describe('sql query', () => {
  it('toSqlIdent sanitizes and dedupes', () => {
    const taken = new Set<string>()
    expect(toSqlIdent('My Table', taken)).toBe('My_Table')
    expect(toSqlIdent('My Table', taken)).toBe('My_Table_2')
  })

  it('runs SELECT against registered analysis tables', () => {
    const t = createTable(
      'samples',
      [
        { field: 'id', title: 'id', dataType: 'number' },
        { field: 'name', title: 'name', dataType: 'string' },
      ],
      [
        { id: 1, name: 'a' },
        { id: 2, name: 'b' },
      ],
      'csv',
    ) as AnalysisTable
    const schema = buildSqlSchema([t])
    expect(schema[0].sqlName).toBe('samples')
    const out = runSqlQuery(`SELECT name FROM ${schema[0].sqlName} WHERE id = 2`, [t])
    expect(out.rows).toEqual([{ name: 'b' }])
  })

  it('rejects write statements', () => {
    expect(() => runSqlQuery('DELETE FROM samples', [])).toThrow(/只读/)
  })

  it('supports constant SELECT without tables', () => {
    const out = runSqlQuery(`SELECT 1 AS id, 'x' AS name`, [])
    expect(out.rows[0]).toMatchObject({ id: 1, name: 'x' })
  })
})
