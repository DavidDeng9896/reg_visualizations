/**
 * 调用本地 SQL 代理拉取外部库数据。
 */
import type { DbConnectionProfile, SqlDialect } from './dbConnectionTypes'
import type { SqlQueryResult } from './sqlQuery'

export interface RemoteSchemaTable {
  name: string
  columns: string[]
}

function apiBase(): string {
  // Vite 开发代理 /api/sql → 7120；也可通过 VITE_SQL_PROXY_URL 直连
  const env = (import.meta as ImportMeta & { env?: Record<string, string> }).env
  return (env?.VITE_SQL_PROXY_URL || '').replace(/\/$/, '')
}

function url(path: string): string {
  return `${apiBase()}${path}`
}

export interface RemoteConnectionPayload {
  dialect: SqlDialect
  host: string
  port: number
  database: string
  user: string
  password: string
  ssl: boolean
}

export function toPayload(p: DbConnectionProfile): RemoteConnectionPayload {
  return {
    dialect: p.dialect,
    host: p.host.trim(),
    port: Number(p.port),
    database: p.database.trim(),
    user: p.user.trim(),
    password: p.password,
    ssl: !!p.ssl,
  }
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  let res: Response
  try {
    res = await fetch(url(path), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch {
    throw new Error('无法连接 SQL 代理。请点「启动」，或在 insight-studio 目录运行 npm run dev:api')
  }
  const data = (await res.json().catch(() => ({}))) as T & { ok?: boolean; error?: string }
  if (!res.ok || (data as { ok?: boolean }).ok === false) {
    throw new Error((data as { error?: string }).error || `请求失败（HTTP ${res.status}）`)
  }
  return data
}

export async function checkSqlProxyHealth(): Promise<boolean> {
  try {
    const res = await fetch(url('/api/sql/health'))
    if (!res.ok) return false
    const data = (await res.json()) as { ok?: boolean }
    return !!data.ok
  } catch {
    return false
  }
}

/** 请已运行的 Vite 开发服务器拉起本机 SQL 代理（:7120）。 */
export async function startSqlProxy(): Promise<void> {
  let res: Response
  try {
    res = await fetch('/__insight/sql-proxy/start', { method: 'POST' })
  } catch {
    throw new Error('无法请求开发服务器启动 SQL 代理')
  }
  if (res.status === 404) {
    throw new Error('当前环境不能一键启动代理，请在本机终端运行 npm run dev:api')
  }
  const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string }
  if (!res.ok || data.ok === false) {
    throw new Error(data.error || '启动 SQL 代理失败')
  }
  if (await checkSqlProxyHealth()) return
  throw new Error('SQL 代理已请求启动，但尚未就绪，请稍后再试')
}

export async function testRemoteConnection(p: DbConnectionProfile): Promise<string> {
  const data = await postJson<{ ok: boolean; version?: string; error?: string }>('/api/sql/test', toPayload(p))
  return data.version || 'ok'
}

export async function fetchRemoteSchema(p: DbConnectionProfile): Promise<RemoteSchemaTable[]> {
  const data = await postJson<{ ok: boolean; tables: RemoteSchemaTable[] }>('/api/sql/schema', toPayload(p))
  return data.tables ?? []
}

export async function runRemoteSqlQuery(
  p: DbConnectionProfile,
  sql: string,
  limit = 10_000,
): Promise<SqlQueryResult & { truncated?: boolean }> {
  const data = await postJson<{
    ok: boolean
    columns: string[]
    rows: Record<string, unknown>[]
    truncated?: boolean
  }>('/api/sql/query', { ...toPayload(p), sql, limit })
  return {
    columns: data.columns ?? [],
    rows: data.rows ?? [],
    truncated: data.truncated,
  }
}

export function remoteSchemaForEditor(tables: RemoteSchemaTable[]): Record<string, string[]> {
  const out: Record<string, string[]> = {}
  for (const t of tables) out[t.name] = t.columns
  return out
}
