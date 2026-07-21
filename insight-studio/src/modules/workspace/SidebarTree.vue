<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { storeToRefs } from 'pinia'
import type { AnalysisTable, ViewNode, ViewType } from '../../shared/types'
import { findCombineDependents, findTable, findView, findViewParent } from '../../shared/tree'
import { createViewNode, defaultViewName } from '../../shared/factories'
import { useAnalysisStore } from '../../stores/analysisStore'
import { IButton, IIcon, IModal, IPopover, ITextField, toast } from '../../ui'
import type { IconName } from '../../ui'
import SidebarTreeNode from './SidebarTreeNode.vue'

const emit = defineEmits<{ (e: 'add-data'): void }>()

const store = useAnalysisStore()
const { current, selected } = storeToRefs(store)

const search = ref('')

/* 展开/收起 */
const expanded = reactive<Set<string>>(new Set())
function toggle(id: string) {
  if (expanded.has(id)) expanded.delete(id)
  else expanded.add(id)
}
function isTableExpanded(t: AnalysisTable): boolean {
  // 默认展开；收起后 id 进 expandedClosed 集合。为简化：用「已收起」集合语义。
  return !collapsedTables.has(t.id)
}
const collapsedTables = reactive<Set<string>>(new Set())
function toggleTable(id: string) {
  if (collapsedTables.has(id)) collapsedTables.delete(id)
  else collapsedTables.add(id)
}

/* 搜索过滤：名称命中或后代命中则保留 */
function viewMatches(v: ViewNode, q: string): boolean {
  if (v.name.toLowerCase().includes(q)) return true
  return v.children.some((c) => viewMatches(c, q))
}
function filterViews(views: ViewNode[], q: string): ViewNode[] {
  if (!q) return views
  return views.filter((v) => viewMatches(v, q))
}
const visibleTables = computed(() => {
  const a = current.value
  if (!a) return []
  const q = search.value.trim().toLowerCase()
  if (!q) return a.tables
  return a.tables.filter(
    (t) => t.name.toLowerCase().includes(q) || t.views.some((v) => viewMatches(v, q)),
  )
})

/* 选中 */
function selectTable(tableId: string) {
  store.select({ kind: 'table', tableId })
}
function selectView(tableId: string, viewId: string) {
  store.select({ kind: 'view', tableId, viewId })
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
        `无法删除：以下合并表依赖它 — ${deps.map((d) => d.name).join('、')}。请先删除依赖表。`,
        { title: '存在 combine 依赖' },
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
      a.tables = a.tables.filter((t) => t.id !== p.tableId)
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
  if (newViewId) selectView(target.tableId, newViewId)
}

function connectExternal() {
  toast.info('Connect with external tool 将在后续版本提供')
}
</script>

