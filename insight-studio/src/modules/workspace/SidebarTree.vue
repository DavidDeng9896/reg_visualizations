<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { storeToRefs } from 'pinia'
import type { AnalysisTable, ViewNode, ViewType } from '../../shared/types'
import { buildTableForest, filterTableForest, findCombineDependents, findTable, findView, findViewParent } from '../../shared/tree'
import { createViewNode, defaultViewName } from '../../shared/factories'
import { useAnalysisStore } from '../../stores/analysisStore'
import type { SelectedNode } from '../../stores/analysisStore'
import { IButton, IIcon, IModal, IPopover, ITextField, toast } from '../../ui'
import type { IconName } from '../../ui'
import SidebarTableNode from './SidebarTableNode.vue'
import AddDataMenu from './AddDataMenu.vue'

const emit = defineEmits<{ (e: 'import-csv' | 'import-excel' | 'import-sql' | 'combine'): void }>()

/** 侧栏「+」Add data 浮窗开关（折叠 rail 与区头共用一份状态，二者不会同时渲染）。 */
const addMenuOpen = ref(false)

const store = useAnalysisStore()
const { current, selected } = storeToRefs(store)

const SIDEBAR_COLLAPSED_KEY = 'insight-studio:sidebar-collapsed'
const collapsed = ref(localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1')

function toggleCollapsed() {
  collapsed.value = !collapsed.value
  localStorage.setItem(SIDEBAR_COLLAPSED_KEY, collapsed.value ? '1' : '0')
}

const search = ref('')

/* 展开/收起 */
const expanded = reactive<Set<string>>(new Set())
const collapsedTables = reactive<Set<string>>(new Set())
function toggle(id: string) {
  if (expanded.has(id)) expanded.delete(id)
  else expanded.add(id)
}
function toggleTable(id: string) {
  if (collapsedTables.has(id)) collapsedTables.delete(id)
  else collapsedTables.add(id)
}

const tableForest = computed(() => {
  const a = current.value
  if (!a) return []
  const forest = buildTableForest(a)
  const q = search.value.trim().toLowerCase()
  return q ? filterTableForest(forest, q) : forest
})

/* 选中 */
/**
 * 树节点选择：流程图模式下只更新选中态、不切回工作区，
 * 由 FlowchartCanvas 监听 selected 做居中定位与高亮（对齐「在流程图中显示」）。
 */
function selectNode(node: SelectedNode) {
  if (store.mode === 'flowchart') store.setSelected(node)
  else store.select(node)
}
function selectTable(tableId: string) {
  selectNode({ kind: 'table', tableId })
}
function selectView(tableId: string, viewId: string) {
  selectNode({ kind: 'view', tableId, viewId })
}

/** ⋯ 菜单「在流程图中显示」：选中并切到流程图模式（画布负责居中定位）。 */
function showInFlowchart(tableId: string, viewId?: string) {
  if (viewId) store.select({ kind: 'view', tableId, viewId })
  else store.select({ kind: 'table', tableId })
  store.setMode('flowchart')
}

/* ⋯ 菜单 */
const menuFor = ref<string | null>(null)
function setMenu(id: string | null) {
  menuFor.value = id
}

/* 重命名（视图节点内联） */
const editingId = ref<string | null>(null)
function startRename(id: string) {
  editingId.value = id
}
function cancelRename() {
  editingId.value = null
}
function commitRename(id: string, name: string) {
  const trimmed = name.trim()
  editingId.value = null
  if (!trimmed || !current.value) return
  store.mutate((a) => {
    for (const t of a.tables) {
      const v = findView(t.views, id)
      if (v) {
        v.name = trimmed
        return
      }
    }
  })
}

/* 表重命名弹窗 */
const tableRenameOpen = ref(false)
const tableRenameTarget = ref<AnalysisTable | null>(null)
const tableRenameName = ref('')
function openTableRename(t: AnalysisTable) {
  tableRenameTarget.value = t
  tableRenameName.value = t.name
  tableRenameOpen.value = true
}
function submitTableRename() {
  const t = tableRenameTarget.value
  const name = tableRenameName.value.trim()
  if (!t || !name) return
  store.mutate(() => {
    t.name = name
  })
  tableRenameOpen.value = false
}

/* 删除确认（表 / 视图共用） */
interface PendingDelete {
  kind: 'table' | 'view'
  tableId: string
  viewId?: string
  name: string
}
const deleteOpen = ref(false)
const pendingDelete = ref<PendingDelete | null>(null)

function askDeleteTable(t: AnalysisTable) {
  const a = current.value
  if (a) {
    const deps = findCombineDependents(a, t.id)
    if (deps.length) {
      toast.error(
        `无法删除：以下表依赖它 — ${deps.map((d) => d.name).join('、')}。请先删除依赖表。`,
        { title: '存在下游依赖' },
      )
      return
    }
  }
  pendingDelete.value = { kind: 'table', tableId: t.id, name: t.name }
  deleteOpen.value = true
}

function askDeleteView(tableId: string, viewId: string, name: string) {
  pendingDelete.value = { kind: 'view', tableId, viewId, name }
  deleteOpen.value = true
}

function confirmDelete() {
  const p = pendingDelete.value
  if (!p || !current.value) return
  store.mutate((a) => {
    if (p.kind === 'table') {
      const t = findTable(a, p.tableId)
      a.tables = a.tables.filter((t) => t.id !== p.tableId)
      // 表由步骤产出时级联删除步骤（依赖检查已在 askDeleteTable 完成）
      if (t?.stepId) {
        a.steps = a.steps.filter((s) => s.id !== t.stepId)
        delete a.flowchartLayout[`step:${t.stepId}`]
      }
    } else {
      const t = findTable(a, p.tableId)
      if (!t || !p.viewId) return
      const loc = findViewParent(t.views, p.viewId)
      if (loc) {
        const i = loc.siblings.findIndex((v) => v.id === p.viewId)
        if (i >= 0) loc.siblings.splice(i, 1)
      }
    }
  })
  if (
    selected.value &&
    ((p.kind === 'table' && selected.value.tableId === p.tableId) ||
      (p.kind === 'view' && selected.value.viewId === p.viewId))
  ) {
    store.select(null)
  }
  deleteOpen.value = false
  toast.success(`已删除「${p.name}」`)
}

/* 新建视图（节点类型 tiles 弹层） */
const pickerFor = ref<{ tableId: string; parentViewId: string | null } | null>(null)

function openPicker(tableId: string, parentViewId: string | null) {
  pickerFor.value = { tableId, parentViewId }
}

const TILE_GROUPS: { title: string; items: { type: ViewType; label: string; icon: IconName }[] }[] = [
  { title: 'Table', items: [{ type: 'table', label: 'Table', icon: 'table' }] },
  { title: 'Bar chart', items: [{ type: 'bar', label: 'Bar', icon: 'bar' }] },
  {
    title: 'Other charts',
    items: [
      { type: 'line', label: 'Line', icon: 'line' },
      { type: 'scatter', label: 'Scatter', icon: 'scatter' },
      { type: 'box', label: 'Box', icon: 'box' },
      { type: 'pie', label: 'Pie', icon: 'pie' },
      { type: 'heatmap', label: 'Heatmap', icon: 'heatmap' },
    ],
  },
]

function pickViewType(type: ViewType) {
  const target = pickerFor.value
  if (!target || !current.value) return
  let newViewId = ''
  store.mutate((a) => {
    const t = findTable(a, target.tableId)
    if (!t) return
    const view = createViewNode(type, defaultViewName(type, t.views))
    newViewId = view.id
    if (target.parentViewId) {
      const parent = findView(t.views, target.parentViewId)
      if (parent) parent.children.push(view)
      else t.views.push(view)
    } else {
      t.views.push(view)
    }
  })
  pickerFor.value = null
  // 新建视图属于「创建并配置」而非树导航：始终切到工作区打开编辑器（不受需求2树选择规则影响）
  if (newViewId) store.select({ kind: 'view', tableId: target.tableId, viewId: newViewId })
}

function connectExternal() {
  toast.info('Connect with external tool 将在后续版本提供')
}
</script>

<template>
  <aside class="sidebar" :class="{ 'sidebar--collapsed': collapsed }" :aria-expanded="!collapsed">
    <!-- 收起态：窄条 + 展开按钮 -->
    <div v-if="collapsed" class="sidebar__rail">
      <button
        type="button"
        class="sidebar__toggle"
        aria-label="展开侧栏"
        title="展开侧栏"
        @click="toggleCollapsed"
      >
        <IIcon name="chevron-right" :size="16" />
      </button>
      <IPopover :open="addMenuOpen" placement="right-start" :arrow="true" @update:open="addMenuOpen = $event">
        <template #anchor>
          <button
            type="button"
            class="sidebar__rail-add"
            aria-label="添加数据"
            title="Add data"
            @click="addMenuOpen = !addMenuOpen"
          >
            <IIcon name="plus" :size="16" />
          </button>
        </template>
        <template #default>
          <AddDataMenu
            @import-csv="addMenuOpen = false; emit('import-csv')"
            @import-excel="addMenuOpen = false; emit('import-excel')"
            @import-sql="addMenuOpen = false; emit('import-sql')"
            @combine="addMenuOpen = false; emit('combine')"
          />
        </template>
      </IPopover>
    </div>

    <template v-else>
      <div class="sidebar__search">
        <ITextField v-model="search" placeholder="Search" prefix-icon="search" clearable size="md" />
        <button
          type="button"
          class="sidebar__toggle"
          aria-label="收起侧栏"
          title="收起侧栏"
          @click="toggleCollapsed"
        >
          <IIcon name="chevron-left" :size="16" />
        </button>
      </div>

      <div class="sidebar__section">
        <div class="sidebar__section-head">
          <span class="sidebar__section-title">Analysis data</span>
          <IPopover :open="addMenuOpen" placement="bottom-start" :arrow="true" @update:open="addMenuOpen = $event">
            <template #anchor>
              <button type="button" class="sidebar__add" aria-label="添加数据" title="Add data" @click="addMenuOpen = !addMenuOpen">
                <IIcon name="plus" :size="14" />
              </button>
            </template>
            <template #default>
              <AddDataMenu
            @import-csv="addMenuOpen = false; emit('import-csv')"
            @import-excel="addMenuOpen = false; emit('import-excel')"
            @import-sql="addMenuOpen = false; emit('import-sql')"
            @combine="addMenuOpen = false; emit('combine')"
          />
            </template>
          </IPopover>
        </div>

        <div class="sidebar__tree" role="tree">
          <div v-if="!tableForest.length" class="sidebar__empty">
            {{ search ? '无匹配结果' : '还没有数据，点击 Add data 开始' }}
          </div>

          <SidebarTableNode
            v-for="node in tableForest"
            :key="node.table.id"
            :node="node"
            :depth="0"
            :search="search"
            :collapsed-tables="collapsedTables"
            :expanded="expanded"
            :selected-table-id="selected?.kind === 'table' ? selected.tableId : undefined"
            :selected-view-id="selected?.kind === 'view' ? selected.viewId : undefined"
            :editing-id="editingId"
            :menu-for="menuFor"
            @toggle-table="toggleTable"
            @toggle-view="toggle"
            @select-table="selectTable"
            @select-view="selectView"
            @menu="setMenu"
            @rename="commitRename"
            @rename-start="startRename"
            @rename-cancel="cancelRename"
            @delete-view="askDeleteView"
            @delete-table="askDeleteTable"
            @rename-table="openTableRename"
            @new-view="openPicker"
            @show-in-flowchart="showInFlowchart"
          />
        </div>
      </div>

      <div class="sidebar__footer">
        <IButton variant="ghost" icon="link" size="sm" @click="connectExternal">
          Connect with external tool
        </IButton>
      </div>
    </template>

    <!-- 节点类型选择（tiles） -->
    <IPopover
      :open="!!pickerFor"
      placement="right-start"
      :arrow="true"
      @update:open="!$event && (pickerFor = null)"
    >
      <template #anchor><span class="sidebar__picker-anchor" /></template>
      <div class="picker">
        <div v-for="group in TILE_GROUPS" :key="group.title" class="picker__group">
          <div class="picker__group-title">{{ group.title }}</div>
          <div class="picker__tiles">
            <button
              v-for="item in group.items"
              :key="item.type"
              type="button"
              class="picker__tile"
              :data-testid="`picker-${item.type}`"
              @click="pickViewType(item.type)"
            >
              <IIcon :name="item.icon" :size="18" />
              <span>{{ item.label }}</span>
            </button>
          </div>
        </div>
      </div>
    </IPopover>

    <!-- 表重命名 -->
    <IModal :open="tableRenameOpen" title="重命名表" :width="400" @update:open="tableRenameOpen = $event">
      <ITextField v-model="tableRenameName" autofocus @enter="submitTableRename" />
      <template #footer>
        <IButton @click="tableRenameOpen = false">取消</IButton>
        <IButton variant="primary" :disabled="!tableRenameName.trim()" @click="submitTableRename">保存</IButton>
      </template>
    </IModal>

    <!-- 删除确认 -->
    <IModal :open="deleteOpen" title="删除确认" :width="420" @update:open="deleteOpen = $event">
      <p class="confirm-text">
        确定删除「{{ pendingDelete?.name }}」吗？{{ pendingDelete?.kind === 'table' ? '其下所有视图' : '其所有子视图' }}将一并删除，此操作不可撤销。
      </p>
      <template #footer>
        <IButton @click="deleteOpen = false">取消</IButton>
        <IButton variant="danger" @click="confirmDelete">删除</IButton>
      </template>
    </IModal>
  </aside>
</template>

<style scoped>
.sidebar {
  display: flex;
  flex-direction: column;
  width: 280px;
  min-width: 280px;
  height: 100%;
  background: var(--is-surface);
  border-right: 1px solid var(--is-border);
  position: relative;
  flex-shrink: 0;
  transition: width var(--is-dur) var(--is-ease), min-width var(--is-dur) var(--is-ease);
}
.sidebar--collapsed {
  width: 44px;
  min-width: 44px;
}
.sidebar__rail {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 12px 0;
  height: 100%;
}
.sidebar__rail-add {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: var(--is-radius-sm);
  color: var(--is-text-secondary);
}
.sidebar__rail-add:hover {
  background: var(--is-surface-hover);
  color: var(--is-text);
}
.sidebar__toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  border-radius: var(--is-radius-sm);
  color: var(--is-text-tertiary);
}
.sidebar__toggle:hover {
  background: var(--is-surface-hover);
  color: var(--is-text);
}
.sidebar__search {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 12px;
}
.sidebar__search > :first-child {
  flex: 1;
  min-width: 0;
}
.sidebar__section {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.sidebar__section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 20px;
}
.sidebar__section-title {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--is-text-secondary);
}
.sidebar__add {
  display: inline-flex;
  padding: 4px;
  border-radius: 4px;
  color: var(--is-text-secondary);
}
.sidebar__add:hover {
  background: var(--is-surface-hover);
  color: var(--is-text);
}
.sidebar__tree {
  flex: 1;
  overflow-y: auto;
  padding: 4px 0 16px;
}
.sidebar__empty {
  padding: 24px 12px;
  font-size: var(--is-text-xs);
  color: var(--is-text-tertiary);
  text-align: center;
}
.sidebar__footer {
  border-top: 1px solid var(--is-border);
  padding: 10px 12px;
}
.sidebar__picker-anchor {
  position: absolute;
  left: 0;
  top: 120px;
}

.picker {
  padding: 12px;
  width: 300px;
}
.picker__group + .picker__group {
  margin-top: 12px;
}
.picker__group-title {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--is-text-tertiary);
  margin-bottom: 6px;
}
.picker__tiles {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}
.picker__tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 10px 6px;
  border: 1px solid var(--is-border);
  border-radius: var(--is-radius);
  background: var(--is-surface);
  font-size: var(--is-text-xs);
  color: var(--is-text-secondary);
  transition:
    border-color var(--is-dur-fast) var(--is-ease),
    background-color var(--is-dur-fast) var(--is-ease),
    color var(--is-dur-fast) var(--is-ease);
}
.picker__tile:hover {
  border-color: var(--is-accent);
  background: var(--is-accent-soft);
  color: var(--is-accent);
}
.confirm-text {
  font-size: var(--is-text-sm);
  color: var(--is-text-secondary);
  line-height: 1.6;
}
</style>
