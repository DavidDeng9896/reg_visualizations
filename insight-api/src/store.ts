/**
 * SQLite store mirroring the PostgreSQL schema (JSONB → TEXT).
 * Production can swap to pg using migrations/001_init.pg.sql.
 */
import Database from 'better-sqlite3'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DEFAULT_DB = path.resolve(__dirname, '../data/insight.sqlite')

export const DEFAULT_WORKSPACE = '00000000-0000-0000-0000-000000000001'

export interface AnalysisDoc {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  revision?: number
  tables: Array<{
    id: string
    name: string
    columns: unknown[]
    rows: unknown[]
    stepId?: string
    [k: string]: unknown
  }>
  steps?: unknown[]
  flowchartLayout?: Record<string, unknown>
  files?: unknown[]
  [k: string]: unknown
}

export interface DashboardDoc {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  revision?: number
  layout: unknown
  widgets: unknown[]
  [k: string]: unknown
}

export class InsightStore {
  readonly db: Database.Database

  constructor(dbPath: string = process.env.INSIGHT_DB_PATH || DEFAULT_DB) {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true })
    this.db = new Database(dbPath)
    this.db.pragma('journal_mode = WAL')
    this.db.pragma('foreign_keys = ON')
    this.migrate()
  }

  private migrate() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS analyses (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL DEFAULT '${DEFAULT_WORKSPACE}',
        name TEXT NOT NULL,
        revision INTEGER NOT NULL DEFAULT 0,
        document TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT
      );
      CREATE INDEX IF NOT EXISTS analyses_workspace_updated
        ON analyses (workspace_id, updated_at DESC);

      CREATE TABLE IF NOT EXISTS dashboards (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL DEFAULT '${DEFAULT_WORKSPACE}',
        name TEXT NOT NULL,
        revision INTEGER NOT NULL DEFAULT 0,
        document TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS dashboards_workspace_updated
        ON dashboards (workspace_id, updated_at DESC);

      CREATE TABLE IF NOT EXISTS table_snapshots (
        id TEXT PRIMARY KEY,
        analysis_id TEXT NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
        table_id TEXT NOT NULL,
        step_id TEXT,
        data_version TEXT NOT NULL,
        columns TEXT NOT NULL,
        rows TEXT NOT NULL,
        row_count INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        UNIQUE (analysis_id, table_id, data_version)
      );
      CREATE INDEX IF NOT EXISTS table_snapshots_latest
        ON table_snapshots (analysis_id, table_id, created_at DESC);

      CREATE TABLE IF NOT EXISTS event_outbox (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        workspace_id TEXT NOT NULL DEFAULT '${DEFAULT_WORKSPACE}',
        event_type TEXT NOT NULL,
        payload TEXT NOT NULL,
        created_at TEXT NOT NULL,
        published_at TEXT
      );
    `)
  }

  listAnalyses(workspaceId = DEFAULT_WORKSPACE): AnalysisDoc[] {
    const rows = this.db
      .prepare(
        `SELECT document FROM analyses
         WHERE workspace_id = ? AND deleted_at IS NULL
         ORDER BY updated_at DESC`,
      )
      .all(workspaceId) as { document: string }[]
    return rows.map((r) => JSON.parse(r.document) as AnalysisDoc)
  }

  getAnalysis(id: string): AnalysisDoc | undefined {
    const row = this.db
      .prepare(`SELECT document FROM analyses WHERE id = ? AND deleted_at IS NULL`)
      .get(id) as { document: string } | undefined
    return row ? (JSON.parse(row.document) as AnalysisDoc) : undefined
  }

  putAnalysis(analysis: AnalysisDoc, workspaceId = DEFAULT_WORKSPACE): AnalysisDoc {
    const now = new Date().toISOString()
    const revision = typeof analysis.revision === 'number' ? analysis.revision : 0
    const doc: AnalysisDoc = {
      ...analysis,
      revision,
      updatedAt: analysis.updatedAt || now,
      createdAt: analysis.createdAt || now,
      files: Array.isArray(analysis.files) ? analysis.files : [],
    }

    const tx = this.db.transaction(() => {
      this.db
        .prepare(
          `INSERT INTO analyses (id, workspace_id, name, revision, document, created_at, updated_at, deleted_at)
           VALUES (@id, @workspace_id, @name, @revision, @document, @created_at, @updated_at, NULL)
           ON CONFLICT(id) DO UPDATE SET
             name = excluded.name,
             revision = excluded.revision,
             document = excluded.document,
             updated_at = excluded.updated_at,
             deleted_at = NULL`,
        )
        .run({
          id: doc.id,
          workspace_id: workspaceId,
          name: doc.name,
          revision,
          document: JSON.stringify(doc),
          created_at: doc.createdAt,
          updated_at: doc.updatedAt,
        })

      // Persist each table's data content as a snapshot (no raw import files).
      const upsertSnap = this.db.prepare(
        `INSERT INTO table_snapshots
           (id, analysis_id, table_id, step_id, data_version, columns, rows, row_count, created_at)
         VALUES (@id, @analysis_id, @table_id, @step_id, @data_version, @columns, @rows, @row_count, @created_at)
         ON CONFLICT(analysis_id, table_id, data_version) DO UPDATE SET
           columns = excluded.columns,
           rows = excluded.rows,
           row_count = excluded.row_count,
           step_id = excluded.step_id,
           created_at = excluded.created_at`,
      )
      for (const table of doc.tables ?? []) {
        const dataVersion = `r${revision}`
        upsertSnap.run({
          id: randomUUID(),
          analysis_id: doc.id,
          table_id: table.id,
          step_id: table.stepId ?? null,
          data_version: dataVersion,
          columns: JSON.stringify(table.columns ?? []),
          rows: JSON.stringify(table.rows ?? []),
          row_count: Array.isArray(table.rows) ? table.rows.length : 0,
          created_at: doc.updatedAt,
        })
      }

      this.db
        .prepare(
          `INSERT INTO event_outbox (workspace_id, event_type, payload, created_at)
           VALUES (?, 'analysis.updated', ?, ?)`,
        )
        .run(
          workspaceId,
          JSON.stringify({ id: doc.id, revision, reason: 'put' }),
          doc.updatedAt,
        )
    })
    tx()
    return doc
  }

  deleteAnalysis(id: string): boolean {
    const info = this.db.prepare(`DELETE FROM analyses WHERE id = ?`).run(id)
    return info.changes > 0
  }

  listDashboards(workspaceId = DEFAULT_WORKSPACE): DashboardDoc[] {
    const rows = this.db
      .prepare(
        `SELECT document FROM dashboards WHERE workspace_id = ? ORDER BY updated_at DESC`,
      )
      .all(workspaceId) as { document: string }[]
    return rows.map((r) => JSON.parse(r.document) as DashboardDoc)
  }

  getDashboard(id: string): DashboardDoc | undefined {
    const row = this.db.prepare(`SELECT document FROM dashboards WHERE id = ?`).get(id) as
      | { document: string }
      | undefined
    return row ? (JSON.parse(row.document) as DashboardDoc) : undefined
  }

  putDashboard(dashboard: DashboardDoc, workspaceId = DEFAULT_WORKSPACE): DashboardDoc {
    const now = new Date().toISOString()
    const revision = typeof dashboard.revision === 'number' ? dashboard.revision : 0
    const doc: DashboardDoc = {
      ...dashboard,
      revision,
      updatedAt: dashboard.updatedAt || now,
      createdAt: dashboard.createdAt || now,
    }
    this.db
      .prepare(
        `INSERT INTO dashboards (id, workspace_id, name, revision, document, created_at, updated_at)
         VALUES (@id, @workspace_id, @name, @revision, @document, @created_at, @updated_at)
         ON CONFLICT(id) DO UPDATE SET
           name = excluded.name,
           revision = excluded.revision,
           document = excluded.document,
           updated_at = excluded.updated_at`,
      )
      .run({
        id: doc.id,
        workspace_id: workspaceId,
        name: doc.name,
        revision,
        document: JSON.stringify(doc),
        created_at: doc.createdAt,
        updated_at: doc.updatedAt,
      })
    return doc
  }

  deleteDashboard(id: string): boolean {
    const info = this.db.prepare(`DELETE FROM dashboards WHERE id = ?`).run(id)
    return info.changes > 0
  }

  /** Latest data-content snapshot for a table (for external callers). */
  getLatestSnapshot(analysisId: string, tableId: string) {
    const row = this.db
      .prepare(
        `SELECT * FROM table_snapshots
         WHERE analysis_id = ? AND table_id = ?
         ORDER BY created_at DESC LIMIT 1`,
      )
      .get(analysisId, tableId) as
      | {
          id: string
          data_version: string
          columns: string
          rows: string
          row_count: number
          created_at: string
        }
      | undefined
    if (!row) return undefined
    return {
      id: row.id,
      analysisId,
      tableId,
      dataVersion: row.data_version,
      columns: JSON.parse(row.columns),
      rows: JSON.parse(row.rows),
      rowCount: row.row_count,
      createdAt: row.created_at,
    }
  }
}
