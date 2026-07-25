# Layouts — 跨页面共享布局

> 项目没有独立的 `layouts/` 目录；布局由以下组件承担：
>
> | 布局件 | 文件 | 一句话说明 |
> |---|---|---|
> | 根组件 | `src/app/App.vue` | 只挂 `<RouterView/>` + 全局 `<ToastHost/>`，无全局 chrome |
> | 工作区 App Shell | `src/modules/workspace/WorkspacePage.vue` | `/analysis/:id` 的整体布局：52px 顶栏（面包屑 + ⋯ 菜单 + Flowchart 切换 + Add data 主按钮）+ 左侧 260px 数据树 + 主区（`WorkspaceMain`/`FlowchartMain` 按 `store.mode` 用 `<KeepAlive>` 切换）+ 重命名/删除/CSV 导入/表合并弹窗 |
> | 左侧栏 | `src/modules/workspace/SidebarTree.vue` | Search 输入 + ANALYSIS DATA 树（表行 + 递归视图节点）+ 底部「Connect with external tool」+ 新建视图 tiles 弹层 + 表重命名/删除弹窗 |
> | 侧栏树节点 | `src/modules/workspace/SidebarTreeNode.vue` | 递归视图节点行（类型图标 + 名称 + hover 操作组 + 内联重命名） |
> | 列表页页头 | `src/modules/analyses/AnalysisListPage.vue`（`.page__header`） | `/` 列表页自带的标题栏（标题 + 副标题 + 右侧动作），非共享组件，模式可复用 |
>
> 布局 CSS 模式（`.ws` / `.ws__header` / `.ws__body` / `.ws__main`、`.sidebar`）见下方 `WorkspacePage.vue` 与 `SidebarTree.vue` 的 `<style scoped>`。

以下按文件给出**完整源码**（路径相对 `insight-studio/`）。

## `src/app/App.vue`

```vue
<script setup lang="ts">
import { ToastHost } from '../ui'
</script>

<template>
  <RouterView />
  <ToastHost />
</template>
```

## `src/modules/workspace/WorkspacePage.vue`

