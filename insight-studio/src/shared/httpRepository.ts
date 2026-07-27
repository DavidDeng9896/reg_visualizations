/**
 * HTTP AnalysisRepository：对接 insight-api（PostgreSQL/SQLite）。
 * 通过 VITE_API_BASE_URL 启用；未设置时仍用 Dexie。
 */
import type { Analysis } from './types'
import { migrateAnalysisToSteps } from './migrateSteps'
import { normalizeAnalysis } from './normalizeAnalysis'
import type { AnalysisRepository } from './repository'

function apiBase(): string {
  const raw = import.meta.env.VITE_API_BASE_URL
  if (typeof raw !== 'string') return ''
  return raw.trim().replace(/\/$/, '')
}

/** 只要定义了 VITE_API_BASE_URL（可为空=同源代理）即启用 HTTP 持久化。 */
export function isHttpPersistenceEnabled(): boolean {
  return typeof import.meta.env.VITE_API_BASE_URL === 'string'
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${apiBase()}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })
  if (res.status === 204) return undefined as T
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`insight-api ${res.status}: ${text || res.statusText}`)
  }
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

export class HttpAnalysisRepository implements AnalysisRepository {
  async list(): Promise<Analysis[]> {
    const list = await request<Analysis[]>('/api/analyses')
    return list
      .map((a) => migrateAnalysisToSteps(normalizeAnalysis(a)))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }

  async get(id: string): Promise<Analysis | undefined> {
    try {
      const raw = await request<Analysis>(`/api/analyses/${encodeURIComponent(id)}`)
      return migrateAnalysisToSteps(normalizeAnalysis(raw))
    } catch (e) {
      if (e instanceof Error && e.message.includes('404')) return undefined
      throw e
    }
  }

  async put(analysis: Analysis): Promise<void> {
    const plain = JSON.parse(JSON.stringify(normalizeAnalysis(analysis))) as Analysis
    // 不上传任何 File/Blob；仅数据内容
    plain.files = Array.isArray(plain.files) ? plain.files : []
    await request(`/api/analyses/${encodeURIComponent(plain.id)}`, {
      method: 'PUT',
      body: JSON.stringify(plain),
    })
  }

  async delete(id: string): Promise<void> {
    await request(`/api/analyses/${encodeURIComponent(id)}`, { method: 'DELETE' })
  }

  async transact<T>(fn: () => Promise<T> | T): Promise<T> {
    // HTTP 无跨请求事务；调用方应保证单次 put 原子性（由服务端事务保障）
    return await fn()
  }
}
