import { defineStore } from 'pinia'
import type { Analysis } from '../shared/types'
import { nowIso } from '../shared/datetime'
import { sealAnalysisRows } from '../shared/factories'
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

/**
 * load 世代号：快速切换分析时，先发起的 get 可能后返回。
 * 忽略过期结果，避免 URL 已是 B 但界面仍显示 A。
 */
let loadSeq = 0

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
  /** 侧栏选中的独立步骤节点（如分析报告），用于 flowchart 定位。 */
  selectedStepId: string | null
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
    selectedStepId: null,
    mode: 'flowchart',
    undoStack: [],
    redoStack: [],
  }),

  getters: {
    canUndo: (s) => s.undoStack.length > 0,
    canRedo: (s) => s.redoStack.length > 0,
  },

  actions: {
    /* ------------------------------ 加载 / 保存 ------------------------------ */

    /**
     * 进入加载态并立刻丢掉与目标 id 不符的旧内容，避免切换间隙仍展示上一个分析。
     * 不取消 in-flight get；由 loadSeq 丢弃过期结果。
     */
    beginLoad(id: string): void {
      loadSeq += 1
      this.loading = true
      this.selected = null
      this.selectedStepId = null
      this.mode = 'flowchart'
      if (this.current?.id !== id) {
        this.current = null
        this.dirty = false
        this.undoStack = []
        this.redoStack = []
      }
    },

    /** 离开分析路由时清空工作区，避免列表页仍挂着上一份 current/selected。 */
    clearWorkspace(): void {
      loadSeq += 1
      cancelScheduledSave()
      this.current = null
      this.selected = null
      this.selectedStepId = null
      this.loading = false
      this.dirty = false
      this.undoStack = []
      this.redoStack = []
      this.mode = 'flowchart'
    },

    async load(id: string, repo: AnalysisRepository = analysisRepository): Promise<boolean> {
      const seq = ++loadSeq
      this.loading = true
      this.selected = null
      this.selectedStepId = null
      // 切换到另一份分析时立刻清空，避免 KeepAlive/侧栏仍渲染旧表数据
      if (this.current?.id !== id) {
        this.current = null
        this.dirty = false
        this.undoStack = []
        this.redoStack = []
      }
      try {
        const found = await repo.get(id)
        if (seq !== loadSeq) return false
        this.current = found ? sealAnalysisRows(found) : null
        this.dirty = false
        this.selected = null
        this.undoStack = []
        this.redoStack = []
        return !!found
      } finally {
        if (seq === loadSeq) this.loading = false
      }
    },

    /** 立即落盘。失败时抛错并保持 dirty，便于调用方提示用户。 */
    async saveNow(repo: AnalysisRepository = analysisRepository): Promise<void> {
      if (!this.current) return
      const snapshot = this.current
      cancelScheduledSave()
      this.saving = true
      try {
        // 用开始时的快照落盘，避免 await 期间 current 已被切到另一份分析
        await repo.put(snapshot)
        if (this.current?.id === snapshot.id) this.dirty = false
      } catch (e) {
        const msg = e instanceof Error ? e.message : '未知错误'
        console.error('[analysisStore.saveNow]', e)
        throw new Error(`保存失败：${msg}`)
      } finally {
        this.saving = false
      }
    },

    _scheduleSave() {
      cancelScheduledSave()
      saveTimer = setTimeout(() => {
        saveTimer = undefined
        void this.saveNow().catch(() => {
          /* 防抖保存失败保留 dirty；下次 mutate / 离页再试 */
        })
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
      this.current.revision = (this.current.revision ?? 0) + 1
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
      if (node) this.selectedStepId = null
    },

    /** 选中独立步骤节点（如分析报告），并切到流程图模式。 */
    selectStep(stepId: string | null): void {
      this.selected = null
      this.selectedStepId = stepId
      if (stepId) this.mode = 'flowchart'
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
