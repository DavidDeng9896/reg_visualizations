import Papa from 'papaparse'
import type { Analysis, Dashboard } from '../../insight-studio/src/shared/types'
import { createTable, sealRows } from '../../insight-studio/src/shared/factories'
import { uuid } from '../../insight-studio/src/shared/id'
import { inferColumnTypes } from '../../insight-studio/src/modules/table/csv'
import { decodeCsvBytes } from '../../insight-studio/src/modules/table/csv'
import { parseExcelBuffer } from '../../insight-studio/src/modules/table/excel'
import {
  applySnapshotToTable,
  snapshotFingerprint,
  objectRowsToGrid,
  RefreshSqlError,
  type RefreshSqlResult,
} from './sqlRefresh.ts'
import { propagateTableEdit } from '../../insight-studio/src/modules/steps/rerun'
import { runSqlQuery } from '../../insight-studio/src/modules/table/sqlQuery'
import type { DbConnectionProfile } from '../../insight-studio/src/modules/table/dbConnectionTypes'
import type { ToolWorkspace } from '../../insight-studio/src/modules/ai/tools/workspace'
import type { AiFileMeta } from '../../insight-studio/src/modules/ai/client'
import type { ImportedTableInfo } from '../../insight-studio/src/modules/ai/attachments'
import type { Row, StepNode } from '../../insight-studio/src/shared/types'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  })
  if (res.status === 204) return undefined as T
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`insight-api ${res.status}: ${text || res.statusText}`)
  }
  return (await res.json()) as T
}

function resolveConn(config: Record<string, unknown>, list: DbConnectionProfile[]): DbConnectionProfile | null {
  const id = typeof config.connectionId === 'string' ? config.connectionId.trim() : ''
  if (id) return list.find((c) => c.id === id) ?? null
  const name = typeof config.connectionName === 'string' ? config.connectionName.trim() : ''
  if (name) return list.find((c) => c.name === name) ?? null
  return null
}

