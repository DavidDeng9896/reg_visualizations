import type { Analysis } from './types'
import { db, InsightStudioDB } from './db'
import { migrateAnalysisToSteps } from './migrateSteps'
import { normalizeAnalysis } from './normalizeAnalysis'
import { HttpAnalysisRepository, isHttpPersistenceEnabled } from './httpRepository'

/**
 * AnalysisRepository：持久化抽象。
 * 默认 Dexie；设置 VITE_API_BASE_URL 后切换为 insight-api（SQLite/PG）。
 */
export interface AnalysisRepository {
  list(): Promise<Analysis[]>
  get(id: string): Promise<Analysis | undefined>
  /** 新建或整体覆盖（按 id upsert）。 */
  put(analysis: Analysis): Promise<void>
  delete(id: string): Promise<void>
  /** 在单个事务中执行多个写操作，避免半截写入。 */
  transact<T>(fn: () => Promise<T> | T): Promise<T>
}

export class DexieAnalysisRepository implements AnalysisRepository {
  constructor(private readonly database: InsightStudioDB = db) {}

  async list(): Promise<Analysis[]> {
    const rows = await this.database.analyses.orderBy('updatedAt').reverse().toArray()
    return rows.map((raw) => migrateAnalysisToSteps(normalizeAnalysis(raw)))
  }

  async get(id: string): Promise<Analysis | undefined> {
    const raw = await this.database.analyses.get(id)
    if (!raw) return undefined
    return migrateAnalysisToSteps(normalizeAnalysis(raw))
  }

  async put(analysis: Analysis): Promise<void> {
    // Pinia 传进来的可能是响应式 Proxy，结构化克隆会抛 DataCloneError，
    // 导致工作区编辑静默不落盘。Analysis 为纯数据（无 Date/Map/函数），
    // JSON round-trip 安全地剥掉 Proxy。
    const plain = JSON.parse(JSON.stringify(normalizeAnalysis(analysis))) as Analysis
    await this.database.analyses.put(plain)
  }

  async delete(id: string): Promise<void> {
    await this.database.analyses.delete(id)
  }

  async transact<T>(fn: () => Promise<T> | T): Promise<T> {
    return this.database.transaction('rw', this.database.analyses, fn)
  }
}

/** 默认单例，供 app/store/页面直接使用。 */
export const analysisRepository: AnalysisRepository = isHttpPersistenceEnabled()
  ? new HttpAnalysisRepository()
  : new DexieAnalysisRepository()