<template>
  <aside class="sidebar">
    <div class="sidebar__search">
      <ITextField v-model="search" placeholder="Search" prefix-icon="search" clearable size="md" />
    </div>

    <div class="sidebar__section">
      <div class="sidebar__section-head">
        <span class="sidebar__section-title">Analysis data</span>
        <button type="button" class="sidebar__add" aria-label="添加数据" title="Add data" @click="emit('add-data')">
          <IIcon name="plus" :size="13" />
        </button>
      </div>

      <div class="sidebar__tree" role="tree">
        <div v-if="!visibleTables.length" class="sidebar__empty">
          {{ search ? '无匹配结果' : '还没有数据，点击 Add data 开始' }}
        </div>

        <div v-for="t in visibleTables" :key="t.id" class="tnode">
          <div
            class="tnode__row"
            :class="{ 'tnode__row--selected': selected?.kind === 'table' && selected.tableId === t.id }"
            role="treeitem"
            data-testid="sidebar-table"
            :data-name="t.name"
            :aria-expanded="isTableExpanded(t)"
            :aria-selected="selected?.kind === 'table' && selected.tableId === t.id"
            tabindex="0"
            @click="selectTable(t.id)"
            @keydown.enter="selectTable(t.id)"
          >
            <button
              type="button"
              class="tnode__chevron"
              :aria-label="isTableExpanded(t) ? '收起' : '展开'"
              @click.stop="toggleTable(t.id)"
            >
              <IIcon :name="isTableExpanded(t) ? 'chevron-down' : 'chevron-right'" :size="12" />
            </button>
            <IIcon :name="t.source === 'combine' ? 'combine' : 'database'" :size="14" class="tnode__icon" />
            <span class="tnode__name is-ellipsis" :title="t.name">{{ t.name }}</span>
            <span class="tnode__actions">
              <button
                type="button"
                class="tnode__action"
                aria-label="新建视图"
                title="新建视图"
                @click.stop="openPicker(t.id, null)"
              >
                <IIcon name="plus" :size="12" />
              </button>
              <IPopover :open="menuFor === t.id" placement="bottom-end" :arrow="false" @update:open="setMenu($event ? t.id : null)">
                <template #anchor>
                  <button
                    type="button"
                    class="tnode__action"
                    aria-label="更多操作"
                    @click.stop="setMenu(menuFor === t.id ? null : t.id)"
                  >
                    <IIcon name="more" :size="13" />
                  </button>
                </template>
                <template #default="{ close }">
                  <div class="menu" role="menu">
                    <button type="button" class="menu__item" role="menuitem" @click.stop="close(); showInFlowchart(t.id)">
                      <IIcon name="flowchart" :size="13" /> 在流程图中显示
                    </button>
                    <button type="button" class="menu__item" role="menuitem" @click.stop="close(); openTableRename(t)">
                      <IIcon name="edit" :size="13" /> 重命名
                    </button>
                    <button type="button" class="menu__item" role="menuitem" @click.stop="close(); openPicker(t.id, null)">
                      <IIcon name="plus" :size="13" /> 新建视图
                    </button>
                    <button type="button" class="menu__item menu__item--danger" role="menuitem" @click.stop="close(); askDeleteTable(t)">
                      <IIcon name="trash" :size="13" /> 删除
                    </button>
                  </div>
                </template>
              </IPopover>
            </span>
          </div>

          <div v-if="isTableExpanded(t)" role="group">
            <SidebarTreeNode
              v-for="v in filterViews(t.views, search.trim().toLowerCase())"
              :key="v.id"
              :node="v"
              :table-id="t.id"
              :depth="1"
              :expanded="expanded"
              :selected-view-id="selected?.kind === 'view' ? selected.viewId : undefined"
              :editing-id="editingId"
              :menu-for="menuFor"
              @toggle="toggle"
              @select="selectView"
              @menu="setMenu"
              @rename="commitRename"
              @rename-start="startRename"
              @rename-cancel="cancelRename"
              @delete="(id: string, name: string) => askDeleteView(t.id, id, name)"
              @new-view="openPicker"
              @show-in-flowchart="showInFlowchart"
            />
          </div>
        </div>
      </div>
    </div>

    <div class="sidebar__footer">
      <IButton variant="ghost" icon="link" size="sm" @click="connectExternal">
        Connect with external tool
      </IButton>
    </div>

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
  width: 260px;
  min-width: 260px;
  height: 100%;
  background: var(--is-surface);
  border-right: 1px solid var(--is-border);
  position: relative;
}
.sidebar__search {
  padding: 12px 12px 8px;
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
  padding: 4px 12px;
}
.sidebar__section-title {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--is-text-tertiary);
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
  padding: 4px 8px 16px;
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

.tnode__row {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 30px;
  padding: 0 4px 0 8px;
  border-radius: var(--is-radius-sm);
  cursor: pointer;
  transition: background-color var(--is-dur-fast) var(--is-ease);
}
.tnode__row:hover {
  background: var(--is-surface-hover);
}
.tnode__row--selected,
.tnode__row--selected:hover {
  background: var(--is-accent-soft);
}
.tnode__row--selected .tnode__name {
  color: var(--is-accent);
  font-weight: 500;
}
.tnode__chevron {
  display: inline-flex;
  width: 16px;
  height: 16px;
  align-items: center;
  justify-content: center;
  color: var(--is-text-tertiary);
  border-radius: 3px;
  flex-shrink: 0;
}
.tnode__icon {
  color: var(--is-text-secondary);
  flex-shrink: 0;
}
.tnode__name {
  flex: 1;
  min-width: 0;
  font-size: var(--is-text-sm);
  font-weight: 500;
}
.tnode__actions {
  display: none;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}
.tnode__row:hover .tnode__actions,
.tnode__row:focus-within .tnode__actions {
  display: inline-flex;
}
.tnode__action {
  display: inline-flex;
  padding: 3px;
  border-radius: 4px;
  color: var(--is-text-tertiary);
}
.tnode__action:hover {
  background: rgba(16, 24, 40, 0.08);
  color: var(--is-text);
}

.menu {
  padding: 4px;
  display: flex;
  flex-direction: column;
  min-width: 140px;
}
.menu__item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  border-radius: var(--is-radius-sm);
  font-size: var(--is-text-sm);
  text-align: left;
  color: var(--is-text);
}
.menu__item:hover {
  background: var(--is-surface-hover);
}
.menu__item--danger {
  color: var(--is-danger);
}
.menu__item--danger:hover {
  background: var(--is-danger-soft);
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
