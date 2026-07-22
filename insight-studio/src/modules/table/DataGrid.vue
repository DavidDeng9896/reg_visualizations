<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { VxeColumn, VxeTable } from 'vxe-table'
import 'vxe-table/es/style.css'
import type { Analysis, AnalysisTable, CellValue, ColumnMeta, Filter, Row, Transform, TransformType } from '../../shared/types'
import { ROW_ID_FIELD } from '../../shared/types'
import { uuid } from '../../shared/id'
import { compareValues, isIdentityOrSortOnly, rowIdOf, type ViewResult } from '../../shared/pipeline'
import { findTable, findView, findViewPath } from '../../shared/tree'
import { createTransform, createViewNode, defaultViewName } from '../../shared/factories'
import { useAnalysisStore } from '../../stores/analysisStore'
import { IButton, IEmptyState, IIcon, IModal, IPopover, ISelect, ITextField, ITooltip, IBadge, toast, type SelectOption } from '../../ui'
import { useFloatingPanel } from '../../ui/floating'
import { useClickOutside, useEscape } from '../../ui/utils'
import { downloadCsv, toCsv } from './csv'
import {
  buildPasteRect,
  findRowIndexById,
  makeAddDerivedColumnCommand,
  makeDeleteColumnCommand,
  makeDeleteRowCommand,
  makeEditCellCommand,
  makeInsertRowCommand,
  makePasteCommand,
  makeRenameColumnCommand,
  parseCellInput,
  parseTsv,
  type PasteEdit,
} from './editing'
import { conditionValid, filterSummary, operatorArity, operatorsFor, parseConditionValue } from './filterForm'
import { TRANSFORM_TYPE_LABELS, transformSummary } from './transformForm'
import { promoteViewToTable } from './promote'
import FilterDialog from './FilterDialog.vue'
import TransformDialog from './TransformDialog.vue'

/**
 * DataGrid：vxe-table 封装。
 * - 表（selected.kind==='table'）：直接编辑源表（direct）
 * - 恒等/仅排序视图：按 __rowId 写回源表（writeback）
 * - 其余视图：只读 + 提升为表 banner
 */
const props = defineProps<{
  tableId: string
  viewId?: string
  result: ViewResult
}>()

const store = useAnalysisStore()
const { current, canUndo, canRedo } = storeToRefs(store)

const table = computed<AnalysisTable | undefined>(() =>
  current.value ? findTable(current.value, props.tableId) : undefined,
)
const viewPath = computed(() => {
  const t = table.value
  if (!t || !props.viewId) return null
  return findViewPath(t.views, props.viewId)
})
const view = computed(() => (viewPath.value ? viewPath.value[viewPath.value.length - 1] : null))
const ancestors = computed(() => (viewPath.value ? viewPath.value.slice(0, -1) : []))

const editMode = computed<'direct' | 'writeback' | 'none'>(() => {
  if (!view.value) return 'direct'
  return isIdentityOrSortOnly(view.value, ancestors.value) ? 'writeback' : 'none'
})
const editable = computed(() => editMode.value !== 'none')

const title = computed(() => view.value?.name ?? table.value?.name ?? '')
const kindLabel = computed(() => (view.value ? `视图 · ${view.value.type}` : '源表'))

/* ------------------------------ 列显隐（localStorage 持久化） ------------------------------ */

const nodeKey = computed(() => `${current.value?.id ?? ''}:${props.tableId}:${props.viewId ?? ''}`)
const hiddenCols = ref<Set<string>>(new Set())

function loadHidden() {
  hiddenCols.value = new Set()
  try {
    const raw = localStorage.getItem(`is-grid-cols:${nodeKey.value}`)
    if (raw) hiddenCols.value = new Set(JSON.parse(raw) as string[])
  } catch {
    /* 忽略 */
  }
}
watch(nodeKey, loadHidden, { immediate: true })

function persistHidden() {
  try {
    localStorage.setItem(`is-grid-cols:${nodeKey.value}`, JSON.stringify([...hiddenCols.value]))
  } catch {
    /* 忽略 */
  }
}

const visibleColumns = computed<ColumnMeta[]>(() => props.result.columns.filter((c) => !hiddenCols.value.has(c.field)))
const colIndexMap = computed(() => new Map(visibleColumns.value.map((c, i) => [c.field, i])))

function toggleColumn(field: string) {
  const next = new Set(hiddenCols.value)
  if (next.has(field)) next.delete(field)
  else next.add(field)
  hiddenCols.value = next
  persistHidden()
}

/* ------------------------------ 排序 ------------------------------ */

const localSort = ref<{ field: string; direction: 'asc' | 'desc' } | null>(null)
watch(nodeKey, () => {
  localSort.value = null
})

const sortTransform = computed(() => view.value?.transforms.find((t): t is Extract<Transform, { type: 'sort' }> => t.type === 'sort') ?? null)
const sortInfo = computed(() => {
  if (view.value) {
    const k = sortTransform.value?.keys[0]
    return k ? { field: k.column, direction: k.direction } : null
  }
  return localSort.value
})

function setSort(field: string, direction: 'asc' | 'desc' | null) {
  if (view.value) {
    store.mutate((a) => {
      const t = findTable(a, props.tableId)
      const v = t && props.viewId ? findView(t.views, props.viewId) : null
      if (!v) return
      const i = v.transforms.findIndex((tr) => tr.type === 'sort')
      if (direction === null) {
        if (i >= 0) v.transforms.splice(i, 1)
        return
      }
      if (i >= 0) {
        const tr = v.transforms[i]
        if (tr.type === 'sort') tr.keys = [{ column: field, direction }]
      } else {
        v.transforms.push(createTransform('sort', { keys: [{ column: field, direction }] }))
      }
    })
  } else {
    localSort.value = direction ? { field, direction } : null
  }
}

const displayedRows = computed<Row[]>(() => {
  const rows = props.result.rows
  if (!view.value && localSort.value) {
    const { field, direction } = localSort.value
    const dt = props.result.columns.find((c) => c.field === field)?.dataType
    return rows.slice().sort((a, b) => {
      const cmp = compareValues(a[field] ?? null, b[field] ?? null, dt)
      return direction === 'asc' ? cmp : -cmp
    })
  }
  return rows
})

