import type { Dashboard } from './types'
import { db, InsightStudioDB } from './db'
import { isHttpPersistenceEnabled } from './httpRepository'

/**
 * DashboardRepository：顶层看板持久化抽象。
 * 设置 VITE_API_BASE_URL 后走 insight-api；否则用 Dexie。
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

class HttpDashboardRepository implements DashboardRepository {
  private base(): string {
    return String(import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')
  }

  private async req<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${this.base()}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    })
    if (res.status === 204) return undefined as T
    if (!res.ok) throw new Error(`insight-api ${res.status}`)
    return (await res.json()) as T
  }

  list(): Promise<Dashboard[]> {
    return this.req('/api/dashboards')
  }

  async get(id: string): Promise<Dashboard | undefined> {
    try {
      return await this.req(`/api/dashboards/${encodeURIComponent(id)}`)
    } catch {
      return undefined
    }
  }

  async put(dashboard: Dashboard): Promise<void> {
    await this.req(`/api/dashboards/${encodeURIComponent(dashboard.id)}`, {
      method: 'PUT',
      body: JSON.stringify(dashboard),
    })
  }

  async delete(id: string): Promise<void> {
    await this.req(`/api/dashboards/${encodeURIComponent(id)}`, { method: 'DELETE' })
  }
}

export const dashboardRepository: DashboardRepository = isHttpPersistenceEnabled()
  ? new HttpDashboardRepository()
  : new DexieDashboardRepository()