```vue
<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useAnalysisStore } from '../../stores/analysisStore'
import { analysisRepository } from '../../shared/repository'
import { IButton, IIcon, IModal, IPopover, ITextField, ITooltip, toast } from '../../ui'
import SidebarTree from './SidebarTree.vue'
import WorkspaceMain from './WorkspaceMain.vue'
import FlowchartMain from './FlowchartMain.vue'
import CsvImportDialog from '../table/CsvImportDialog.vue'
import CombineTablesDialog from '../table/CombineTablesDialog.vue'

const route = useRoute()
const router = useRouter()
const store = useAnalysisStore()
const { current, mode, dirty, saving, loading } = storeToRefs(store)

const analysisId = computed(() => String(route.params.id ?? ''))

onMounted(async () => {
  const ok = await store.load(analysisId.value)
  if (!ok) {
    toast.error('Analysis 不存在或已被删除')
    router.replace('/')
  }
})

// 路由参数变化（例如列表页跳转）时重新加载
watch(analysisId, async (id, prev) => {
  if (id && id !== prev) {
    await store.saveNow()
    const ok = await store.load(id)
    if (!ok) router.replace('/')
  }
})

// 离开页面前落盘
onBeforeUnmount(() => {
  void store.saveNow()
})

/* 顶栏 ⋯ 菜单 */
const headerMenuOpen = ref(false)
const renameOpen = ref(false)
const renameName = ref('')
const deleteOpen = ref(false)

function openRename() {
  renameName.value = current.value?.name ?? ''
  renameOpen.value = true
}
function submitRename() {
  const name = renameName.value.trim()
  if (!name) return
  store.rename(name)
  renameOpen.value = false
}

async function confirmDelete() {
  if (!current.value) return
  const name = current.value.name
  await analysisRepository.delete(current.value.id)
  toast.success(`已删除「${name}」`)
  router.replace('/')
}

/* Flowchart 切换 */
function toggleFlowchart() {
  store.setMode(mode.value === 'flowchart' ? 'workspace' : 'flowchart')
}

/* Add data 菜单 */
const addDataOpen = ref(false)
const csvImportOpen = ref(false)
const combineOpen = ref(false)

function openCsvImport() {
  addDataOpen.value = false
  csvImportOpen.value = true
}
function openCombine() {
  addDataOpen.value = false
  combineOpen.value = true
}

const modeComponent = computed(() => (mode.value === 'flowchart' ? FlowchartMain : WorkspaceMain))
</script>

<template>
  <div class="ws">
    <header class="ws__header">
      <nav class="ws__breadcrumb" aria-label="面包屑">
        <RouterLink to="/" class="ws__crumb-link">Projects</RouterLink>
        <IIcon name="chevron-right" :size="12" class="ws__crumb-sep" />
        <span class="ws__crumb-current is-ellipsis">{{ current?.name ?? '…' }}</span>
        <span v-if="dirty" class="ws__dirty" title="有未保存更改">
          <IIcon name="dot" :size="8" />
        </span>
        <span v-if="saving" class="ws__saving">保存中…</span>
      </nav>

      <div class="ws__header-actions">
        <IPopover :open="headerMenuOpen" placement="bottom-end" :arrow="false" @update:open="headerMenuOpen = $event">
          <template #anchor>
            <IButton variant="ghost" icon="more" title="更多操作" aria-label="更多操作" @click="headerMenuOpen = !headerMenuOpen" />
          </template>
          <template #default="{ close }">
            <div class="menu" role="menu">
              <button type="button" class="menu__item" role="menuitem" @click="close(); openRename()">
                <IIcon name="edit" :size="13" /> 重命名
              </button>
              <button type="button" class="menu__item menu__item--danger" role="menuitem" @click="close(); deleteOpen = true">
                <IIcon name="trash" :size="13" /> 删除 Analysis
              </button>
            </div>
          </template>
        </IPopover>

        <ITooltip :content="mode === 'flowchart' ? '返回工作区' : '查看流程图'">
          <IButton
            :variant="mode === 'flowchart' ? 'secondary' : 'ghost'"
            icon="flowchart"
            :aria-pressed="mode === 'flowchart'"
            @click="toggleFlowchart"
          >
            Flowchart
          </IButton>
        </ITooltip>

        <IPopover :open="addDataOpen" placement="bottom-end" :arrow="true" @update:open="addDataOpen = $event">
          <template #anchor>
            <IButton variant="primary" icon="plus" @click="addDataOpen = !addDataOpen">Add data</IButton>
          </template>
          <template #default>
            <div class="menu menu--adddata" role="menu">
              <button type="button" class="menu__item" role="menuitem" @click="openCsvImport">
                <IIcon name="upload" :size="14" />
                <span>
                  <span class="menu__item-title">Import CSV</span>
                  <span class="menu__item-desc">上传 .csv 文件创建新表</span>
                </span>
              </button>
              <button type="button" class="menu__item" role="menuitem" @click="openCombine">
                <IIcon name="combine" :size="14" />
                <span>
                  <span class="menu__item-title">Combine tables</span>
                  <span class="menu__item-desc">Join / Append 现有表</span>
                </span>
              </button>
              <div class="menu__sep" role="separator" />
              <button type="button" class="menu__item" role="menuitem" disabled aria-disabled="true">
                <IIcon name="database" :size="14" />
                <span>
                  <span class="menu__item-title">From Registry</span>
                  <span class="menu__item-desc">后续版本</span>
                </span>
              </button>
              <button type="button" class="menu__item" role="menuitem" disabled aria-disabled="true">
                <IIcon name="plate" :size="14" />
                <span>
                  <span class="menu__item-title">From Plate</span>
                  <span class="menu__item-desc">后续版本</span>
                </span>
              </button>
            </div>
          </template>
        </IPopover>
      </div>
    </header>

    <div class="ws__body">
      <SidebarTree @add-data="addDataOpen = true" />
      <main class="ws__main">
        <KeepAlive>
          <component :is="modeComponent" :key="mode" @add-data="addDataOpen = true" />
        </KeepAlive>
      </main>
    </div>

    <!-- 重命名 -->
    <IModal :open="renameOpen" title="重命名 Analysis" :width="420" @update:open="renameOpen = $event">
      <ITextField v-model="renameName" autofocus @enter="submitRename" />
      <template #footer>
        <IButton @click="renameOpen = false">取消</IButton>
        <IButton variant="primary" :disabled="!renameName.trim()" @click="submitRename">保存</IButton>
      </template>
    </IModal>

    <!-- 删除确认 -->
    <IModal :open="deleteOpen" title="删除 Analysis" :width="420" @update:open="deleteOpen = $event">
      <p class="confirm-text">确定删除「{{ current?.name }}」吗？所有表、视图与图表配置都会被删除，此操作不可撤销。</p>
      <template #footer>
        <IButton @click="deleteOpen = false">取消</IButton>
        <IButton variant="danger" @click="confirmDelete">删除</IButton>
      </template>
    </IModal>

    <!-- CSV 导入 / 表合并 -->
    <CsvImportDialog :open="csvImportOpen" @update:open="csvImportOpen = $event" />
    <CombineTablesDialog :open="combineOpen" @update:open="combineOpen = $event" />

    <div v-if="loading" class="ws__loading">加载中…</div>
  </div>
</template>

<style scoped>
.ws {
  height: 100%;
  display: flex;
  flex-direction: column;
}
.ws__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  height: 52px;
  padding: 0 16px;
  background: var(--is-surface);
  border-bottom: 1px solid var(--is-border);
  flex-shrink: 0;
}
.ws__breadcrumb {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  font-size: var(--is-text-sm);
}
.ws__crumb-link {
  color: var(--is-text-secondary);
}
.ws__crumb-link:hover {
  color: var(--is-accent);
}
.ws__crumb-sep {
  color: var(--is-text-tertiary);
}
.ws__crumb-current {
  font-weight: 600;
  max-width: 320px;
}
.ws__dirty {
  color: var(--is-warning-text);
  display: inline-flex;
}
.ws__saving {
  font-size: var(--is-text-xs);
  color: var(--is-text-tertiary);
}
.ws__header-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}
.ws__body {
  flex: 1;
  min-height: 0;
  display: flex;
}
.ws__main {
  flex: 1;
  min-width: 0;
  min-height: 0;
}
.ws__loading {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--is-bg);
  color: var(--is-text-secondary);
  z-index: 10;
}

.menu {
  padding: 4px;
  display: flex;
  flex-direction: column;
  min-width: 180px;
}
.menu--adddata {
  width: 260px;
}
.menu__item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: var(--is-radius-sm);
  font-size: var(--is-text-sm);
  text-align: left;
  color: var(--is-text);
  transition: background-color var(--is-dur-fast) var(--is-ease);
}
.menu__item:hover:not(:disabled) {
  background: var(--is-surface-hover);
}
.menu__item:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.menu__item > span {
  display: flex;
  flex-direction: column;
}
.menu__item-title {
  font-size: var(--is-text-sm);
  font-weight: 500;
}
.menu__item-desc {
  font-size: var(--is-text-xs);
  color: var(--is-text-tertiary);
}
.menu__item--danger {
  color: var(--is-danger);
}
.menu__item--danger:hover {
  background: var(--is-danger-soft);
}
.menu__sep {
  height: 1px;
  background: var(--is-border);
  margin: 4px 6px;
}
.confirm-text {
  font-size: var(--is-text-sm);
  color: var(--is-text-secondary);
  line-height: 1.6;
}
</style>
```