const rowIndexMap = computed(() => {
  const m = new WeakMap<Row, number>()
  displayedRows.value.forEach((r, i) => m.set(r, i))
  return m
})

/* ------------------------------ 行数统计 ------------------------------ */

const statsText = computed(() => {
  const r = props.result
  if (r.totalRows === r.sourceRows) return `${r.totalRows} 行`
  return `${r.totalRows} / ${r.sourceRows} 行（已过滤）`
})

/* ------------------------------ 过滤 / 转换 chips ------------------------------ */

const scopeLabel = computed(() =>
  view.value ? `视图级过滤，仅作用于「${view.value.name}」` : '表级过滤，作用于所有视图',
)
const targetFilters = computed<Filter[]>(() => (view.value ? view.value.filters : (table.value?.filters ?? [])))
const inheritedFilters = computed<Filter[]>(() => (view.value ? (table.value?.filters ?? []) : []))
const targetTransforms = computed<Transform[]>(() => view.value?.transforms ?? [])

function filtersOf(a: Analysis): Filter[] | null {
  const t = findTable(a, props.tableId)
  if (!t) return null
  if (!props.viewId) return t.filters
  const v = findView(t.views, props.viewId)
  return v ? v.filters : null
}

function transformsOf(a: Analysis): Transform[] | null {
  const t = findTable(a, props.tableId)
  const v = t && props.viewId ? findView(t.views, props.viewId) : null
  return v ? v.transforms : null
}

function upsertFilterCommit(filter: Filter, label: string) {
  const idx = targetFilters.value.findIndex((f) => f.id === filter.id)
  const old = idx >= 0 ? (JSON.parse(JSON.stringify(targetFilters.value[idx])) as Filter) : null
  const apply = (f: Filter | null, restore: Filter | null) =>
    store.mutate((a) => {
      const arr = filtersOf(a)
      if (!arr) return
      const i = arr.findIndex((x) => x.id === filter.id)
      if (f) {
        if (i >= 0) arr.splice(i, 1, f)
        else arr.push(f)
      } else if (i >= 0) {
        arr.splice(i, 1)
        if (restore) arr.splice(i, 0, restore)
      }
    })
  apply(filter, null)
  store.commit({
    label,
    undo: () => apply(null, old),
    redo: () => apply(filter, null),
  })
}

function removeFilterCommit(id: string) {
  const idx = targetFilters.value.findIndex((f) => f.id === id)
  if (idx < 0) return
  const old = JSON.parse(JSON.stringify(targetFilters.value[idx])) as Filter
  const remove = () =>
    store.mutate((a) => {
      const arr = filtersOf(a)
      const i = arr?.findIndex((f) => f.id === id)
      if (arr && i !== undefined && i >= 0) arr.splice(i, 1)
    })
  remove()
  store.commit({
    label: '删除过滤',
    undo: () =>
      store.mutate((a) => {
        const arr = filtersOf(a)
        if (arr && !arr.some((f) => f.id === id)) arr.splice(Math.min(idx, arr.length), 0, old)
      }),
    redo: remove,
  })
}

function upsertTransformCommit(t: Transform, label: string) {
  const idx = targetTransforms.value.findIndex((x) => x.id === t.id)
  const old = idx >= 0 ? (JSON.parse(JSON.stringify(targetTransforms.value[idx])) as Transform) : null
  const apply = (tr: Transform | null, restore: Transform | null) =>
    store.mutate((a) => {
      const arr = transformsOf(a)
      if (!arr) return
      const i = arr.findIndex((x) => x.id === t.id)
      if (tr) {
        if (i >= 0) arr.splice(i, 1, tr)
        else arr.push(tr)
      } else if (i >= 0) {
        arr.splice(i, 1)
        if (restore) arr.splice(i, 0, restore)
      }
    })
  apply(t, null)
  store.commit({
    label,
    undo: () => apply(null, old),
    redo: () => apply(t, null),
  })
}

function removeTransformCommit(id: string) {
  const idx = targetTransforms.value.findIndex((x) => x.id === id)
  if (idx < 0) return
  const old = JSON.parse(JSON.stringify(targetTransforms.value[idx])) as Transform
  const remove = () =>
    store.mutate((a) => {
      const arr = transformsOf(a)
      const i = arr?.findIndex((x) => x.id === id)
      if (arr && i !== undefined && i >= 0) arr.splice(i, 1)
    })
  remove()
  store.commit({
    label: '删除转换',
    undo: () =>
      store.mutate((a) => {
        const arr = transformsOf(a)
        if (arr && !arr.some((x) => x.id === id)) arr.splice(Math.min(idx, arr.length), 0, old)
      }),
    redo: remove,
  })
}

/* ------------------------------ 弹窗状态 ------------------------------ */

const filterDialog = reactive<{ open: boolean; initial: Filter | null }>({ open: false, initial: null })
const transformDialog = reactive<{ open: boolean; initial: Transform | null; prefillType?: TransformType }>({
  open: false,
  initial: null,
})

function openFilterDialog(initial: Filter | null) {
  filterDialog.initial = initial
  filterDialog.open = true
}
function onFilterApply(filter: Filter) {
  upsertFilterCommit(filter, filterDialog.initial ? '编辑过滤' : '新建过滤')
}

function openTransformDialog(initial: Transform | null, prefillType?: TransformType) {
  transformDialog.initial = initial
  transformDialog.prefillType = prefillType
  transformDialog.open = true
}
function onTransformApply(t: Transform) {
  // 源表（或写回视图）下的派生列直接物化进源表，保持可编辑
  if (t.type === 'derived' && !view.value && table.value) {
    try {
      const entry = makeAddDerivedColumnCommand(table.value, t.name, t.expression)
      if (entry) {
        store.commit(entry)
        toast.success(`已添加派生列「${t.name}」`)
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '派生列创建失败')
    }
    return
  }
  upsertTransformCommit(t, transformDialog.initial ? '编辑转换' : '新建转换')
}

const transformPickerOpen = ref(false)
const TRANSFORM_TYPES = Object.keys(TRANSFORM_TYPE_LABELS) as TransformType[]

/* ------------------------------ 列筛选漏斗（单一弹层，避免 vxe 表头克隆导致双层遮挡） ------------------------------ */

