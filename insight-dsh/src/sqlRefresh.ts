import type { AnalysisTable, ColumnMeta, DataType, Row } from '../../insight-studio/src/shared/types'
import { ROW_ID_FIELD } from '../../insight-studio/src/shared/types'
import { ensureRowIds, sealRows } from '../../insight-studio/src/shared/factories'
import { inferColumnTypes } from '../../insight-studio/src/modules/table/csv'
import { coerceValue } from '../../insight-studio/src/modules/table/csv'

export type RefreshSqlResult = {
  tableId: string
  rowCount: number
  columnCount: number
  mode: 'reran' | 'stale-only' | 'noop' | 'unchanged'
  ran: number
}

export class RefreshSqlError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RefreshSqlError'
  }
}

export function snapshotFingerprint(headers: string[], rows: Record<string, unknown>[]): string {
  const cols = headers.join('\0')
  const body = rows
    .map((r) => headers.map((h) => (r[h] == null ? '' : String(r[h]))).join('\0'))
    .join('\n')
  return `${cols}\n${body}`
}

export function objectRowsToGrid(rows: Record<string, unknown>[]): { headers: string[]; dataRows: string[][] } {
  if (!rows.length) return { headers: [], dataRows: [] }
  const headers: string[] = []
  for (const r of rows) {
    for (const k of Object.keys(r)) {
      if (!headers.includes(k)) headers.push(k)
    }
  }
  return { headers, dataRows: rows.map((r) => headers.map((h) => (r[h] == null ? '' : String(r[h])))) }
}

function preserveTypes(prev: ColumnMeta[], headers: string[]): DataType[] {
  const byField = new Map(prev.map((c) => [c.field, c.dataType]))
  const inferred = inferColumnTypes(headers, [])
  return headers.map((h, i) => byField.get(h) ?? inferred[i]?.dataType ?? 'string')
}

export function applySnapshotToTable(
  table: AnalysisTable,
  headers: string[],
  objectRows: Record<string, unknown>[],
): void {
  const types = preserveTypes(table.columns, headers)
  const columns: ColumnMeta[] = inferColumnTypes(headers, []).map((c, i) => ({
    ...c,
    dataType: types[i] ?? 'string',
  }))
  for (const c of columns) {
    const old = table.columns.find((x) => x.field === c.field)
    if (old?.dataType === 'structure') c.dataType = 'structure'
  }
  const rows: Row[] = objectRows.map((obj) => {
    const row: Row = {}
    for (const c of columns) {
      if (c.field === ROW_ID_FIELD) continue
      const raw = obj[c.field]
      row[c.field] = coerceValue(raw == null ? '' : String(raw), c.dataType)
    }
    return row
  })
  ensureRowIds(rows)
  table.columns = columns
  table.rows = sealRows(rows)
}