## `src/modules/workspace/SidebarTree.vue`

```vue
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
                aria-label="在流程图中定位"
                title="在流程图中定位"
                @click.stop="showInFlowchart(t.id)"
              >
                <IIcon name="flowchart" :size="12" />
              </button>
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
```

## `src/modules/workspace/SidebarTreeNode.vue`

```vue
<script setup lang="ts">
import { computed, ref, type Directive } from 'vue'
import type { ViewNode, ViewType } from '../../shared/types'
import { IIcon, IPopover } from '../../ui'
import type { IconName } from '../../ui'

/** 局部 v-focus 指令：挂载即聚焦并全选。 */
const vFocus: Directive = {
  mounted(el: HTMLElement) {
    ;(el as HTMLInputElement).focus?.()
    ;(el as HTMLInputElement).select?.()
  },
}

/** 侧栏树中的单个视图节点（递归）。 */
const props = defineProps<{
  node: ViewNode
  tableId: string
  depth: number
  expanded: Set<string>
  selectedViewId?: string
  editingId?: string | null
  editingName?: string
  menuFor?: string | null
}>()

const emit = defineEmits<{
  (e: 'toggle', id: string): void
  (e: 'select', tableId: string, viewId: string): void
  (e: 'menu', id: string | null): void
  (e: 'rename', id: string, name: string): void
  (e: 'rename-start', id: string, name: string): void
  (e: 'rename-cancel'): void
  (e: 'delete', id: string, name: string): void
  (e: 'new-view', tableId: string, parentViewId: string): void
  (e: 'show-in-flowchart', tableId: string, viewId: string): void
}>()

const VIEW_ICON: Record<ViewType, IconName> = {
  table: 'table',
  bar: 'bar',
  line: 'line',
  scatter: 'scatter',
  box: 'box',
  pie: 'pie',
  heatmap: 'heatmap',
}

const isExpanded = computed(() => props.expanded.has(props.node.id))
const isSelected = computed(() => props.selectedViewId === props.node.id)
const isEditing = computed(() => props.editingId === props.node.id)

const draft = ref('')
function startRename() {
  draft.value = props.node.name
  emit('rename-start', props.node.id, props.node.name)
}
function commitRename() {
  emit('rename', props.node.id, draft.value)
}
</script>

<template>
  <div class="vnode">
    <div
      class="vnode__row"
      :class="{ 'vnode__row--selected': isSelected }"
      :style="{ paddingLeft: `${8 + depth * 14}px` }"
      role="treeitem"
      data-testid="sidebar-view"
      :data-name="node.name"
      :data-view-type="node.type"
      :aria-selected="isSelected"
      :aria-expanded="node.children.length ? isExpanded : undefined"
      :tabindex="0"
      @click="emit('select', tableId, node.id)"
      @keydown.enter="emit('select', tableId, node.id)"
    >
      <button
        v-if="node.children.length"
        type="button"
        class="vnode__chevron"
        :aria-label="isExpanded ? '收起' : '展开'"
        @click.stop="emit('toggle', node.id)"
      >
        <IIcon :name="isExpanded ? 'chevron-down' : 'chevron-right'" :size="12" />
      </button>
      <span v-else class="vnode__chevron vnode__chevron--empty" />
      <IIcon :name="VIEW_ICON[node.type]" :size="14" class="vnode__icon" />
      <input
        v-if="isEditing"
        v-model="draft"
        class="vnode__rename"
        type="text"
        :aria-label="'重命名 ' + node.name"
        @keydown.enter.prevent="commitRename"
        @keydown.esc.prevent="emit('rename-cancel')"
        @blur="commitRename"
        @click.stop
        v-focus
      />
      <span v-else class="vnode__name is-ellipsis" :title="node.name">{{ node.name }}</span>

      <span class="vnode__actions">
        <button
          type="button"
          class="vnode__action"
          aria-label="在流程图中定位"
          title="在流程图中定位"
          @click.stop="emit('show-in-flowchart', tableId, node.id)"
        >
          <IIcon name="flowchart" :size="12" />
        </button>
        <button
          type="button"
          class="vnode__action"
          aria-label="新建子视图"
          title="新建子视图"
          @click.stop="emit('new-view', tableId, node.id)"
        >
          <IIcon name="plus" :size="12" />
        </button>
        <IPopover :open="menuFor === node.id" placement="bottom-end" :arrow="false" @update:open="emit('menu', $event ? node.id : null)">
          <template #anchor>
            <button
              type="button"
              class="vnode__action"
              aria-label="更多操作"
              @click.stop="emit('menu', menuFor === node.id ? null : node.id)"
            >
              <IIcon name="more" :size="13" />
            </button>
          </template>
          <template #default="{ close }">
            <div class="vnode__menu" role="menu">
              <button type="button" class="vnode__menu-item" role="menuitem" @click.stop="close(); emit('show-in-flowchart', tableId, node.id)">
                <IIcon name="flowchart" :size="13" /> 在流程图中显示
              </button>
              <button type="button" class="vnode__menu-item" role="menuitem" @click.stop="close(); startRename()">
                <IIcon name="edit" :size="13" /> 重命名
              </button>
              <button type="button" class="vnode__menu-item" role="menuitem" @click.stop="close(); emit('new-view', tableId, node.id)">
                <IIcon name="plus" :size="13" /> 新建子视图
              </button>
              <button type="button" class="vnode__menu-item vnode__menu-item--danger" role="menuitem" @click.stop="close(); emit('delete', node.id, node.name)">
                <IIcon name="trash" :size="13" /> 删除
              </button>
            </div>
          </template>
        </IPopover>
      </span>
    </div>

    <div v-if="isExpanded && node.children.length" role="group">
      <SidebarTreeNode
        v-for="child in node.children"
        :key="child.id"
        :node="child"
        :table-id="tableId"
        :depth="depth + 1"
        :expanded="expanded"
        :selected-view-id="selectedViewId"
        :editing-id="editingId"
        :menu-for="menuFor"
        @toggle="emit('toggle', $event)"
        @select="(t: string, v: string) => emit('select', t, v)"
        @menu="emit('menu', $event)"
        @rename="(id: string, name: string) => emit('rename', id, name)"
        @rename-start="(id: string, name: string) => emit('rename-start', id, name)"
        @rename-cancel="emit('rename-cancel')"
        @delete="(id: string, name: string) => emit('delete', id, name)"
        @new-view="(t: string, p: string) => emit('new-view', t, p)"
        @show-in-flowchart="(t: string, v: string) => emit('show-in-flowchart', t, v)"
      />
    </div>
  </div>
</template>

<script lang="ts">
// 组件递归自引用依赖文件名 SidebarTreeNode.vue，无需额外声明。
</script>

<style scoped>
.vnode__row {
  position: relative;
  display: flex;
  align-items: center;
  gap: 4px;
  height: 28px;
  padding-right: 4px;
  border-radius: var(--is-radius-sm);
  cursor: pointer;
  transition: background-color var(--is-dur-fast) var(--is-ease);
}
.vnode__row:hover {
  background: var(--is-surface-hover);
}
.vnode__row--selected,
.vnode__row--selected:hover {
  background: var(--is-accent-soft);
}
.vnode__row--selected .vnode__name {
  color: var(--is-accent);
  font-weight: 500;
}
.vnode__chevron {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  color: var(--is-text-tertiary);
  flex-shrink: 0;
  border-radius: 3px;
}
.vnode__chevron--empty {
  width: 16px;
}
.vnode__icon {
  color: var(--is-text-secondary);
  flex-shrink: 0;
}
.vnode__name {
  flex: 1;
  min-width: 0;
  font-size: var(--is-text-sm);
}
.vnode__rename {
  flex: 1;
  min-width: 0;
  height: 22px;
  border: 1px solid var(--is-accent);
  border-radius: 4px;
  padding: 0 6px;
  font-size: var(--is-text-sm);
  outline: none;
}
.vnode__actions {
  display: none;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}
.vnode__row:hover .vnode__actions,
.vnode__row:focus-within .vnode__actions {
  display: inline-flex;
}
.vnode__action {
  display: inline-flex;
  padding: 3px;
  border-radius: 4px;
  color: var(--is-text-tertiary);
}
.vnode__action:hover {
  background: rgba(16, 24, 40, 0.08);
  color: var(--is-text);
}
.vnode__menu {
  padding: 4px;
  display: flex;
  flex-direction: column;
  min-width: 140px;
}
.vnode__menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  border-radius: var(--is-radius-sm);
  font-size: var(--is-text-sm);
  text-align: left;
  color: var(--is-text);
}
.vnode__menu-item:hover {
  background: var(--is-surface-hover);
}
.vnode__menu-item--danger {
  color: var(--is-danger);
}
.vnode__menu-item--danger:hover {
  background: var(--is-danger-soft);
}
</style>
```