const colFilterFor = ref<string | null>(null)
const cfOp = ref('')
const cfValue = ref('')
const cfValue2 = ref('')
const filterAnchorEl = ref<HTMLElement>()
const filterPanelEl = ref<HTMLElement>()
const filterOpen = computed(() => !!colFilterFor.value)
const { style: filterPanelStyle } = useFloatingPanel(filterOpen, filterAnchorEl, filterPanelEl, () => 'bottom-start', {
  zIndex: 'var(--is-z-popover)',
  minWidth: 220,
})

function columnFilterOf(field: string): Filter | undefined {
  return targetFilters.value.find((f) => f.conditions.length === 1 && f.conditions[0].column === field)
}

function openColumnFilter(field: string, ev?: Event) {
  const existing = columnFilterOf(field)
  const col = props.result.columns.find((c) => c.field === field)
  const ops = col ? operatorsFor(col.dataType) : []
  cfOp.value = existing?.conditions[0].operator ?? ops[0]?.value ?? 'eq'
  const c = existing?.conditions[0]
  cfValue.value = c?.value === undefined ? '' : Array.isArray(c.value) ? c.value.map(String).join(', ') : String(c.value ?? '')
  cfValue2.value = c?.value2 === undefined ? '' : String(c.value2 ?? '')
  const btn = (ev?.currentTarget as HTMLElement | undefined) || undefined
  if (btn) filterAnchorEl.value = btn
  colFilterFor.value = field
  colMenuFor.value = null
}

function closeColumnFilter() {
  colFilterFor.value = null
}

useClickOutside([filterAnchorEl, filterPanelEl], (e) => {
  if (!colFilterFor.value) return
  const t = e.target as HTMLElement | null
  if (t?.closest?.('[data-is-floating="1"]') && filterPanelEl.value?.querySelector('.is-select--open')) return
  closeColumnFilter()
})
useEscape(closeColumnFilter, () => !!colFilterFor.value)

const cfOperatorOptions = computed<SelectOption[]>(() => {
  const col = props.result.columns.find((c) => c.field === colFilterFor.value)
  return col ? operatorsFor(col.dataType).map((o) => ({ value: o.value, label: o.label })) : []
})
const cfArity = computed(() => operatorArity((cfOp.value || 'eq') as never))

function applyColumnFilter() {
  const field = colFilterFor.value
  const col = props.result.columns.find((c) => c.field === field)
  if (!field || !col) return
  const existing = columnFilterOf(field)
  const cond = {
    id: existing?.conditions[0].id ?? uuid(),
    column: field,
    operator: cfOp.value as never,
    value: undefined as CellValue | CellValue[] | undefined,
    value2: undefined as CellValue | undefined,
  }
  const arity = cfArity.value
  if (arity === 'one') cond.value = parseConditionValue(cond.operator, cfValue.value, col.dataType)
  if (arity === 'two') {
    cond.value = parseConditionValue('eq', cfValue.value, col.dataType)
    cond.value2 = parseConditionValue('eq', cfValue2.value, col.dataType) as CellValue | undefined
  }
  if (arity === 'list') cond.value = parseConditionValue('in', cfValue.value, col.dataType)
  const err = conditionValid(cond as never)
  if (err) {
    toast.error(err)
    return
  }
  upsertFilterCommit(
    { id: existing?.id ?? uuid(), combinator: 'and', conditions: [cond as never] },
    `筛选 ${col.title}`,
  )
  closeColumnFilter()
}

function clearColumnFilter() {
  const field = colFilterFor.value
  if (!field) return
  const existing = columnFilterOf(field)
  if (existing) removeFilterCommit(existing.id)
  closeColumnFilter()
}

/* ------------------------------ 列菜单（单一弹层） ------------------------------ */

const colMenuFor = ref<string | null>(null)
const menuAnchorEl = ref<HTMLElement>()
const menuPanelEl = ref<HTMLElement>()
const menuOpen = computed(() => !!colMenuFor.value)
const { style: menuPanelStyle } = useFloatingPanel(menuOpen, menuAnchorEl, menuPanelEl, () => 'bottom-end', {
  zIndex: 'var(--is-z-popover)',
  minWidth: 180,
})

function openColumnMenu(field: string, ev?: Event) {
  const btn = (ev?.currentTarget as HTMLElement | undefined) || undefined
  if (colMenuFor.value === field) {
    colMenuFor.value = null
    return
  }
  menuAnchorEl.value = btn
  colMenuFor.value = field
  colFilterFor.value = null
}
function closeColumnMenu() {
  colMenuFor.value = null
}
function openColumnFilterFromMenu() {
  const f = colMenuFor.value
  const anchor = menuAnchorEl.value
  closeColumnMenu()
  if (!f) return
  filterAnchorEl.value = anchor
  openColumnFilter(f)
}
/** 先记下字段再关菜单，避免 close 后 colMenuFor 已清空 */
function runColumnMenu(action: (field: string) => void) {
  const f = colMenuFor.value
  closeColumnMenu()
  if (f) action(f)
}
useClickOutside([menuAnchorEl, menuPanelEl], () => {
  if (colMenuFor.value) closeColumnMenu()
})
useEscape(closeColumnMenu, () => !!colMenuFor.value)

const renameCol = reactive<{ open: boolean; field: string; title: string }>({ open: false, field: '', title: '' })
const deleteColField = ref<string | null>(null)
const colVisibilityOpen = ref(false)
const colVisSearch = ref('')

const colVisList = computed(() => {
  const q = colVisSearch.value.trim().toLowerCase()
  return props.result.columns.filter((c) => !q || c.title.toLowerCase().includes(q))
})

function openRenameColumn(field: string) {
  const col = props.result.columns.find((c) => c.field === field)
  renameCol.field = field
  renameCol.title = col?.title ?? field
  renameCol.open = true
  closeColumnMenu()
}

function submitRenameColumn() {
  const name = renameCol.title.trim()
  if (!name || !table.value) return
  const entry = makeRenameColumnCommand(table.value, renameCol.field, name)
  if (entry) store.commit(entry)
  renameCol.open = false
}

function confirmDeleteColumn() {
  const field = deleteColField.value
  if (!field || !table.value) return
  const entry = makeDeleteColumnCommand(table.value, field)
  if (entry) {
    store.commit(entry)
    toast.success('已删除列')
  }
  deleteColField.value = null
}

/* ------------------------------ 行操作 / 上下文菜单 ------------------------------ */

