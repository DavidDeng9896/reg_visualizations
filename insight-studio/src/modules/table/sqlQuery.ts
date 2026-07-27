/**
 * 浏览器内 SQL 查询：把当前 Analysis 表注册进 Alasql，执行 SELECT，返回对象行。
 */
import alasql from 'alasql'
import type { AnalysisTable, CellValue, Row } from '../../shared/types'
import { ROW_ID_FIELD } from '../../shared/types'

export interface SqlSchemaTable {
  name: string
  /** SQL 中可用的安全标识符。 */
  sqlName: string
  columns: { field: string; title: string }[]
}

export interface SqlQueryResult {
  rows: Record<string, unknown>[]
  columns: string[]
}

/** 表名 → 合法 SQL 标识符（字母数字下划线；重名加后缀）。 */
export function toSqlIdent(name: string, taken: Set<string>): string {
  let base = name
    .trim()
    .replace(/[^\w\u4e00-\u9fff]+/g, '_')
    .replace(/^(\d)/, '_$1')
  if (!base) base = 'table'
  let out = base
  let i = 2
  while (taken.has(out.toLowerCase())) {
    out = `${base}_${i}`
    i += 1
  }
  taken.add(out.toLowerCase())
  return out
}

export function buildSqlSchema(tables: AnalysisTable[]): SqlSchemaTable[] {
  const taken = new Set<string>()
  return tables.map((t) => ({
    name: t.name,
    sqlName: toSqlIdent(t.name, taken),
    columns: t.columns.map((c) => ({ field: c.field, title: c.title || c.field })),
  }))
}

function rowToPlain(row: Row, columns: AnalysisTable['columns']): Record<string, CellValue> {
  const out: Record<string, CellValue> = {}
  for (const c of columns) {
    if (c.field === ROW_ID_FIELD) continue
    out[c.field] = (row[c.field] as CellValue) ?? null
  }
  return out
}

type AlasqlTables = Record<string, { data: Record<string, CellValue>[] } | undefined>

/**
 * 在 Alasql 中临时注册当前表并执行 SQL。
 * 仅允许 SELECT（只读）。
 */
export function runSqlQuery(sql: string, tables: AnalysisTable[]): SqlQueryResult {
  const text = sql.trim().replace(/;+\s*$/, '')
  if (!text) throw new Error('请输入 SQL')
  if (/^\s*(drop|delete|update|insert|alter|create|truncate|attach|detach)\b/i.test(text)) {
    throw new Error('仅支持 SELECT 查询（只读），不能执行写操作')
  }
  if (text.includes(';')) {
    throw new Error('请一次只执行一条 SELECT 语句')
  }

  const schema = buildSqlSchema(tables)
  const bag = (alasql as unknown as { tables: AlasqlTables }).tables
  const registered: string[] = []

  try {
    for (const s of schema) {
      const src = tables.find((t) => t.name === s.name)
      if (!src) continue
      bag[s.sqlName] = { data: src.rows.map((r) => rowToPlain(r, src.columns)) }
      registered.push(s.sqlName)
    }

    const result = (alasql as unknown as (q: string) => unknown)(text)
    const rows = Array.isArray(result) ? (result as Record<string, unknown>[]) : []
    if (!rows.length) return { rows: [], columns: [] }

    const columns: string[] = []
    for (const r of rows) {
      for (const k of Object.keys(r)) {
        if (!columns.includes(k)) columns.push(k)
      }
    }
    return { rows, columns }
  } finally {
    for (const name of registered) {
      delete bag[name]
    }
  }
}

/** CodeMirror SQL schema：{ tableName: [col, ...] } */
export function schemaForEditor(tables: AnalysisTable[]): Record<string, string[]> {
  const schema = buildSqlSchema(tables)
  const out: Record<string, string[]> = {}
  for (const t of schema) {
    out[t.sqlName] = t.columns.map((c) => c.field)
  }
  return out
}
