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

/**
 * 分析数据集树（嵌入二级侧栏详情模式）。
 * 搜索词由父级侧栏提供；Add data 入口也在父级侧栏头部。
 */
const props = withDefaults(defineProps<{ search?: string }>(), { search: '' })

const store = useAnalysisStore()
const { current, selected, loading } = storeToRefs(store)

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
  const q = props.search.trim().toLowerCase()
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
</script>

<template>
  <div class="tree-wrap">
    <div class="tree" role="tree">
      <div v-if="!tableForest.length" class="tree__empty">
        {{ loading ? '加载中…' : search ? '无匹配结果' : '还没有数据，点击上方 + 添加数据' }}
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

    <!-- 节点类型选择（tiles） -->
    <IPopover
      :open="!!pickerFor"
      placement="right-start"
      :arrow="true"
      @update:open="!$event && (pickerFor = null)"
    >
      <template #anchor><span class="tree__picker-anchor" /></template>
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
  </div>
</template>

<style scoped>
.tree-wrap {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  position: relative;
}
.tree {
  flex: 1;
  overflow-y: auto;
  padding: 4px 0 16px;
}
.tree__empty {
  padding: 24px 12px;
  font-size: var(--is-text-xs);
  color: var(--is-text-tertiary);
  text-align: center;
}
.tree__picker-anchor {
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
