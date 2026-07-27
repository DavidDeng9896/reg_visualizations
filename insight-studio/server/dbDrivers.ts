import type { PoolClient } from 'pg'
import pg from 'pg'
import mysql from 'mysql2/promise'
import { assertReadOnlySelect, DEFAULT_ROW_LIMIT, HARD_ROW_CAP } from './sqlGuard.js'

export type SqlDialect = 'postgres' | 'mysql'

export interface DbConnectionConfig {
  dialect: SqlDialect
  host: string
  port: number
  database: string
  user: string
  password: string
  ssl?: boolean
}

export interface QueryResult {
  columns: string[]
  rows: Record<string, unknown>[]
  truncated: boolean
  rowCount: number
}

export interface SchemaTable {
  name: string
  columns: string[]
}

function clampLimit(limit?: number): number {
  const n = Math.floor(limit ?? DEFAULT_ROW_LIMIT)
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_ROW_LIMIT
  return Math.min(n, HARD_ROW_CAP)
}

function normalizeRow(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(row)) {
    if (v instanceof Date) out[k] = v.toISOString()
    else if (typeof Buffer !== 'undefined' && Buffer.isBuffer(v)) out[k] = v.toString('base64')
    else if (typeof v === 'bigint') out[k] = v.toString()
    else out[k] = v
  }
  return out
}

async function withPostgres<T>(cfg: DbConnectionConfig, fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = new pg.Client({
    host: cfg.host,
    port: cfg.port,
    database: cfg.database,
    user: cfg.user,
    password: cfg.password,
    ssl: cfg.ssl ? { rejectUnauthorized: false } : undefined,
    connectionTimeoutMillis: 12_000,
    query_timeout: 60_000,
  })
  await client.connect()
  try {
    await client.query('SET statement_timeout = 60000')
    return await fn(client)
  } finally {
    await client.end().catch(() => undefined)
  }
}

async function withMysql<T>(
  cfg: DbConnectionConfig,
  fn: (conn: mysql.Connection) => Promise<T>,
): Promise<T> {
  const conn = await mysql.createConnection({
    host: cfg.host,
    port: cfg.port,
    database: cfg.database,
    user: cfg.user,
    password: cfg.password,
    ssl: cfg.ssl ? { rejectUnauthorized: false } : undefined,
    connectTimeout: 12_000,
    multipleStatements: false,
    dateStrings: true,
  })
  try {
    return await fn(conn)
  } finally {
    await conn.end().catch(() => undefined)
  }
}

export async function testConnection(cfg: DbConnectionConfig): Promise<{ ok: true; version: string }> {
  if (cfg.dialect === 'postgres') {
    return withPostgres(cfg, async (client) => {
      const r = await client.query('SELECT version() AS version')
      return { ok: true as const, version: String(r.rows[0]?.version ?? 'postgres') }
    })
  }
  return withMysql(cfg, async (conn) => {
    const [rows] = await conn.query('SELECT VERSION() AS version')
    const row = (rows as { version?: string }[])[0]
    return { ok: true as const, version: String(row?.version ?? 'mysql') }
  })
}

export async function fetchSchema(cfg: DbConnectionConfig): Promise<SchemaTable[]> {
  if (cfg.dialect === 'postgres') {
    return withPostgres(cfg, async (client) => {
      const r = await client.query<{ table_name: string; column_name: string }>(
        `SELECT table_name, column_name
         FROM information_schema.columns
         WHERE table_schema = 'public'
         ORDER BY table_name, ordinal_position`,
      )
      const map = new Map<string, string[]>()
      for (const row of r.rows) {
        const cols = map.get(row.table_name) ?? []
        cols.push(row.column_name)
        map.set(row.table_name, cols)
      }
      return [...map.entries()].map(([name, columns]) => ({ name, columns }))
    })
  }
  return withMysql(cfg, async (conn) => {
    const [rows] = await conn.query(
      `SELECT TABLE_NAME AS table_name, COLUMN_NAME AS column_name
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
       ORDER BY TABLE_NAME, ORDINAL_POSITION`,
    )
    const map = new Map<string, string[]>()
    for (const row of rows as { table_name: string; column_name: string }[]) {
      const cols = map.get(row.table_name) ?? []
      cols.push(row.column_name)
      map.set(row.table_name, cols)
    }
    return [...map.entries()].map(([name, columns]) => ({ name, columns }))
  })
}

export async function runQuery(
  cfg: DbConnectionConfig,
  sql: string,
  limit?: number,
): Promise<QueryResult> {
  const text = assertReadOnlySelect(sql)
  const max = clampLimit(limit)

  if (cfg.dialect === 'postgres') {
    return withPostgres(cfg, async (client) => {
      // 多取 1 行判断是否截断
      const wrapped = `SELECT * FROM (${text}) AS _is_q LIMIT ${max + 1}`
      const r = await client.query(wrapped)
      const truncated = r.rows.length > max
      const sliced = truncated ? r.rows.slice(0, max) : r.rows
      const columns = r.fields?.map((f) => f.name) ?? (sliced[0] ? Object.keys(sliced[0]) : [])
      const rows = sliced.map((row) => normalizeRow(row as Record<string, unknown>))
      return { columns, rows, truncated, rowCount: rows.length }
    })
  }

  return withMysql(cfg, async (conn) => {
    const wrapped = `SELECT * FROM (${text}) AS _is_q LIMIT ${max + 1}`
    const [rows, fields] = await conn.query(wrapped)
    const list = rows as Record<string, unknown>[]
    const truncated = list.length > max
    const sliced = truncated ? list.slice(0, max) : list
    const columns =
      (fields as { name: string }[] | undefined)?.map((f) => f.name) ??
      (sliced[0] ? Object.keys(sliced[0]) : [])
    return {
      columns,
      rows: sliced.map(normalizeRow),
      truncated,
      rowCount: sliced.length,
    }
  })
}