interface CtxItem {
  label: string
  icon?: string
  danger?: boolean
  action: () => void
}
const ctxMenu = ref<{ x: number; y: number; items: CtxItem[] } | null>(null)

function openCtxMenu(x: number, y: number, items: CtxItem[]) {
  ctxMenu.value = { x, y, items }
}
function closeCtxMenu() {
  ctxMenu.value = null
}
function onDocClick() {
  closeCtxMenu()
}
document.addEventListener('mousedown', onDocClick, true)
onBeforeUnmount(() => document.removeEventListener('mousedown', onDocClick, true))

function rowMenuItems(rowId: string): CtxItem[] {
  const t = table.value
  if (!t) return []
  const idx = findRowIndexById(t, rowId)
  return [
    {
      label: '在上方插入行',
      icon: 'plus',
      action: () => {
        const entry = makeInsertRowCommand(t, Math.max(0, idx))
        store.commit(entry)
      },
    },
    {
      label: '在下方插入行',
      icon: 'plus',
      action: () => {
        const entry = makeInsertRowCommand(t, idx < 0 ? t.rows.length : idx + 1)
        store.commit(entry)
      },
    },
    {
      label: '删除行',
      icon: 'trash',
      danger: true,
      action: () => {
        const entry = makeDeleteRowCommand(t, rowId)
        if (entry) store.commit(entry)
        else toast.error('未找到该行（可能已被过滤）')
      },
    },
  ]
}

function onCellContextMenu(params: { row?: Row; $event: MouseEvent }) {
  if (!editable.value || !params.row) return
  const rowId = rowIdOf(params.row)
  if (!rowId) return
  params.$event.preventDefault()
  openCtxMenu(params.$event.clientX, params.$event.clientY, rowMenuItems(rowId))
}

function addRow() {
  const t = table.value
  if (!t) return
  store.commit(makeInsertRowCommand(t, t.rows.length))
}

/* ------------------------------ 单元格编辑 ------------------------------ */

const gridRef = ref()
const editDraft = ref('')
const editCancelled = ref(false)
const editActive = ref(false)

const editConfig = computed(() =>
  editable.value ? { trigger: 'dblclick' as const, mode: 'cell' as const, autoClear: true } : undefined,
)
const keyboardConfig = { isArrow: true, isEnter: true, isTab: true, isEdit: true, isEsc: true }
const mouseConfig = { selected: true }

function formatForEdit(v: CellValue | undefined): string {
  return v === null || v === undefined ? '' : String(v)
}

function onEditActived(params: { row: Row; column: { field: string } }) {
  editActive.value = true
  editCancelled.value = false
  editDraft.value = formatForEdit(params.row[params.column.field])
}

function onEditInputKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    editCancelled.value = true
    e.stopPropagation()
    gridRef.value?.clearEdit?.()
  }
}

function onEditInputBlur() {
  // 点击表格外关闭编辑（autoClear 未覆盖时兜底）
  setTimeout(() => gridRef.value?.clearEdit?.(), 0)
}

function onEditClosed(params: { row: Row; column: { field: string } }) {
  editActive.value = false
  if (editCancelled.value) return
  commitCell(params.row, params.column.field)
}

function commitCell(row: Row, field: string) {
  const t = table.value
  const col = props.result.columns.find((c) => c.field === field)
  if (!t || !col) return
  const rowId = rowIdOf(row)
  const oldValue = row[field] ?? null
  const parsed = parseCellInput(editDraft.value, col.dataType)
  if (!parsed.ok) {
    toast.error(parsed.error, { title: '无法写入' })
    return
  }
  if (parsed.value === oldValue || String(parsed.value ?? '') === String(oldValue ?? '')) return
  if (!rowId) {
    toast.error('该行缺少稳定行 ID，无法写回')
    return
  }
  const entry = makeEditCellCommand(t, rowId, field, parsed.value)
  if (entry) store.commit(entry)
  else toast.error('未找到源行（可能已被过滤或删除）')
}

/* ------------------------------ 选区 / 复制粘贴 ------------------------------ */

const anchor = ref<{ r: number; c: number } | null>(null)
const range = ref<{ r1: number; c1: number; r2: number; c2: number } | null>(null)

function onCellClick(params: { row: Row; column: { field: string }; $event: MouseEvent }) {
  const r = rowIndexMap.value.get(params.row)
  const c = colIndexMap.value.get(params.column.field)
  if (r === undefined || c === undefined) return
  if (params.$event.shiftKey && anchor.value) {
    range.value = {
      r1: Math.min(anchor.value.r, r),
      c1: Math.min(anchor.value.c, c),
      r2: Math.max(anchor.value.r, r),
      c2: Math.max(anchor.value.c, c),
    }
  } else {
    anchor.value = { r, c }
    range.value = null
  }
}

function cellClassName(params: { row: Row; column: { field: string } }): string {
  const sel = range.value
  if (!sel) return ''
  const r = rowIndexMap.value.get(params.row)
  const c = colIndexMap.value.get(params.column.field)
  if (r === undefined || c === undefined) return ''
  return r >= sel.r1 && r <= sel.r2 && c >= sel.c1 && c <= sel.c2 ? 'dg-cell--range' : ''
}

function fmtCell(row: Row, col: ColumnMeta): string {
  const v = row[col.field]
  if (v === null || v === undefined) return ''
  if (col.dataType === 'number' && typeof v === 'number') return numFmt.format(v)
  if (col.dataType === 'boolean') return v ? 'true' : 'false'
  return String(v)
}
const numFmt = new Intl.NumberFormat('en-US', { maximumFractionDigits: 6 })

function onCopy(e: ClipboardEvent) {
  if (editActive.value) return
  const target = e.target as HTMLElement
  if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return
  const sel = range.value
  const anc = anchor.value
  if (!anc) return
  const r1 = sel?.r1 ?? anc.r
  const r2 = sel?.r2 ?? anc.r
  const c1 = sel?.c1 ?? anc.c
  const c2 = sel?.c2 ?? anc.c
  const lines: string[] = []
  for (let r = r1; r <= r2; r += 1) {
    const row = displayedRows.value[r]
    if (!row) continue
    const cells: string[] = []
    for (let c = c1; c <= c2; c += 1) {
      const col = visibleColumns.value[c]
      cells.push(col ? formatForEdit(row[col.field]) : '')
    }
    lines.push(cells.join('\t'))
  }
  if (!lines.length) return
  e.clipboardData?.setData('text/plain', lines.join('\n'))
  e.preventDefault()
}