export function createHttpWorkspace(opts: {
  analysisId?: string
  sqlConnections?: DbConnectionProfile[]
}): ToolWorkspace {
  let current: Analysis | null = null
  let selected: ToolWorkspace['selected'] = null
  let currentDashboardId: string | null = null
  let dirty = false
  const sqlConnections = opts.sqlConnections ?? []

  const ws: ToolWorkspace = {
    get current() {
      return current
    },
    get selected() {
      return selected
    },
    get sqlConnections() {
      return sqlConnections
    },
    get currentDashboardId() {
      return currentDashboardId
    },
    async listAnalyses() {
      return request<Analysis[]>('/api/analyses')
    },
    async getAnalysis(id) {
      try {
        return await request<Analysis>(`/api/analyses/${encodeURIComponent(id)}`)
      } catch (e) {
        if (e instanceof Error && e.message.includes('404')) return undefined
        throw e
      }
    },
    async putAnalysis(a) {
      const plain = JSON.parse(JSON.stringify(a)) as Analysis
      plain.files = Array.isArray(plain.files) ? plain.files : []
      await request(`/api/analyses/${encodeURIComponent(plain.id)}`, {
        method: 'PUT',
        body: JSON.stringify(plain),
      })
      dirty = false
    },
    async load(id) {
      const found = await ws.getAnalysis(id)
      current = found ?? null
      selected = null
      dirty = false
      return !!found
    },
    mutate(fn) {
      if (!current) return
      fn(current)
      current.updatedAt = new Date().toISOString()
      current.revision = (current.revision ?? 0) + 1
      dirty = true
    },
    async flush() {
      if (current && dirty) await ws.putAnalysis(current)
    },
    async getDashboard(id) {
      try {
        return await request<Dashboard>(`/api/dashboards/${encodeURIComponent(id)}`)
      } catch (e) {
        if (e instanceof Error && e.message.includes('404')) return undefined
        throw e
      }
    },
    async putDashboard(d) {
      await request(`/api/dashboards/${encodeURIComponent(d.id)}`, {
        method: 'PUT',
        body: JSON.stringify(d),
      })
    },
    async loadDashboardList() {
      /* 后端无 Pinia 列表缓存 */
    },
    async loadDashboard(id) {
      currentDashboardId = id
    },
    async listSkills() {
      return request('/api/ai/skills')
    },
    async getSkill(id) {
      return request(`/api/ai/skills/${encodeURIComponent(id)}`)
    },
    async listFiles() {
      return request('/api/ai/files')
    },
    async fileMeta(id) {
      return request(`/api/ai/files/${encodeURIComponent(id)}/meta`)
    },
    async importAiFile(att, importOpts) {
      requireAnalysis()
      const meta = await ws.fileMeta(att.id)
      const res = await fetch(`/api/ai/files/${encodeURIComponent(att.id)}`)
      if (!res.ok) throw new Error('下载附件失败')
      const buf = await res.arrayBuffer()
      const out: ImportedTableInfo[] = []
      if (meta.kind === 'csv') {
        const { text } = decodeCsvBytes(buf)
        const parsed = Papa.parse<string[]>(text, { skipEmptyLines: 'greedy' })
        const rows = (parsed.data ?? []).filter((r) => Array.isArray(r) && r.some((c) => String(c ?? '').trim() !== ''))
        if (rows.length < 2) throw new Error(`CSV「${meta.name}」没有可用数据行`)
        const headers = rows[0].map((c) => String(c ?? ''))
        const dataRows = rows.slice(1).map((r) => r.map((c) => String(c ?? '')))
        out.push(commitCsv(headers, dataRows, importOpts?.tableNameHint || meta.name.replace(/\.csv$/i, '') || '导入表'))
        return out
      }
      if (meta.kind === 'excel') {
        const parsed = parseExcelBuffer(buf)
        const sheets =
          importOpts?.sheetNames?.length ? importOpts.sheetNames : parsed.sheetNames
        const base = importOpts?.tableNameHint || meta.name.replace(/\.(xlsx|xls)$/i, '') || '导入表'
        for (const sheetName of sheets) {
          const sheet = parsed.sheets[sheetName]
          if (!sheet) continue
          const committed = commitCsv(
            sheet.headers,
            sheet.dataRows,
            sheets.length > 1 ? `${base}_${sheetName}` : base,
          )
          committed.sheetName = sheetName
          out.push(committed)
        }
        if (!out.length) throw new Error(`Excel「${meta.name}」没有可导入的工作表`)
        return out
      }
      throw new Error(`附件 kind=${meta.kind} 不支持导入`)
    },
    async createMemory(content) {
      return request('/api/ai/memories', { method: 'POST', body: JSON.stringify({ content }) })
    },
    async refreshSqlSource(stepId) {
      const a = requireAnalysis()
      const step = a.steps.find((s) => s.id === stepId)
      if (!step || step.type !== 'query-sql') throw new RefreshSqlError('仅支持 query-sql 源步骤')
      const tableId = step.output.tables[0]
      if (!tableId) throw new RefreshSqlError('步骤没有产出表')
      const table = a.tables.find((t) => t.id === tableId)
      if (!table) throw new RefreshSqlError('产出表不存在')
      const source = String(step.config.source ?? 'remote')
      let headers: string[] = []
      let objectRows: Record<string, unknown>[] = []
      if (source === 'local') {
        const exclude = new Set(step.output.tables)
        const inputs = a.tables.filter((t) => !exclude.has(t.id))
        const fetched = runSqlQuery(String(step.config.sql ?? ''), inputs)
        headers = fetched.columns
        objectRows = fetched.rows
      } else {
        const conn = resolveConn(step.config, sqlConnections)
        if (!conn) throw new RefreshSqlError('找不到数据库连接档案。请在会话中附带本机连接后再刷新。')
        const q = await fetch('/api/sql/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dialect: conn.dialect,
            host: conn.host,
            port: Number(conn.port),
            database: conn.database,
            user: conn.user,
            password: conn.password,
            ssl: !!conn.ssl,
            sql: String(step.config.sql ?? ''),
            limit: 10_000,
          }),
        })
        const data = (await q.json()) as { ok?: boolean; error?: string; columns?: string[]; rows?: Record<string, unknown>[] }
        if (!q.ok || data.ok === false) throw new RefreshSqlError(data.error || 'SQL 查询失败')
        headers = data.columns ?? []
        objectRows = data.rows ?? []
      }
      if (!headers.length && objectRows.length) headers = objectRowsToGrid(objectRows).headers
      const fp = snapshotFingerprint(headers, objectRows)
      const prevFp = typeof step.config.contentFingerprint === 'string' ? step.config.contentFingerprint : ''
      if (prevFp && prevFp === fp) {
        ws.mutate((an) => {
          const s = an.steps.find((x) => x.id === stepId)
          if (s) {
            s.config.lastSyncedAt = new Date().toISOString()
            s.status = 'configured'
          }
        })
        return { tableId, rowCount: table.rows.length, columnCount: table.columns.length, mode: 'unchanged', ran: 0 }
      }
      let propagate: RefreshSqlResult = { tableId, rowCount: 0, columnCount: 0, mode: 'noop', ran: 0 }
      ws.mutate((an) => {
        const s = an.steps.find((x) => x.id === stepId)
        const t = an.tables.find((x) => x.id === tableId)
        if (!s || !t) return
        applySnapshotToTable(t, headers, objectRows)
        s.config.lastSyncedAt = new Date().toISOString()
        s.config.lastRowCount = t.rows.length
        s.config.contentFingerprint = fp
        s.status = 'configured'
        const p = propagateTableEdit(an, tableId)
        propagate = {
          tableId,
          rowCount: t.rows.length,
          columnCount: t.columns.length,
          mode: p.mode,
          ran: p.ran,
        }
      })
      return propagate
    },
  }

  function requireAnalysis(): Analysis {
    if (!current) throw new Error('当前没有打开的分析')
    return current
  }

  function commitCsv(headers: string[], dataRows: string[][], tableName: string): ImportedTableInfo {
    const columns = inferColumnTypes(headers, dataRows)
    const rows: Row[] = dataRows.map((cells) => {
      const row: Row = {}
      headers.forEach((h, i) => {
        const col = columns[i]
        row[h] = col && col.dataType === 'number' ? Number(cells[i]) || null : ((cells[i] ?? '') as string)
      })
      return row
    })
    const table = createTable(tableName, columns, sealRows(rows), 'demo')
    const step: StepNode = {
      id: uuid(),
      type: 'upload-csv',
      name: tableName,
      inputs: [],
      config: { tableName },
      status: 'configured',
      output: { tables: [table.id], files: [], views: [] },
    }
    table.stepId = step.id
    ws.mutate((analysis) => {
      analysis.tables.push(table)
      analysis.steps.push(step)
    })
    return { tableId: table.id, stepId: step.id, name: tableName, rowCount: rows.length, columnCount: columns.length }
  }

  if (opts.analysisId) {
    void ws.load(opts.analysisId)
  }

  return ws
}

export async function readyHttpWorkspace(opts: {
  analysisId?: string
  sqlConnections?: DbConnectionProfile[]
}): Promise<ToolWorkspace> {
  const ws = createHttpWorkspace(opts)
  if (opts.analysisId) await ws.load(opts.analysisId)
  return ws
}
