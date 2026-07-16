import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import type {
  Analysis,
  AnalysisTable,
  ChartConfig,
  ChartPosition,
  FilterCondition,
  TransformStep,
  ViewNode,
  ViewType,
} from '@/shared/types/analysis'
import { analysisRepository } from '@/shared/db/repository'
import { nowIso, uid } from '@/shared/utils/id'
import { isIdentityOrSortOnly, runPipeline } from '@/modules/transform/pipeline'
import { findView, flattenViews, walkViews } from '@/modules/analysis/viewTree'

function defaultChartConfig(): ChartConfig {
  return {
    configure: { aggregation: 'mean', errorBars: 'none', fitModel: 'none', colorPalette: 'light' },
    style: {
      legendShow: true,
      legendPosition: 'right',
      opacity: 0.85,
      height: 360,
    },
    flags: { pointIds: [], comments: {} },
    chartPosition: 'bottom',
  }
}

export const useAnalysisStore = defineStore('analysis', () => {
  const list = ref<Analysis[]>([])
  const current = ref<Analysis | null>(null)
  const selectedNodeId = ref<string | null>(null)
  const mainMode = ref<'flowchart' | 'workspace'>('flowchart')
  const saving = ref(false)
  let saveTimer: ReturnType<typeof setTimeout> | null = null

  const selectedTable = computed(() => {
    if (!current.value || !selectedNodeId.value) return null
    return current.value.tables.find((t) => t.id === selectedNodeId.value) || null
  })

  const selectedView = computed(() => {
    if (!current.value || !selectedNodeId.value) return null
    for (const t of current.value.tables) {
      const v = findView(t.views, selectedNodeId.value)
      if (v) return { table: t, view: v }
    }
    return null
  })

  const workspaceResult = computed(() => {
    if (!current.value) return null
    if (selectedTable.value) {
      const t = selectedTable.value
      return runPipeline({
        columns: t.columns,
        rows: t.rows,
        tableFilters: t.tableFilters,
        viewFilters: [],
        transforms: [],
      })
    }
    if (selectedView.value) {
      const { table, view } = selectedView.value
      // Parent chain: if view has parent view, use parent output as input
      const parentResult = resolveParentResult(table, view)
      return runPipeline({
        columns: parentResult.columns,
        rows: parentResult.rows,
        tableFilters: table.tableFilters,
        viewFilters: view.viewFilters,
        transforms: view.transforms,
      })
    }
    return null
  })

  function resolveParentResult(table: AnalysisTable, view: ViewNode): { columns: typeof table.columns; rows: typeof table.rows } {
    if (!view.parentId || view.parentId === table.id) {
      return { columns: table.columns, rows: table.rows }
    }
    const parent = findView(table.views, view.parentId)
    if (!parent) return { columns: table.columns, rows: table.rows }
    const grand: { columns: typeof table.columns; rows: typeof table.rows } = resolveParentResult(table, parent)
    return runPipeline({
      columns: grand.columns,
      rows: grand.rows,
      tableFilters: table.tableFilters,
      viewFilters: parent.viewFilters,
      transforms: parent.transforms,
    })
  }

  const canEditGrid = computed(() => {
    if (selectedTable.value) return true
    if (selectedView.value) {
      const { view } = selectedView.value
      return view.viewType === 'table' && isIdentityOrSortOnly(view.transforms, view.viewFilters)
    }
    return false
  })

  async function loadList() {
    list.value = await analysisRepository.list()
  }

  async function openAnalysis(id: string, opts?: { selectNodeId?: string | null }) {
    const a = await analysisRepository.get(id)
    current.value = a ?? null
    const preferred = opts?.selectNodeId
    if (preferred && a) {
      const tableHit = a.tables.some((t) => t.id === preferred)
      const viewHit = a.tables.some((t) => !!findView(t.views, preferred))
      selectedNodeId.value = tableHit || viewHit ? preferred : a.tables[0]?.id ?? null
    } else {
      // Prefer first non-table view if present (better demo UX), else first table
      const firstView = a?.tables.map((t) => t.views[0]).find(Boolean)
      selectedNodeId.value = firstView?.id ?? a?.tables[0]?.id ?? null
    }
    mainMode.value = 'workspace'
  }

  async function createAnalysis(name: string, projectId: string) {
    const a: Analysis = {
      id: uid('an'),
      name,
      projectId,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      tables: [],
      flowchartLayout: {},
    }
    await analysisRepository.save(a)
    await loadList()
    return a
  }

  async function removeAnalysis(id: string) {
    await analysisRepository.remove(id)
    if (current.value?.id === id) current.value = null
    await loadList()
  }

  async function flushSave() {
    if (!current.value) return
    if (saveTimer) {
      clearTimeout(saveTimer)
      saveTimer = null
    }
    current.value.updatedAt = nowIso()
    saving.value = true
    try {
      await analysisRepository.save(JSON.parse(JSON.stringify(current.value)))
    } finally {
      saving.value = false
    }
  }

  function scheduleSave() {
    if (!current.value) return
    current.value.updatedAt = nowIso()
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(() => {
      void flushSave()
    }, 400)
  }

  function selectNode(id: string | null, mode: 'flowchart' | 'workspace' = 'workspace') {
    selectedNodeId.value = id
    mainMode.value = mode
  }

  function addTable(table: AnalysisTable) {
    if (!current.value) return
    current.value.tables.push(table)
    // default layout position
    const idx = current.value.tables.length
    current.value.flowchartLayout[table.id] = { x: 80, y: 80 + idx * 80 }
    selectedNodeId.value = table.id
    mainMode.value = 'workspace'
    scheduleSave()
  }

  function updateTableRows(tableId: string, rows: Record<string, unknown>[]) {
    const t = current.value?.tables.find((x) => x.id === tableId)
    if (!t) return
    t.rows = rows
    scheduleSave()
  }

  function setTableFilters(tableId: string, filters: FilterCondition[]) {
    const t = current.value?.tables.find((x) => x.id === tableId)
    if (!t) return
    t.tableFilters = filters
    scheduleSave()
  }

  function addView(tableId: string, parentId: string | null, name: string, viewType: ViewType) {
    if (!current.value) return
    const table = current.value.tables.find((t) => t.id === tableId)
    if (!table) return
    const view: ViewNode = {
      id: uid('vw'),
      parentId: parentId ?? tableId,
      tableId,
      name,
      viewType,
      viewFilters: [],
      transforms: [],
      chartConfig: defaultChartConfig(),
      children: [],
    }
    if (!parentId || parentId === tableId) {
      table.views.push(view)
    } else {
      const parent = findView(table.views, parentId)
      if (parent) parent.children.push(view)
      else table.views.push(view)
    }
    const parentPos = current.value.flowchartLayout[parentId || tableId] || { x: 200, y: 100 }
    current.value.flowchartLayout[view.id] = { x: parentPos.x + 220, y: parentPos.y + 40 }
    selectedNodeId.value = view.id
    mainMode.value = 'workspace'
    scheduleSave()
    return view
  }

  function updateView(viewId: string, patch: Partial<ViewNode>) {
    if (!current.value) return
    for (const t of current.value.tables) {
      const v = findView(t.views, viewId)
      if (v) {
        Object.assign(v, patch)
        scheduleSave()
        return
      }
    }
  }

  function setViewFilters(viewId: string, filters: FilterCondition[]) {
    updateView(viewId, { viewFilters: filters })
  }

  function setTransforms(viewId: string, transforms: TransformStep[]) {
    updateView(viewId, { transforms })
  }

  function setChartConfig(viewId: string, chartConfig: ChartConfig) {
    updateView(viewId, { chartConfig })
  }

  function setChartPosition(viewId: string, chartPosition: ChartPosition) {
    if (!current.value) return
    for (const t of current.value.tables) {
      const v = findView(t.views, viewId)
      if (v) {
        v.chartConfig = { ...v.chartConfig, chartPosition }
        scheduleSave()
        return
      }
    }
  }

  function renameNode(id: string, name: string) {
    if (!current.value) return
    const t = current.value.tables.find((x) => x.id === id)
    if (t) {
      t.name = name
      scheduleSave()
      return
    }
    updateView(id, { name })
  }

  function deleteNode(id: string): { ok: boolean; reason?: string } {
    if (!current.value) return { ok: false, reason: 'no analysis' }
    // dependency: combine sources
    const dependents = current.value.tables.filter(
      (t) =>
        t.source.type === 'combine' &&
        (t.source.leftTableId === id || t.source.rightTableId === id),
    )
    if (dependents.length) {
      return { ok: false, reason: `被合并表依赖：${dependents.map((d) => d.name).join(', ')}` }
    }
    const ti = current.value.tables.findIndex((t) => t.id === id)
    if (ti >= 0) {
      // remove layouts for table + views
      const table = current.value.tables[ti]
      const ids = [table.id, ...flattenViews(table.views).map((v) => v.id)]
      for (const nid of ids) delete current.value.flowchartLayout[nid]
      current.value.tables.splice(ti, 1)
      if (selectedNodeId.value && ids.includes(selectedNodeId.value)) {
        selectedNodeId.value = current.value.tables[0]?.id ?? null
      }
      scheduleSave()
      return { ok: true }
    }
    for (const t of current.value.tables) {
      const removed = removeView(t.views, id)
      if (removed) {
        delete current.value.flowchartLayout[id]
        walkViews(removed, (v) => delete current.value!.flowchartLayout[v.id])
        if (selectedNodeId.value === id) selectedNodeId.value = t.id
        scheduleSave()
        return { ok: true }
      }
    }
    return { ok: false, reason: 'not found' }
  }

  function promoteViewToTable(viewId: string) {
    if (!current.value || !selectedView.value) return
    const { table, view } = selectedView.value
    if (view.id !== viewId) return
    const result = workspaceResult.value
    if (!result) return
    const newTable: AnalysisTable = {
      id: uid('tbl'),
      name: `${view.name} (table)`,
      source: { type: 'csv', fileName: 'promoted' },
      columns: result.columns,
      rows: result.rows.map((r) => ({ ...r })),
      tableFilters: [],
      views: [],
    }
    addTable(newTable)
  }

  function setFlowchartPosition(nodeId: string, x: number, y: number) {
    if (!current.value) return
    current.value.flowchartLayout[nodeId] = { x, y }
    scheduleSave()
  }

  watch(
    () => current.value?.id,
    () => {
      if (current.value) {
        localStorage.setItem('insight:lastAnalysisId', current.value.id)
      }
    },
  )

  return {
    list,
    current,
    selectedNodeId,
    mainMode,
    saving,
    selectedTable,
    selectedView,
    workspaceResult,
    canEditGrid,
    loadList,
    openAnalysis,
    createAnalysis,
    removeAnalysis,
    scheduleSave,
    selectNode,
    addTable,
    updateTableRows,
    setTableFilters,
    addView,
    updateView,
    setViewFilters,
    setTransforms,
    setChartConfig,
    setChartPosition,
    renameNode,
    deleteNode,
    promoteViewToTable,
    setFlowchartPosition,
    defaultChartConfig,
    flushSave,
  }
})

function removeView(views: ViewNode[], id: string): ViewNode | null {
  const i = views.findIndex((v) => v.id === id)
  if (i >= 0) {
    const [removed] = views.splice(i, 1)
    return removed
  }
  for (const v of views) {
    const r = removeView(v.children, id)
    if (r) return r
  }
  return null
}