const showSelection = ref(false)

function onPaste(e: ClipboardEvent) {
  if (!editable.value || editActive.value) return
  const target = e.target as HTMLElement
  if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return
  const text = e.clipboardData?.getData('text/plain')
  const anc = anchor.value
  const t = table.value
  if (!text || !anc || !t) return
  e.preventDefault()
  const matrix = parseTsv(text)
  const rect = buildPasteRect(anc.r, anc.c, matrix, displayedRows.value.length, visibleColumns.value.length)
  const edits: PasteEdit[] = []
  let invalid = 0
  for (const cell of rect.cells) {
    const col = visibleColumns.value[cell.col]
    const row = displayedRows.value[cell.row]
    if (!col || !row) continue
    const rowId = rowIdOf(row)
    if (!rowId) {
      invalid += 1
      continue
    }
    const parsed = parseCellInput(cell.raw, col.dataType)
    if (!parsed.ok) {
      invalid += 1
      continue
    }
    edits.push({ rowId, field: col.field, value: parsed.value })
  }
  if (edits.length) {
    const entry = makePasteCommand(t, edits)
    if (entry) store.commit(entry)
  }
  const notes: string[] = []
  if (invalid) notes.push(`跳过 ${invalid} 个非法值`)
  if (rect.clipped) notes.push(`越界忽略 ${rect.clipped} 格`)
  if (edits.length) toast.success(`已粘贴 ${edits.length} 个单元格${notes.length ? `（${notes.join('，')}）` : ''}`)
  else toast.warning(notes.length ? notes.join('，') : '没有可粘贴的内容')
}

/* ------------------------------ 键盘：全局撤销/重做 ------------------------------ */

function onWrapperKeydown(e: KeyboardEvent) {
  const mod = e.ctrlKey || e.metaKey
  if (!mod) return
  const target = e.target as HTMLElement
  if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return
  if (e.key.toLowerCase() === 'z') {
    e.preventDefault()
    if (e.shiftKey) store.redo()
    else store.undo()
  } else if (e.key.toLowerCase() === 'y') {
    e.preventDefault()
    store.redo()
  }
}

/* ------------------------------ 导出 / 图表占位 / 提升 ------------------------------ */

function exportCsv() {
  downloadCsv(`${title.value}.csv`, toCsv(props.result.columns, props.result.rows))
  toast.success('已导出 CSV')
}

function createChart() {
  let newViewId = ''
  store.mutate((a) => {
    const t = findTable(a, props.tableId)
    if (!t) return
    const view = createViewNode('bar', defaultViewName('bar', t.views))
    newViewId = view.id
    t.views.push(view)
  })
  if (newViewId) {
    store.select({ kind: 'view', tableId: props.tableId, viewId: newViewId })
    toast.success('已创建 Bar chart 视图，请在右侧配置映射')
  }
}

function promote() {
  if (props.viewId) promoteViewToTable(store, props.tableId, props.viewId)
}
</script>

