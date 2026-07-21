/**
 * charts 单测共用 fixtures。
 */
import type { ColumnMeta, Row } from '../../../src/shared/types'
import type { ViewResult } from '../../../src/shared/pipeline'

export function vr(rows: Row[], columns: ColumnMeta[]): ViewResult {
  return { columns, rows, sampled: false, totalRows: rows.length, sourceRows: rows.length }
}

export const catCols: ColumnMeta[] = [
  { field: 'cat', title: 'cat', dataType: 'string' },
  { field: 'grp', title: 'grp', dataType: 'string' },
  { field: 'val', title: 'val', dataType: 'number' },
  { field: 'val2', title: 'val2', dataType: 'number' },
]

export function r(cat: string | null, grp: string | null, val: number | null, val2: number | null = null): Row {
  return { cat, grp, val, val2 }
}
