import type { JoinType, TableColumn } from '@/shared/types/analysis'
import { withRowIds } from '@/shared/utils/schema'

function rowKey(row: Record<string, unknown>, keys: string[]): string {
  return keys.map((k) => String(row[k] ?? '')).join('\0')
}

function mergeColumns(left: TableColumn[], right: TableColumn[], rightPrefix = 'r_'): TableColumn[] {
  const fields = new Set(left.map((c) => c.field))
  const cols = [...left]
  for (const c of right) {
    if (fields.has(c.field)) {
      const field = `${rightPrefix}${c.field}`
      cols.push({ ...c, field, title: `${c.title} (${rightPrefix.replace(/_$/, '')})` })
    } else {
      cols.push(c)
      fields.add(c.field)
    }
  }
  return cols
}

function renameRowConflicts(
  row: Record<string, unknown>,
  leftFields: Set<string>,
  rightPrefix = 'r_',
): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(row)) {
    if (k === '__rowId') continue
    out[leftFields.has(k) ? `${rightPrefix}${k}` : k] = v
  }
  return out
}

export function combineTables(input: {
  leftColumns: TableColumn[]
  leftRows: Record<string, unknown>[]
  rightColumns: TableColumn[]
  rightRows: Record<string, unknown>[]
  joinType: JoinType
  leftKeys?: string[]
  rightKeys?: string[]
}): { columns: TableColumn[]; rows: Record<string, unknown>[] } {
  const { joinType } = input
  if (joinType === 'append') {
    const colMap = new Map<string, TableColumn>()
    for (const c of [...input.leftColumns, ...input.rightColumns]) {
      if (!colMap.has(c.field)) colMap.set(c.field, c)
    }
    const columns = [...colMap.values()]
    const rows = withRowIds([
      ...input.leftRows.map((r) => {
        const o: Record<string, unknown> = {}
        for (const c of columns) o[c.field] = r[c.field] ?? null
        return o
      }),
      ...input.rightRows.map((r) => {
        const o: Record<string, unknown> = {}
        for (const c of columns) o[c.field] = r[c.field] ?? null
        return o
      }),
    ])
    return { columns, rows }
  }

  const leftKeys = input.leftKeys || []
  const rightKeys = input.rightKeys || []
  if (!leftKeys.length || leftKeys.length !== rightKeys.length) {
    throw new Error('join keys required')
  }

  const leftFields = new Set(input.leftColumns.map((c) => c.field))
  const columns = mergeColumns(input.leftColumns, input.rightColumns)
  const rightIndex = new Map<string, Record<string, unknown>[]>()
  for (const r of input.rightRows) {
    const k = rowKey(r, rightKeys)
    if (!rightIndex.has(k)) rightIndex.set(k, [])
    rightIndex.get(k)!.push(r)
  }

  const out: Record<string, unknown>[] = []
  const matchedRight = new Set<Record<string, unknown>>()

  for (const l of input.leftRows) {
    const k = rowKey(l, leftKeys)
    const rights = rightIndex.get(k) || []
    if (rights.length) {
      for (const r of rights) {
        matchedRight.add(r)
        out.push({ ...l, ...renameRowConflicts(r, leftFields) })
      }
    } else if (joinType === 'left' || joinType === 'full') {
      const empty: Record<string, unknown> = {}
      for (const c of input.rightColumns) {
        const field = leftFields.has(c.field) ? `r_${c.field}` : c.field
        empty[field] = null
      }
      out.push({ ...l, ...empty })
    }
  }

  if (joinType === 'right' || joinType === 'full') {
    for (const r of input.rightRows) {
      if (matchedRight.has(r)) continue
      if (joinType === 'right') {
        // only unmatched right for pure right — also need left empties
      }
      const empty: Record<string, unknown> = {}
      for (const c of input.leftColumns) empty[c.field] = null
      out.push({ ...empty, ...renameRowConflicts(r, leftFields) })
    }
  }

  // Inner: already only matched
  // Right join: we added unmatched right; but also included left matches above — for right we should not include unmatched left
  let rows = out
  if (joinType === 'right') {
    rows = []
    for (const l of input.leftRows) {
      const k = rowKey(l, leftKeys)
      const rights = rightIndex.get(k) || []
      for (const r of rights) {
        rows.push({ ...l, ...renameRowConflicts(r, leftFields) })
      }
    }
    for (const r of input.rightRows) {
      if (matchedRight.has(r)) continue
      const empty: Record<string, unknown> = {}
      for (const c of input.leftColumns) empty[c.field] = null
      rows.push({ ...empty, ...renameRowConflicts(r, leftFields) })
    }
  }
  if (joinType === 'inner') {
    rows = []
    for (const l of input.leftRows) {
      const k = rowKey(l, leftKeys)
      const rights = rightIndex.get(k) || []
      for (const r of rights) {
        rows.push({ ...l, ...renameRowConflicts(r, leftFields) })
      }
    }
  }

  return { columns, rows: withRowIds(rows) }
}