<template>
  <div class="dg" @keydown="onWrapperKeydown" @copy="onCopy" @paste="onPaste">
    <!-- 工具栏 -->
    <header class="dg__toolbar">
      <div class="dg__title-group">
        <IIcon :name="view ? 'table' : 'database'" :size="15" class="dg__title-icon" />
        <h2 class="dg__title is-ellipsis" :title="title">{{ title }}</h2>
        <IBadge tone="gray">{{ kindLabel }}</IBadge>
        <span class="dg__stats" data-testid="grid-stats">{{ statsText }}</span>
      </div>
      <div class="dg__actions">
        <ITooltip content="撤销 (Ctrl/⌘+Z)">
          <IButton variant="ghost" icon="undo" size="sm" :disabled="!canUndo" aria-label="撤销" data-testid="undo-btn" @click="store.undo()" />
        </ITooltip>
        <ITooltip content="重做 (Ctrl/⌘+Shift+Z)">
          <IButton variant="ghost" icon="redo" size="sm" :disabled="!canRedo" aria-label="重做" @click="store.redo()" />
        </ITooltip>
        <span class="dg__sep" />
        <IPopover :open="colVisibilityOpen" placement="bottom-end" @update:open="colVisibilityOpen = $event">
          <template #anchor>
            <IButton variant="ghost" icon="columns" size="sm" title="列显隐" aria-label="列显隐" @click="colVisibilityOpen = !colVisibilityOpen" />
          </template>
          <template #default>
            <div class="dg__colvis">
              <ITextField v-model="colVisSearch" size="sm" placeholder="搜索列…" prefix-icon="search" clearable />
              <div class="dg__colvis-list">
                <label v-for="c in colVisList" :key="c.field" class="dg__colvis-item">
                  <input type="checkbox" :checked="!hiddenCols.has(c.field)" @change="toggleColumn(c.field)" />
                  <IIcon :name="c.dataType === 'number' ? 'type-number' : 'type-text'" :size="12" class="dg__typeicon" />
                  <span class="is-ellipsis">{{ c.title }}</span>
                </label>
                <div v-if="!colVisList.length" class="dg__colvis-empty">无匹配列</div>
              </div>
            </div>
          </template>
        </IPopover>
        <ITooltip content="导出 CSV">
          <IButton variant="ghost" icon="download" size="sm" aria-label="导出 CSV" @click="exportCsv" />
        </ITooltip>
        <ITooltip :content="showSelection ? '关闭行选择' : '开启行选择'">
          <IButton
            variant="ghost"
            icon="check"
            size="sm"
            :aria-pressed="showSelection"
            :class="{ 'dg__action--on': showSelection }"
            aria-label="行选择开关"
            @click="showSelection = !showSelection"
          />
        </ITooltip>
        <IButton variant="primary" size="sm" icon="bar" @click="createChart">创建图表</IButton>
      </div>
    </header>

    <!-- FILTERS & TRANSFORMS -->
    <div class="dg__ft">
      <span class="dg__ft-label">FILTERS & TRANSFORMS</span>
      <IBadge
        v-for="f in inheritedFilters"
        :key="f.id"
        tone="gray"
        icon="filter"
        :title="`表级过滤（在源表上编辑）：${filterSummary(f, result.columns)}`"
      >
        表级 · {{ filterSummary(f, result.columns) }}
      </IBadge>
      <IBadge
        v-for="f in targetFilters"
        :key="f.id"
        tone="blue"
        icon="filter"
        clickable
        removable
        @click="openFilterDialog(f)"
        @remove="removeFilterCommit(f.id)"
      >
        {{ filterSummary(f, result.columns) }}
      </IBadge>
      <IBadge
        v-for="t in targetTransforms"
        :key="t.id"
        tone="green"
        icon="gear"
        clickable
        removable
        @click="openTransformDialog(t)"
        @remove="removeTransformCommit(t.id)"
      >
        {{ transformSummary(t) }}
      </IBadge>
      <button type="button" class="dg__ft-add" @click="openFilterDialog(null)">
        <IIcon name="plus" :size="12" /> Add filter
      </button>
      <IPopover v-if="view" :open="transformPickerOpen" placement="bottom-start" :arrow="false" @update:open="transformPickerOpen = $event">
        <template #anchor>
          <button type="button" class="dg__ft-add" @click="transformPickerOpen = !transformPickerOpen">
            <IIcon name="plus" :size="12" /> Transform
          </button>
        </template>
        <template #default="{ close }">
          <div class="dg__menu" role="menu">
            <button
              v-for="tt in TRANSFORM_TYPES"
              :key="tt"
              type="button"
              class="dg__menu-item"
              role="menuitem"
              @click="close(); openTransformDialog(null, tt)"
            >
              {{ TRANSFORM_TYPE_LABELS[tt] }}
            </button>
          </div>
        </template>
      </IPopover>
      <span v-else class="dg__ft-hint">转换仅在视图上可用</span>
    </div>

    <!-- 只读 banner -->
    <div v-if="view && editMode === 'none'" class="dg__banner">
      <IIcon name="info" :size="14" />
      <span>该视图包含改变行集的转换，提升为表后可编辑</span>
      <IButton size="sm" variant="secondary" icon="level-up" @click="promote">提升为表</IButton>
    </div>

    <!-- 采样警告 -->
    <div v-if="result.sampled" class="dg__banner dg__banner--warn">
      <IIcon name="warning" :size="14" />
      <span>Showing a random sample of {{ result.rows.length.toLocaleString() }} rows out of {{ result.totalRows.toLocaleString() }}</span>
      <button type="button" class="dg__banner-link" @click="exportCsv">Download</button>
    </div>

    <!-- 网格 -->
    <div class="dg__gridwrap">
      <IEmptyState
        v-if="result.columns.length === 0"
        icon="table"
        title="暂无列"
        description="该表没有任何列。导入 CSV 或合并表以获取数据。"
      />
      <VxeTable
        v-else
        ref="gridRef"
        class="dg__grid"
        :data="displayedRows"
        height="100%"
        :auto-resize="true"
        border="none"
        :show-header="true"
        :row-config="{ keyField: ROW_ID_FIELD, isHover: true }"
        :column-config="{ resizable: true }"
        :scroll-y="{ enabled: true, gt: 500 }"
        :edit-config="editConfig"
        :keyboard-config="editable ? keyboardConfig : undefined"
        :mouse-config="editable ? mouseConfig : undefined"
        :cell-class-name="cellClassName"
        @cell-click="onCellClick"
        @cell-context-menu="onCellContextMenu"
        @edit-activated="onEditActived"
        @edit-closed="onEditClosed"
      >
        <VxeColumn v-if="showSelection" type="checkbox" width="40" fixed="left" />
        <VxeColumn type="seq" width="52" fixed="left" title="#" />
        <VxeColumn
          v-for="col in visibleColumns"
          :key="col.field"
          :field="col.field"
          :title="col.title"
          :min-width="120"
          :edit-render="editable ? {} : undefined"
        >
          <template #header>
            <div class="dg__th" @contextmenu.prevent="openColumnMenu(col.field, $event)">
              <IIcon
                :name="col.dataType === 'number' ? 'type-number' : col.dataType === 'date' || col.dataType === 'datetime' ? 'calendar' : 'type-text'"
                :size="13"
                class="dg__typeicon"
              />
              <span class="dg__th-name is-ellipsis" :title="col.title">{{ col.title }}</span>
              <IIcon
                v-if="sortInfo?.field === col.field"
                :name="sortInfo.direction === 'asc' ? 'sort-asc' : 'sort-desc'"
                :size="12"
                class="dg__th-sort"
              />
              <!-- 列筛选漏斗（弹层为全局单例，见下方 Teleport） -->
              <button
                type="button"
                class="dg__th-btn"
                :class="{ 'dg__th-btn--active': !!columnFilterOf(col.field) || colFilterFor === col.field }"
                :aria-label="`筛选 ${col.title}`"
                title="筛选此列"
                @click.stop="openColumnFilter(col.field, $event)"
              >
                <IIcon name="filter" :size="12" />
              </button>
              <!-- 列菜单触发 -->
              <button
                type="button"
                class="dg__th-btn dg__th-btn--menu"
                :class="{ 'dg__th-btn--active': colMenuFor === col.field }"
                :aria-label="`${col.title} 列菜单`"
                @click.stop="openColumnMenu(col.field, $event)"
              >
                <IIcon name="more" :size="12" />
              </button>
            </div>
          </template>

          <template #default="{ row }">
            <span class="dg__cell" :class="{ 'dg__cell--num': col.dataType === 'number', 'dg__cell--blank': row[col.field] === null || row[col.field] === undefined }">
              {{ fmtCell(row, col) }}
            </span>
          </template>

          <template #edit>
            <input
              class="dg__edit-input"
              :value="editDraft"
              autofocus
              @input="editDraft = ($event.target as HTMLInputElement).value"
              @keydown="onEditInputKeydown"
              @blur="onEditInputBlur"
              @focus="($event.target as HTMLInputElement).select()"
            />
          </template>
        </VxeColumn>

        <template #empty>
          <IEmptyState icon="table" title="暂无数据" description="没有符合条件的行。">
            <IButton v-if="editable" size="sm" icon="plus" @click="addRow">添加行</IButton>
          </IEmptyState>
        </template>
      </VxeTable>
    </div>

    <!-- 添加行 -->
    <button v-if="editable && result.columns.length" type="button" class="dg__addrow" @click="addRow">
      <IIcon name="plus" :size="13" /> 添加行
    </button>

    <!-- 列筛选单例弹层（避开 vxe 表头克隆双开） -->
    <Teleport to="body">
      <div
        v-if="colFilterFor"
        ref="filterPanelEl"
        class="dg__cf-panel"
        :style="filterPanelStyle"
        data-is-floating="1"
        role="dialog"
        aria-label="列筛选"
        @mousedown.stop
      >
        <div class="dg__cf">
          <ISelect v-model="cfOp" :options="cfOperatorOptions" size="sm" />
          <ITextField v-if="cfArity === 'one'" v-model="cfValue" size="sm" placeholder="值" @enter="applyColumnFilter" />
          <template v-else-if="cfArity === 'two'">
            <div class="dg__cf-range">
              <ITextField v-model="cfValue" size="sm" placeholder="下界" @enter="applyColumnFilter" />
              <ITextField v-model="cfValue2" size="sm" placeholder="上界" @enter="applyColumnFilter" />
            </div>
          </template>
          <ITextField v-else-if="cfArity === 'list'" v-model="cfValue" size="sm" placeholder="值1, 值2（逗号分隔）" @enter="applyColumnFilter" />
          <div class="dg__cf-actions">
            <IButton size="sm" variant="ghost" :disabled="!columnFilterOf(colFilterFor)" @click="clearColumnFilter">清除</IButton>
            <IButton size="sm" variant="primary" @click="applyColumnFilter">Apply</IButton>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 列菜单单例弹层 -->
    <Teleport to="body">
      <div
        v-if="colMenuFor"
        ref="menuPanelEl"
        class="dg__menu-panel"
        :style="menuPanelStyle"
        data-is-floating="1"
        role="menu"
        @mousedown.stop
      >
        <div class="dg__menu">
          <button type="button" class="dg__menu-item" role="menuitem" @click="runColumnMenu((f) => setSort(f, 'asc'))">
            <IIcon name="sort-asc" :size="13" /> 升序
          </button>
          <button type="button" class="dg__menu-item" role="menuitem" @click="runColumnMenu((f) => setSort(f, 'desc'))">
            <IIcon name="sort-desc" :size="13" /> 降序
          </button>
          <button
            v-if="sortInfo?.field === colMenuFor"
            type="button"
            class="dg__menu-item"
            role="menuitem"
            @click="runColumnMenu((f) => setSort(f, null))"
          >
            <IIcon name="close" :size="13" /> 清除排序
          </button>
          <div class="dg__menu-sep" />
          <button
            type="button"
            class="dg__menu-item"
            role="menuitem"
            @click="openColumnFilterFromMenu()"
          >
            <IIcon name="filter" :size="13" /> 筛选此列
          </button>
          <button type="button" class="dg__menu-item" role="menuitem" @click="runColumnMenu((f) => toggleColumn(f))">
            <IIcon name="eye-off" :size="13" /> 隐藏列
          </button>
          <div class="dg__menu-sep" />
          <button type="button" class="dg__menu-item" role="menuitem" @click="runColumnMenu(() => openTransformDialog(null, 'derived'))">
            <IIcon name="plus" :size="13" /> 在右侧插入派生列
          </button>
          <template v-if="editable">
            <button type="button" class="dg__menu-item" role="menuitem" @click="runColumnMenu((f) => openRenameColumn(f))">
              <IIcon name="edit" :size="13" /> 重命名列
            </button>
            <button
              type="button"
              class="dg__menu-item dg__menu-item--danger"
              role="menuitem"
              @click="runColumnMenu((f) => { deleteColField = f })"
            >
              <IIcon name="trash" :size="13" /> 删除列
            </button>
          </template>
        </div>
      </div>
    </Teleport>

    <!-- 行上下文菜单 -->
    <Teleport to="body">
      <div
        v-if="ctxMenu"
        class="dg__ctx"
        :style="{ left: `${ctxMenu.x}px`, top: `${ctxMenu.y}px` }"
        role="menu"
        @mousedown.stop
      >
        <button
          v-for="item in ctxMenu.items"
          :key="item.label"
          type="button"
          class="dg__menu-item"
          :class="{ 'dg__menu-item--danger': item.danger }"
          role="menuitem"
          @click="closeCtxMenu(); item.action()"
        >
          <IIcon v-if="item.icon" :name="(item.icon as never)" :size="13" /> {{ item.label }}
        </button>
      </div>
    </Teleport>

    <!-- 重命名列 -->
    <IModal :open="renameCol.open" title="重命名列" :width="400" @update:open="renameCol.open = $event">
      <ITextField v-model="renameCol.title" autofocus @enter="submitRenameColumn" />
      <template #footer>
        <IButton @click="renameCol.open = false">取消</IButton>
        <IButton variant="primary" :disabled="!renameCol.title.trim()" @click="submitRenameColumn">保存</IButton>
      </template>
    </IModal>

    <!-- 删除列确认 -->
    <IModal :open="!!deleteColField" title="删除列" :width="420" @update:open="!$event && (deleteColField = null)">
      <p class="dg__confirm">
        确定删除列「{{ result.columns.find((c) => c.field === deleteColField)?.title ?? deleteColField }}」吗？该列所有数据将被移除（可撤销）。
      </p>
      <template #footer>
        <IButton @click="deleteColField = null">取消</IButton>
        <IButton variant="danger" @click="confirmDeleteColumn">删除</IButton>
      </template>
    </IModal>

    <!-- 过滤 / 转换弹窗 -->
    <FilterDialog
      :open="filterDialog.open"
      :columns="result.columns"
      :initial="filterDialog.initial"
      :scope="scopeLabel"
      @update:open="filterDialog.open = $event"
      @apply="onFilterApply"
    />
    <TransformDialog
      :open="transformDialog.open"
      :columns="result.columns"
      :rows="result.rows.slice(0, 20)"
      :initial="transformDialog.initial"
      :prefill-type="transformDialog.prefillType"
      @update:open="transformDialog.open = $event"
      @apply="onTransformApply"
    />
  </div>
