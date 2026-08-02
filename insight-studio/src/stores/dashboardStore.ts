import { defineStore } from 'pinia'
import type { Dashboard } from '../shared/types'
import { nowIso } from '../shared/datetime'
import { createDashboard } from '../shared/factories'
import { dashboardRepository, type DashboardRepository } from '../shared/dashboardRepository'

const SAVE_DEBOUNCE_MS = 400
const LAST_ID_KEY = 'insight-studio:last-dashboard-id'

let saveTimer: ReturnType<typeof setTimeout> | undefined

function cancelScheduledSave(): void {
  if (saveTimer !== undefined) {
    clearTimeout(saveTimer)
    saveTimer = undefined
  }
}

interface DashboardState {
  items: Dashboard[]
  current: Dashboard | null
  currentId: string | null
  loading: boolean
  saving: boolean
  dirty: boolean
}

export const useDashboardStore = defineStore('dashboard', {
  state: (): DashboardState => ({
    items: [],
    current: null,
    currentId: null,
    loading: false,
    saving: false,
    dirty: false,
  }),

  getters: {
    sortedItems: (s): Dashboard[] =>
      s.items.slice().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
  },

  actions: {
    async loadList(repo: DashboardRepository = dashboardRepository): Promise<void> {
      this.loading = true
      try {
        this.items = await repo.list()
      } finally {
        this.loading = false
      }
    },

    async loadOne(id: string, repo: DashboardRepository = dashboardRepository): Promise<boolean> {
      this.loading = true
      try {
        await this.saveNow(repo)
        const found = await repo.get(id)
        this.current = found ?? null
        this.currentId = found ? found.id : null
        this.dirty = false
        if (found) {
          try {
            localStorage.setItem(LAST_ID_KEY, found.id)
          } catch {
            /* ignore */
          }
          const idx = this.items.findIndex((d) => d.id === found.id)
          if (idx >= 0) this.items[idx] = found
          else this.items.push(found)
        }
        return !!found
      } finally {
        this.loading = false
      }
    },

    clearCurrent(): void {
      this.current = null
      this.currentId = null
      this.dirty = false
    },

    lastId(): string | null {
      try {
        return localStorage.getItem(LAST_ID_KEY)
      } catch {
        return null
      }
    },

    async saveNow(repo: DashboardRepository = dashboardRepository): Promise<void> {
      if (!this.current || !this.dirty) {
        cancelScheduledSave()
        return
      }
      cancelScheduledSave()
      this.saving = true
      try {
        await repo.put(this.current)
        this.dirty = false
        const idx = this.items.findIndex((d) => d.id === this.current!.id)
        if (idx >= 0) this.items[idx] = JSON.parse(JSON.stringify(this.current)) as Dashboard
      } finally {
        this.saving = false
      }
    },

    _scheduleSave(): void {
      cancelScheduledSave()
      saveTimer = setTimeout(() => {
        saveTimer = undefined
        void this.saveNow()
      }, SAVE_DEBOUNCE_MS)
    },

    mutate(fn: (dashboard: Dashboard) => void): void {
      if (!this.current) return
      fn(this.current)
      this.current.updatedAt = nowIso()
      this.dirty = true
      this._scheduleSave()
    },

    async create(
      name: string,
      org?: { project?: string; department?: string },
      repo: DashboardRepository = dashboardRepository,
    ): Promise<Dashboard> {
      await this.saveNow(repo)
      const d = createDashboard(name, org)
      await repo.put(d)
      this.items.push(d)
      this.current = d
      this.currentId = d.id
      this.dirty = false
      try {
        localStorage.setItem(LAST_ID_KEY, d.id)
      } catch {
        /* ignore */
      }
      return d
    },

    async rename(name: string, repo: DashboardRepository = dashboardRepository): Promise<void> {
      const trimmed = name.trim()
      if (!trimmed || !this.current) return
      this.mutate((d) => {
        d.name = trimmed
      })
      await this.saveNow(repo)
    },

    async remove(id: string, repo: DashboardRepository = dashboardRepository): Promise<string | null> {
      await this.saveNow(repo)
      await repo.delete(id)
      this.items = this.items.filter((d) => d.id !== id)
      if (this.currentId === id) {
        this.current = null
        this.currentId = null
        this.dirty = false
        try {
          localStorage.removeItem(LAST_ID_KEY)
        } catch {
          /* ignore */
        }
      }
      const next = this.sortedItems[0]
      return next?.id ?? null
    },
  },
})
