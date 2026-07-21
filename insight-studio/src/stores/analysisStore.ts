import { defineStore } from 'pinia'
import type { Analysis } from '../shared/types'
import { nowIso } from '../shared/datetime'
import { analysisRepository, type AnalysisRepository } from '../shared/repository'

/** 当前选中节点（侧栏树 / 工作区）。 */
export interface SelectedNode {
  kind: 'table' | 'view'
  tableId: string
  viewId?: string
}

export type WorkspaceMode = 'workspace' | 'flowchart'

/** Undo/Redo 栈条目（表格编辑等用；本切片先建机制）。 */
export interface HistoryEntry {
  label: string
  undo: () => void
  redo: () => void
}

const HISTORY_LIMIT = 50
const SAVE_DEBOUNCE_MS = 400

/** 防抖定时器（模块级；单 store 实例足够）。 */
let saveTimer: ReturnType<typeof setTimeout> | undefined

function cancelScheduledSave(): void {
  if (saveTimer !== undefined) {
    clearTimeout(saveTimer)
    saveTimer = undefined
  }
}

interface AnalysisState {
  current: Analysis | null
  loading: boolean
  saving: boolean
  dirty: boolean
  selected: SelectedNode | null
  mode: WorkspaceMode
  undoStack: HistoryEntry[]
  redoStack: HistoryEntry[]
}

export const useAnalysisStore = defineStore('analysis', {
  state: (): AnalysisState => ({
    current: null,
    loading: false,
    saving: false,
    dirty: false,
    selected: null,
    mode: 'workspace',
    undoStack: [],
    redoStack: [],
  }),

  getters: {
    canUndo: (s) => s.undoStack.length > 0,
    canRedo: (s) => s.redoStack.length > 0,
  },

  actions: {
    /* ------------------------------ 加载 / 保存 ------------------------------ */

    async load(id: string, repo: AnalysisRepository = analysisRepository): Promise<boolean> {
      this.loading = true
      try {
        const found = await repo.get(id)
        this.current = found ?? null
        this.dirty = false
        this.selected = null
        this.undoStack = []
        this.redoStack = []
        return !!found
      } finally {
        this.loading = false
      }
    },

    /** 立即落盘。 */
    async saveNow(repo: AnalysisRepository = analysisRepository): Promise<void> {
      if (!this.current) return
      cancelScheduledSave()
      this.saving = true
      try {
        await repo.put(this.current)
        this.dirty = false
      } finally {
        this.saving = false
      }
    },

    _scheduleSave() {
      cancelScheduledSave()
      saveTimer = setTimeout(() => {
        saveTimer = undefined
        void this.saveNow()
      }, SAVE_DEBOUNCE_MS)
    },

    /**
     * 对当前 Analysis 应用变更：刷新 updatedAt、标脏并防抖持久化。
     * 所有结构性修改（表/视图/配置）统一走这里。
     */
    mutate(fn: (analysis: Analysis) => void): void {
      if (!this.current) return
      fn(this.current)
      this.current.updatedAt = nowIso()
      this.dirty = true
      this._scheduleSave()
    },

    rename(name: string): void {
      this.mutate((a) => {
        a.name = name
      })
    },

    /* ------------------------------ 选中 / 模式 ------------------------------ */

    select(node: SelectedNode | null): void {
      this.selected = node
      if (node) this.mode = 'workspace'
    },

    /** 仅更新选中态，不切换模式（流程图内选中同步用）。 */
    setSelected(node: SelectedNode | null): void {
      this.selected = node
    },

    setMode(mode: WorkspaceMode): void {
      this.mode = mode
    },

    /* ------------------------------ Undo / Redo ------------------------------ */

    /** 提交一条可撤销操作（表格编辑用）。 */
    commit(entry: HistoryEntry): void {
      this.undoStack.push(entry)
      if (this.undoStack.length > HISTORY_LIMIT) this.undoStack.shift()
      this.redoStack = []
      this.mutate(() => {})
    },

    undo(): void {
      const entry = this.undoStack.pop()
      if (!entry) return
      entry.undo()
      this.redoStack.push(entry)
      this.mutate(() => {})
    },

    redo(): void {
      const entry = this.redoStack.pop()
      if (!entry) return
      entry.redo()
      this.undoStack.push(entry)
      this.mutate(() => {})
    },

    clearHistory(): void {
      this.undoStack = []
      this.redoStack = []
    },
  },
})
