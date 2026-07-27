import type { Dashboard } from './types'
import { db, InsightStudioDB } from './db'

/**
 * DashboardRepository：顶层看板持久化抽象。
 * 当前为 Dexie；日后可替换为 HTTP（与 AnalysisRepository 并列）。
 */
export interface DashboardRepository {
  list(): Promise<Dashboard[]>
  get(id: string): Promise<Dashboard | undefined>
  put(dashboard: Dashboard): Promise<void>
  delete(id: string): Promise<void>
}

export class DexieDashboardRepository implements DashboardRepository {
  constructor(private readonly database: InsightStudioDB = db) {}

  async list(): Promise<Dashboard[]> {
    return this.database.dashboards.orderBy('updatedAt').reverse().toArray()
  }

  async get(id: string): Promise<Dashboard | undefined> {
    return this.database.dashboards.get(id)
  }

  async put(dashboard: Dashboard): Promise<void> {
    await this.database.dashboards.put(JSON.parse(JSON.stringify(dashboard)) as Dashboard)
  }

  async delete(id: string): Promise<void> {
    await this.database.dashboards.delete(id)
  }
}

export const dashboardRepository: DashboardRepository = new DexieDashboardRepository()