</template>

<style scoped>
.dg {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background: var(--is-surface);
  border: 1px solid var(--is-border);
  border-radius: var(--is-radius);
  overflow: hidden;
}
.dg__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 14px 6px;
}
.dg__title-group {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.dg__title-icon {
  color: var(--is-text-secondary);
  flex-shrink: 0;
}
.dg__title {
  font-size: var(--is-text-md);
  font-weight: 600;
  max-width: 320px;
}
.dg__stats {
  font-size: var(--is-text-xs);
  color: var(--is-text-tertiary);
  white-space: nowrap;
}
.dg__actions {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}
.dg__sep {
  width: 1px;
  height: 18px;
  background: var(--is-border);
  margin: 0 6px;
}
.dg__action--on {
  background: var(--is-accent-soft);
  color: var(--is-accent);
}

.dg__ft {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  padding: 4px 14px 8px;
  border-bottom: 1px solid var(--is-border);
}
.dg__ft-label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  color: var(--is-text-tertiary);
  margin-right: 2px;
}
.dg__ft-add {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--is-accent);
  font-size: var(--is-text-xs);
  font-weight: 600;
  padding: 3px 6px;
  border-radius: var(--is-radius-sm);
}
.dg__ft-add:hover {
  background: var(--is-accent-soft);
}
.dg__ft-hint {
  font-size: 11px;
  color: var(--is-text-tertiary);
}

