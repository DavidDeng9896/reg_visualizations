import type {
  FilterCondition,
  TableColumn,
  TransformStep,
  ViewResult,
} from '@/shared/types/analysis'
import { coerceValue } from '@/shared/utils/schema'

function matchFilter(row: Record<string, unknown>, f: FilterCondition): boolean {
  const raw = row[f.field]
  const val = raw === undefined || raw === null ? '' : raw
  switch (f.op) {
    case 'eq':
      return String(val) === String(f.value ?? '')
    case 'neq':
      return String(val) !== String(f.value ?? '')
    case 'contains':
      return String(val).toLowerCase().includes(String(f.value ?? '').toLowerCase())
    case 'empty':
      return val === '' || val === null || val === undefined
    case 'notEmpty':
      return !(val === '' || val === null || val === undefined)
    case 'gt':
      return Number(val) > Number(f.value)
    case 'gte':
      return Number(val) >= Number(f.value)
    case 'lt':
      return Number(val) < Number(f.value)
    case 'lte':
      return Number(val) <= Number(f.value)
    case 'between':
      return Number(val) >= Number(f.value) && Number(val) <= Number(f.valueTo)
    default:
      return true
  }
}

export function applyFilters(
  rows: Record<string, unknown>[],
  filters: FilterCondition[],
): Record<string, unknown>[] {
  if (!filters.length) return rows
  return rows.filter((row) => filters.every((f) => matchFilter(row, f)))
}

function applySelect(columns: TableColumn[], rows: Record<string, unknown>[], config: Record<string, unknown>): ViewResult {
  const keep = (config.fields as string[]) || columns.map((c) => c.field)
  const nextCols = columns.filter((c) => keep.includes(c.field))
  const nextRows = rows.map((r) => {
    const o: Record<string, unknown> = { __rowId: r.__rowId }
    for (const f of keep) o[f] = r[f]
    return o
  })
  return { columns: nextCols, rows: nextRows }
}

function applyRename(columns: TableColumn[], rows: Record<string, unknown>[], config: Record<string, unknown>): ViewResult {
  const from = String(config.from || '')
  const to = String(config.to || '')
  if (!from || !to || from === to) return { columns, rows }
  let field = to
  const existing = new Set(columns.map((c) => c.field))
  if (existing.has(field) && field !== from) {
    let i = 1
    while (existing.has(`${to}_${i}`)) i++
    field = `${to}_${i}`
  }
  const nextCols = columns.map((c) =>
    c.field === from ? { ...c, field, title: String(config.title || field) } : c,
  )
  const nextRows = rows.map((r) => {
    const o = { ...r }
    if (from in o) {
      o[field] = o[from]
      if (field !== from) delete o[from]
    }
    return o
  })
  return { columns: nextCols, rows: nextRows }
}

function evalDerived(expr: string, row: Record<string, unknown>): unknown {
  // Very small expression: colA + colB, colA * 2, concat(a,b)
  const concat = expr.match(/^concat\(([^,]+),(.+)\)$/i)
  if (concat) {
    const a = String(row[concat[1].trim()] ?? '')
    const b = String(row[concat[2].trim()] ?? '')
    return a + b
  }
  const tokens = expr.match(/[A-Za-z_][\w]*|[+\-*/()]|\d+(\.\d+)?/g)
  if (!tokens) throw new Error('invalid expression')
  const mapped = tokens
    .map((t) => {
      if (/^[A-Za-z_]/.test(t)) {
        const v = row[t]
        const n = Number(v)
        return Number.isFinite(n) ? String(n) : 'NaN'
      }
      return t
    })
    .join('')
  // eslint-disable-next-line no-new-func
  const result = Function(`"use strict"; return (${mapped})`)()
  return result
}

function applyDerived(columns: TableColumn[], rows: Record<string, unknown>[], config: Record<string, unknown>): ViewResult {
  const field = String(config.field || 'derived')
  const title = String(config.title || field)
  const expr = String(config.expr || '')
  if (!expr) throw new Error('derived expression required')
  const nextCols = [...columns, { field, title, dataType: 'number' as const }]
  const nextRows = rows.map((r) => {
    try {
      return { ...r, [field]: evalDerived(expr, r) }
    } catch {
      return { ...r, [field]: null }
    }
  })
  return { columns: nextCols, rows: nextRows }
}

function applyDedupe(columns: TableColumn[], rows: Record<string, unknown>[], config: Record<string, unknown>): ViewResult {
  const keys = (config.fields as string[]) || []
  if (!keys.length) return { columns, rows }
  const seen = new Set<string>()
  const next: Record<string, unknown>[] = []
  for (const r of rows) {
    const k = keys.map((f) => String(r[f])).join('\0')
    if (seen.has(k)) continue
    seen.add(k)
    next.push(r)
  }
  return { columns, rows: next }
}

function applySort(columns: TableColumn[], rows: Record<string, unknown>[], config: Record<string, unknown>): ViewResult {
  const sorts = (config.sorts as { field: string; order: 'asc' | 'desc' }[]) || []
  if (!sorts.length) return { columns, rows }
  const next = [...rows].sort((a, b) => {
    for (const s of sorts) {
      const av = a[s.field]
      const bv = b[s.field]
      if (av === bv) continue
      if (av == null) return 1
      if (bv == null) return -1
      const cmp = av < bv ? -1 : 1
      return s.order === 'asc' ? cmp : -cmp
    }
    return 0
  })
  return { columns, rows: next }
}

export function applyTransforms(
  columns: TableColumn[],
  rows: Record<string, unknown>[],
  transforms: TransformStep[],
): ViewResult {
  let cols = columns
  let rs = rows
  for (const step of transforms) {
    let out: ViewResult
    switch (step.kind) {
      case 'select':
        out = applySelect(cols, rs, step.config)
        break
      case 'rename':
        out = applyRename(cols, rs, step.config)
        break
      case 'derived':
        out = applyDerived(cols, rs, step.config)
        break
      case 'dedupe':
        out = applyDedupe(cols, rs, step.config)
        break
      case 'sort':
        out = applySort(cols, rs, step.config)
        break
      default:
        out = { columns: cols, rows: rs }
    }
    cols = out.columns
    rs = out.rows
  }
  return { columns: cols, rows: rs }
}

export function runPipeline(input: {
  columns: TableColumn[]
  rows: Record<string, unknown>[]
  tableFilters: FilterCondition[]
  viewFilters: FilterCondition[]
  transforms: TransformStep[]
}): ViewResult {
  const typedRows = input.rows.map((r) => {
    const o = { ...r }
    for (const c of input.columns) {
      if (c.field in o) o[c.field] = coerceValue(o[c.field], c.dataType)
    }
    return o
  })
  const afterTable = applyFilters(typedRows, input.tableFilters)
  const afterView = applyFilters(afterTable, input.viewFilters)
  return applyTransforms(input.columns, afterView, input.transforms)
}

/** True when transforms only sort (or empty) — allows write-back to source table */
export function isIdentityOrSortOnly(transforms: TransformStep[], viewFilters: FilterCondition[]): boolean {
  if (viewFilters.length) return false
  return transforms.every((t) => t.kind === 'sort')
}
