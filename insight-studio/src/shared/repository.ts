import type { Analysis } from './types'
import { db, InsightStudioDB } from './db'

/**
 * AnalysisRepository：持久化抽象。当前为 Dexie 实现，日后可替换为 HTTP 实现。
 * 所有方法按整个 Analysis 文档读写；导入/合并等多步写入用 transaction 包裹。
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
    return this.database.analyses.orderBy('updatedAt').reverse().toArray()
  }

  async get(id: string): Promise<Analysis | undefined> {
    return this.database.analyses.get(id)
  }

  async put(analysis: Analysis): Promise<void> {
    // Pinia 传进来的可能是响应式 Proxy，结构化克隆会抛 DataCloneError，
    // 导致工作区编辑静默不落盘。Analysis 为纯数据（无 Date/Map/函数），
    // JSON round-trip 安全地剥掉 Proxy。
    await this.database.analyses.put(JSON.parse(JSON.stringify(analysis)) as Analysis)
  }

  async delete(id: string): Promise<void> {
    await this.database.analyses.delete(id)
  }

  async transact<T>(fn: () => Promise<T> | T): Promise<T> {
    return this.database.transaction('rw', this.database.analyses, fn)
  }
}

/** 默认单例，供 app/store/页面直接使用。 */
export const analysisRepository: AnalysisRepository = new DexieAnalysisRepository()