.dg__banner {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  font-size: var(--is-text-xs);
  background: var(--is-accent-soft);
  color: var(--is-accent);
  border-bottom: 1px solid var(--is-border);
}
.dg__banner--warn {
  background: var(--is-warning-bg);
  color: var(--is-warning-text);
}
.dg__banner-link {
  color: inherit;
  font-weight: 600;
  text-decoration: underline;
}

.dg__gridwrap {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.dg__grid {
  flex: 1;
  min-height: 0;
}

.dg__th {
  display: flex;
  align-items: center;
  gap: 5px;
  width: 100%;
  min-width: 0;
}
.dg__typeicon {
  color: var(--is-text-tertiary);
  flex-shrink: 0;
}
.dg__th-name {
  flex: 1;
  min-width: 0;
  font-weight: 600;
}
.dg__th-sort {
  color: var(--is-accent);
  flex-shrink: 0;
}
.dg__th-btn {
  display: none;
  padding: 2px;
  border-radius: 3px;
  color: var(--is-text-tertiary);
  flex-shrink: 0;
}
.dg__th:hover .dg__th-btn,
.dg__th-btn--active {
  display: inline-flex;
}
.dg__th-btn:hover {
  background: rgba(16, 24, 40, 0.08);
  color: var(--is-text);
}
.dg__th-btn--active {
  color: var(--is-accent);
}

.dg__cell {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dg__cell--num {
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.dg__cell--blank {
  color: var(--is-text-tertiary);
}

.dg__edit-input {
  width: 100%;
  height: 100%;
  min-height: 28px;
  border: none;
  outline: none;
  padding: 0 8px;
  font: inherit;
  color: inherit;
  background: var(--is-surface);
  box-shadow: inset 0 0 0 2px var(--is-accent);
}

.dg__addrow {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px;
  border-top: 1px solid var(--is-border);
  color: var(--is-text-secondary);
  font-size: var(--is-text-sm);
  transition:
    background-color var(--is-dur-fast) var(--is-ease),
    color var(--is-dur-fast) var(--is-ease);
}
.dg__addrow:hover {
  background: var(--is-surface-hover);
  color: var(--is-accent);
}

.dg__menu {
  padding: 4px;
  display: flex;
  flex-direction: column;
  min-width: 160px;
}
.dg__menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  border-radius: var(--is-radius-sm);
  font-size: var(--is-text-sm);
  text-align: left;
  color: var(--is-text);
  white-space: nowrap;
}
.dg__menu-item:hover {
  background: var(--is-surface-hover);
}
.dg__menu-item--danger {
  color: var(--is-danger);
}
.dg__menu-item--danger:hover {
  background: var(--is-danger-soft);
}
.dg__menu-sep {
  height: 1px;
  background: var(--is-border);
  margin: 4px 6px;
}

.dg__cf-panel,
.dg__menu-panel {
  background: var(--is-surface);
  border: 1px solid var(--is-border);
  border-radius: var(--is-radius);
  box-shadow: var(--is-shadow-md);
}
.dg__cf {
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 220px;
}
.dg__cf-range {
  display: flex;
  gap: 6px;
}
.dg__cf-actions {
  display: flex;
  justify-content: space-between;
}

.dg__colvis {
  padding: 8px;
  width: 220px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.dg__colvis-list {
  max-height: 260px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}
.dg__colvis-item {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 5px 6px;
  border-radius: var(--is-radius-sm);
  font-size: var(--is-text-sm);
  cursor: pointer;
}
.dg__colvis-item:hover {
  background: var(--is-surface-hover);
}
.dg__colvis-empty {
  padding: 12px;
  text-align: center;
  color: var(--is-text-tertiary);
  font-size: var(--is-text-xs);
}

.dg__ctx {
  position: fixed;
  z-index: var(--is-z-popover);
  background: var(--is-surface);
  border: 1px solid var(--is-border);
  border-radius: var(--is-radius);
  box-shadow: var(--is-shadow-md);
  padding: 4px;
  display: flex;
  flex-direction: column;
  min-width: 150px;
}

.dg__confirm {
  font-size: var(--is-text-sm);
  color: var(--is-text-secondary);
  line-height: 1.6;
}
</style>

<style>
/* vxe-table 主题微调（非 scoped，作用于 vxe 内部类） */
.dg .vxe-table {
  font-family: var(--is-font);
  font-size: var(--is-text-sm);
  color: var(--is-text);
}
.dg .vxe-table .vxe-header--column {
  background: var(--is-surface-hover);
  color: var(--is-text);
  font-weight: 600;
  height: 36px;
}
.dg .vxe-table .vxe-body--row.row--hover {
  background: var(--is-surface-hover);
}
.dg .vxe-table .vxe-body--column,
.dg .vxe-table .vxe-header--column,
.dg .vxe-table .vxe-footer--column {
  background-image: none;
  border-bottom: 1px solid var(--is-border);
}
.dg .vxe-table .vxe-body--column.col--selected {
  box-shadow: inset 0 0 0 2px var(--is-accent);
}
.dg .vxe-table .vxe-body--column.dg-cell--range {
  background: var(--is-accent-soft);
}
.dg .vxe-table .vxe-cell {
  padding-left: 10px;
  padding-right: 10px;
}
</style>
