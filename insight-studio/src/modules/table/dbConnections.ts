/**
 * 外部库连接档案：存在 localStorage（本机），不进 Analysis IndexedDB 文档。
 */
import type { DbConnectionProfile } from './dbConnectionTypes'

const KEY = 'insight-studio:db-connections:v1'

export function listDbConnections(): DbConnectionProfile[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as DbConnectionProfile[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveDbConnections(list: DbConnectionProfile[]): void {
  localStorage.setItem(KEY, JSON.stringify(list))
}

export function upsertDbConnection(profile: DbConnectionProfile): DbConnectionProfile[] {
  const list = listDbConnections()
  const i = list.findIndex((x) => x.id === profile.id)
  const next = { ...profile, updatedAt: new Date().toISOString() }
  if (i >= 0) list[i] = next
  else list.unshift(next)
  saveDbConnections(list)
  return list
}

export function removeDbConnection(id: string): DbConnectionProfile[] {
  const list = listDbConnections().filter((x) => x.id !== id)
  saveDbConnections(list)
  return list
}
