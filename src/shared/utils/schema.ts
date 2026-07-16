import type { DataType, TableColumn } from '@/shared/types/analysis'

export function inferDataType(values: unknown[]): DataType {
  const sample = values.filter((v) => v !== null && v !== undefined && v !== '').slice(0, 50)
  if (!sample.length) return 'unknown'
  let num = 0
  let bool = 0
  let date = 0
  for (const v of sample) {
    if (typeof v === 'boolean' || /^(true|false)$/i.test(String(v))) bool++
    else if (typeof v === 'number' || (!Number.isNaN(Number(v)) && String(v).trim() !== '')) num++
    else if (!Number.isNaN(Date.parse(String(v))) && /\d{4}-\d{2}-\d{2}|\//.test(String(v))) date++
  }
  const n = sample.length
  if (bool / n > 0.8) return 'boolean'
  if (num / n > 0.8) return 'number'
  if (date / n > 0.6) return 'date'
  return 'string'
}

export function coerceValue(value: unknown, dataType: DataType): unknown {
  if (value === null || value === undefined || value === '') return value
  switch (dataType) {
    case 'number': {
      const n = Number(value)
      return Number.isNaN(n) ? value : n
    }
    case 'boolean':
      if (typeof value === 'boolean') return value
      return /^(true|1|yes)$/i.test(String(value))
    default:
      return value
  }
}

export function buildColumnsFromRows(rows: Record<string, unknown>[]): TableColumn[] {
  if (!rows.length) return []
  const fields = Object.keys(rows[0])
  return fields.map((field) => ({
    field,
    title: field,
    dataType: inferDataType(rows.map((r) => r[field])),
  }))
}

export function withRowIds(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  return rows.map((r) => ({
    ...r,
    __rowId: (r.__rowId as string) || crypto.randomUUID(),
  }))
}
