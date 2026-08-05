/**
 * 刷新 query-sql 源步骤：重新查询外部库 / 本地 Alasql，替换产出表快照，并传播下游 stale→重跑。
 * 密码仍只从本机 localStorage 连接档案读取，不进 Analysis 文档。
 */
import type { Analysis, AnalysisTable, ColumnMeta, DataType, Row, StepNode } from '../../shared/types'
import { ROW_ID_FIELD } from '../../shared/types'
import { ensureRowIds, sealRows } from '../../shared/factories'
import { useAnalysisStore } from '../../stores/analysisStore'
import { listDbConnections } from './dbConnections'
import type { DbConnectionProfile } from './dbConnectionTypes'
import { runRemoteSqlQuery } from './remoteSql'
import { runSqlQuery } from './sqlQuery'
import { coerceValue, inferColumnTypes } from './csv'
import { objectRowsToGrid } from './commitImport'
import { propagateTableEdit } from '../steps/rerun'

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

/** 内容指纹：列序 + 行值（不含行 id），用于判断库数据是否真变了。 */
export function snapshotFingerprint(headers: string[], rows: Record<string, unknown>[]): string {
  const cols = headers.join('\0')
  const body = rows
    .map((r) => headers.map((h) => (r[h] == null ? '' : String(r[h]))).join('\0'))
    .join('\n')
  return `${cols}\n${body}`
}

/** 按 connectionId 或 connectionName 解析本机连接档案。 */
export function resolveDbConnection(config: Record<string, unknown>): DbConnectionProfile | null {
  const list = listDbConnections()
  const id = typeof config.connectionId === 'string' ? config.connectionId.trim() : ''
  if (id) {
    const byId = list.find((c) => c.id === id)
    if (byId) return byId
  }
  const name = typeof config.connectionName === 'string' ? config.connectionName.trim() : ''
  if (name) {
    const byName = list.find((c) => c.name === name)
    if (byName) return byName
  }
  // 兜底：host+database+dialect 匹配
  const host = typeof config.host === 'string' ? config.host.trim() : ''
  const database = typeof config.database === 'string' ? config.database.trim() : ''
  const dialect = typeof config.dialect === 'string' ? config.dialect : ''
  if (host && database) {
    return (
      list.find(
        (c) =>
          c.host.trim() === host &&
          c.database.trim() === database &&
          (!dialect || c.dialect === dialect),
      ) ?? null
    )
  }
  return null
}

function preserveTypes(prev: ColumnMeta[], headers: string[]): DataType[] {
  const byField = new Map(prev.map((c) => [c.field, c.dataType]))
  const inferred = inferColumnTypes(headers, [])
  return headers.map((h, i) => byField.get(h) ?? inferred[i]?.dataType ?? 'string')
}

/** 用查询结果替换表内容（保留 table id / views / stepId）。 */
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
  // 保留已有 structure 等用户改过的类型
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

async function fetchRemote(step: StepNode): Promise<{ columns: string[]; rows: Record<string, unknown>[] }> {
  const sql = String(step.config.sql ?? '').trim()
  if (!sql) throw new RefreshSqlError('步骤缺少 SQL')
  const conn = resolveDbConnection(step.config)
  if (!conn) {
    throw new RefreshSqlError('找不到本机数据库连接档案。请在「从 SQL 导入」中保存同名连接后再刷新。')
  }
  const result = await runRemoteSqlQuery(conn, sql)
  return { columns: result.columns, rows: result.rows }
}

function fetchLocal(analysis: Analysis, step: StepNode): { columns: string[]; rows: Record<string, unknown>[] } {
  const sql = String(step.config.sql ?? '').trim()
  if (!sql) throw new RefreshSqlError('步骤缺少 SQL')
  const exclude = new Set(step.output.tables)
  const inputs = analysis.tables.filter((t) => !exclude.has(t.id))
  return runSqlQuery(sql, inputs)
}

/**
 * 刷新指定 query-sql 步骤；成功后更新 lastSyncedAt 并传播下游。
 */
export async function refreshSqlSourceStep(stepId: string): Promise<RefreshSqlResult> {
  const store = useAnalysisStore()
  const analysis = store.current
  if (!analysis) throw new RefreshSqlError('未打开分析')
  const step = analysis.steps.find((s) => s.id === stepId)
  if (!step || step.type !== 'query-sql') throw new RefreshSqlError('仅支持 query-sql 源步骤')
  const tableId = step.output.tables[0]
  if (!tableId) throw new RefreshSqlError('步骤没有产出表')
  const table = analysis.tables.find((t) => t.id === tableId)
  if (!table) throw new RefreshSqlError('产出表不存在')

  store.mutate((a) => {
    const s = a.steps.find((x) => x.id === stepId)
    if (s) {
      s.status = 'running'
      s.error = undefined
    }
  })

  try {
    const source = String(step.config.source ?? 'remote')
    const fetched =
      source === 'local'
        ? fetchLocal(store.current!, step)
        : await fetchRemote(step)

    let headers = fetched.columns
    let objectRows = fetched.rows
    if (!headers.length && objectRows.length) {
      const grid = objectRowsToGrid(objectRows)
      headers = grid.headers
    }

    const fp = snapshotFingerprint(headers, objectRows)
    const prevFp = typeof step.config.contentFingerprint === 'string' ? step.config.contentFingerprint : ''
    if (prevFp && prevFp === fp) {
      store.mutate((a) => {
        const s = a.steps.find((x) => x.id === stepId)
        if (!s) return
        s.config.lastSyncedAt = new Date().toISOString()
        s.status = 'configured'
        s.error = undefined
      })
      const t = store.current?.tables.find((x) => x.id === tableId)
      return {
        tableId,
        rowCount: t?.rows.length ?? 0,
        columnCount: t?.columns.length ?? 0,
        mode: 'unchanged',
        ran: 0,
      }
    }

    let propagate: { mode: Exclude<RefreshSqlResult['mode'], 'unchanged'>; ran: number } = {
      mode: 'noop',
      ran: 0,
    }
    store.mutate((a) => {
      const s = a.steps.find((x) => x.id === stepId)
      const t = a.tables.find((x) => x.id === tableId)
      if (!s || !t) return
      applySnapshotToTable(t, headers, objectRows)
      s.config.lastSyncedAt = new Date().toISOString()
      s.config.lastRowCount = t.rows.length
      s.config.contentFingerprint = fp
      s.status = 'configured'
      s.error = undefined
      propagate = propagateTableEdit(a, tableId)
    })

    return {
      tableId,
      rowCount: store.current?.tables.find((t) => t.id === tableId)?.rows.length ?? 0,
      columnCount: store.current?.tables.find((t) => t.id === tableId)?.columns.length ?? 0,
      mode: propagate.mode,
      ran: propagate.ran,
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    store.mutate((a) => {
      const s = a.steps.find((x) => x.id === stepId)
      if (s) {
        s.status = 'failed'
        s.error = msg
      }
    })
    throw e instanceof RefreshSqlError ? e : new RefreshSqlError(msg)
  }
}

/** 刷新分析内所有带 autoRefresh 的 remote query-sql（用于轮询）。 */
export async function refreshAutoSqlSources(): Promise<number> {
  const store = useAnalysisStore()
  const a = store.current
  if (!a) return 0
  const targets = a.steps.filter((s) => {
    if (s.type !== 'query-sql') return false
    if (String(s.config.source ?? 'remote') === 'local') return false
    return !!s.config.autoRefresh
  })
  let n = 0
  for (const s of targets) {
    try {
      const r = await refreshSqlSourceStep(s.id)
      if (r.mode !== 'unchanged') n += 1
    } catch {
      /* 单个失败不阻断其余 */
    }
  }
  return n
}
