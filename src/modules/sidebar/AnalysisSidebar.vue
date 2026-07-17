<template>
  <aside class="sidebar" :style="{ width: `${width}px` }" aria-label="Analysis 侧栏">
    <input
      ref="searchRef"
      v-model="q"
      type="search"
      class="search"
      placeholder="搜索表 / 视图"
      aria-label="搜索表或视图"
      aria-controls="sidebar-tree"
      autocomplete="off"
      @keydown="onSearchKeydown"
    />
    <p class="sr-only" role="status" aria-live="polite">{{ searchStatus }}</p>
    <div class="section-head">
      <span id="analysis-data-heading">ANALYSIS DATA</span>
      <div class="menu-anchor" ref="addRoot">
        <button
          type="button"
          class="icon-btn"
          aria-label="添加数据"
          aria-haspopup="menu"
          :aria-expanded="addOpen"
          aria-controls="sidebar-add-data-menu"
          @click="toggleAdd"
          @keydown="onAddTriggerKey"
        >
          +
        </button>
        <ul
          v-if="addOpen"
          id="sidebar-add-data-menu"
          class="native-menu"
          role="menu"
          aria-label="添加数据"
          @keydown="onAddMenuKey"
        >
          <li
            v-for="(item, i) in addItems"
            :key="item.cmd"
            role="menuitem"
            :tabindex="addActive === i ? 0 : -1"
            :aria-disabled="item.disabled || undefined"
            :class="{ 'is-disabled': item.disabled, 'is-active': addActive === i }"
            @click="!item.disabled && pickAdd(item.cmd)"
          >
            {{ item.label }}
          </li>
        </ul>
      </div>
    </div>

    <nav class="tree-nav" aria-labelledby="analysis-data-heading">
      <ul
        id="sidebar-tree"
        class="sidebar-tree"
        role="tree"
        aria-label="表与视图树"
      >
        <li
          v-for="(node, index) in flatNodes"
          :key="node.id"
          class="tree-node"
          role="none"
          :style="{ '--tree-depth': node.depth }"
        >
          <div
            class="tree-node-content"
            role="treeitem"
            :aria-selected="store.selectedNodeId === node.id"
            :aria-level="node.depth + 1"
            :aria-label="`${node.kind === 'table' ? '表' : '视图'} ${node.label}`"
            :class="{ 'is-current': store.selectedNodeId === node.id }"
            :tabindex="treeItemTabIndex(index, treeFocusIndex)"
            :data-tree-index="index"
            @click="onTreeActivate(node, index)"
            @focus="treeFocusIndex = index"
            @keydown="(e) => onTreeItemKeydown(e, node, index)"
          >
            <span class="label">{{ node.label }}</span>
            <span class="ops" @click.stop>
              <div class="menu-anchor" :ref="(el) => setOpsRoot(node.id, el)">
                <button
                  type="button"
                  class="icon-btn ops-btn"
                  :aria-label="`${node.label} 更多操作`"
                  aria-haspopup="menu"
                  :aria-expanded="opsOpenId === node.id"
                  :aria-controls="opsOpenId === node.id ? `node-ops-menu-${node.id}` : undefined"
                  tabindex="-1"
                  @click="toggleOps(node)"
                  @keydown="(e) => onOpsTriggerKey(e, node, index)"
                >
                  ⋯
                </button>
                <ul
                  v-if="opsOpenId === node.id"
                  :id="`node-ops-menu-${node.id}`"
                  class="native-menu native-menu-end"
                  role="menu"
                  :aria-label="`${node.label} 更多操作`"
                  @keydown="onOpsMenuKey"
                >
                  <li
                    v-for="(item, i) in opsItemsFor(node)"
                    :key="item.cmd"
                    role="menuitem"
                    :tabindex="opsActive === i ? 0 : -1"
                    :class="{
                      'is-active': opsActive === i,
                      'is-danger': item.cmd === 'delete',
                      'has-divider': item.cmd === 'delete',
                    }"
                    @click="pickOps(item.cmd, node)"
                  >
                    {{ item.label }}
                  </li>
                </ul>
              </div>
            </span>
          </div>
        </li>
      </ul>
      <div
        v-if="emptyKind"
        class="tree-empty"
        v-bind="sidebarEmptyRegionAttrs()"
      >
        <strong class="tree-empty__title">{{ emptyCopy.title }}</strong>
        <p class="tree-empty__body">{{ emptyCopy.body }}</p>
        <div class="tree-empty__cta">
          <template v-if="emptyKind === 'no-data'">
            <button
              type="button"
              class="btn btn-primary empty-cta"
              :aria-label="sidebarEmptyCtaAria('csv')"
              @click="emit('add-data', 'csv')"
            >
              导入 CSV
            </button>
            <button
              type="button"
              class="btn empty-cta"
              :aria-label="sidebarEmptyCtaAria('combine')"
              @click="emit('add-data', 'combine')"
            >
              合并表
            </button>
          </template>
          <button
            v-else
            type="button"
            class="btn empty-cta"
            :aria-label="sidebarEmptyCtaAria('clear')"
            @click="clearSearch"
          >
            清除搜索
          </button>
        </div>
      </div>
    </nav>

    <div class="footer">
      <button type="button" class="ext-btn" @click="toast('info', 'Connect with external tool：后续版本')">
        Connect with external tool
      </button>
    </div>

    <div
      v-if="showNewView"
      class="dialog-root"
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-view-title"
      @keydown.esc="closeNewView"
      @keydown="onNewViewTrapKeydown"
    >
      <button type="button" class="dialog-backdrop" tabindex="-1" aria-label="关闭对话框" @click="closeNewView" />
      <div class="dialog-panel" ref="newViewPanelRef">
        <header class="dialog-header">
          <h2 id="new-view-title">新建视图</h2>
          <button type="button" class="icon-close" aria-label="关闭" @click="closeNewView">×</button>
        </header>
        <form class="dialog-body" @submit.prevent="createView">
          <label class="field">
            <span class="field-label">名称</span>
            <input
              ref="newViewNameRef"
              v-model="newViewName"
              type="text"
              required
              autocomplete="off"
              aria-label="视图名称"
            />
          </label>
          <label class="field">
            <span class="field-label">View Type</span>
            <select v-model="newViewType" aria-label="View Type" required>
              <option v-for="t in viewTypes" :key="t" :value="t">{{ t }}</option>
            </select>
          </label>
          <footer class="dialog-footer">
            <button type="button" class="btn" @click="closeNewView">取消</button>
            <button type="submit" class="btn btn-primary">创建</button>
          </footer>
        </form>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch, type ComponentPublicInstance } from 'vue'
import { confirm, isFeedbackCancel, prompt, toast } from '@/shared/ui/feedback'
import { dangerDeleteOptions } from '@/shared/ui/dangerConfirm'
import { enabledMenuIndices, handleMenuKeydown } from '@/shared/ui/menuNav'
import { useAnalysisStore } from '@/modules/analysis/stores/analysisStore'
import type { ViewType } from '@/shared/types/analysis'
import {
  filterSidebarTree,
  flattenSidebarTree,
  type SidebarTreeNode,
} from '@/modules/sidebar/sidebarTree'
import {
  clampTreeFocusIndex,
  nextSearchClearedStatus,
  nextTreeIndex,
  prevTreeIndex,
  resolveSearchKeyAction,
  resolveTreeKeyAction,
  treeItemTabIndex,
} from '@/modules/sidebar/treeNav'
import {
  sidebarEmptyCopy,
  sidebarEmptyCtaAria,
  sidebarEmptyKind,
  sidebarEmptyRegionAttrs,
} from '@/modules/sidebar/sidebarEmpty'
import {
  newViewDialogDefaults,
  resolveNewViewRestoreFocus,
} from '@/modules/sidebar/newViewHandoff'

const emit = defineEmits<{ 'add-data': [string]; 'jump-flowchart': [string] }>()
withDefaults(
  defineProps<{ width?: number }>(),
  { width: 280 },
)
const store = useAnalysisStore()
const q = ref('')
const searchRef = ref<HTMLInputElement | null>(null)
const searchStatus = ref('')
const showNewView = ref(false)
const newViewName = ref('New view')
const newViewType = ref<ViewType>('table')
const newViewParent = ref<{ tableId: string; parentId: string } | null>(null)
const newViewNameRef = ref<HTMLInputElement | null>(null)
const newViewPanelRef = ref<HTMLElement | null>(null)
let newViewRestoreFocus: HTMLElement | null = null
let pendingRestoreFocus: HTMLElement | null = null
const viewTypes: ViewType[] = ['table', 'bar', 'line', 'scatter', 'box', 'pie', 'heatmap']

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'

const addItems = [
  { cmd: 'csv', label: 'From CSV', disabled: false },
  { cmd: 'combine', label: 'By combining tables', disabled: false },
  { cmd: 'registry', label: 'From Registry（暂未实现）', disabled: true },
  { cmd: 'plate', label: 'From Plate（暂未实现）', disabled: true },
] as const

const addRoot = ref<HTMLElement | null>(null)
const addOpen = ref(false)
const addActive = ref<number | null>(null)

const opsRoots = new Map<string, HTMLElement>()
const opsOpenId = ref<string | null>(null)
const opsActive = ref<number | null>(null)
const opsNode = ref<SidebarTreeNode | null>(null)

type OpsItem = { cmd: string; label: string; disabled?: boolean }

const rawTree = computed((): SidebarTreeNode[] => {
  const a = store.current
  if (!a) return []
  const mapViews = (views: typeof a.tables[0]['views'], tableId: string): SidebarTreeNode[] =>
    views.map((v) => ({
      id: v.id,
      label: `${v.name} (${v.viewType})`,
      kind: 'view' as const,
      tableId,
      children: mapViews(v.children, tableId),
    }))

  return a.tables.map((t) => ({
    id: t.id,
    label: t.name,
    kind: 'table' as const,
    tableId: t.id,
    children: mapViews(t.views, t.id),
  }))
})

const treeData = computed(() => filterSidebarTree(rawTree.value, q.value))
const flatNodes = computed(() => flattenSidebarTree(treeData.value))
const treeFocusIndex = ref<number | null>(null)
const emptyKind = computed(() =>
  sidebarEmptyKind({
    tableCount: store.current?.tables.length ?? 0,
    query: q.value,
    visibleCount: flatNodes.value.length,
  }),
)
const emptyCopy = computed(() =>
  emptyKind.value ? sidebarEmptyCopy(emptyKind.value) : { title: '', body: '' },
)

watch(
  flatNodes,
  (nodes) => {
    treeFocusIndex.value = clampTreeFocusIndex(nodes.length, treeFocusIndex.value)
  },
  { immediate: true },
)

watch(
  () => store.selectedNodeId,
  (id) => {
    if (!id) return
    const idx = flatNodes.value.findIndex((n) => n.id === id)
    if (idx >= 0) treeFocusIndex.value = idx
  },
)

onMounted(() => {
  document.addEventListener('pointerdown', onDocPointer, true)
})

onUnmounted(() => {
  document.removeEventListener('pointerdown', onDocPointer, true)
})

watch(showNewView, (open) => {
  if (open) {
    newViewRestoreFocus = resolveNewViewRestoreFocus(pendingRestoreFocus)
    pendingRestoreFocus = null
    document.body.style.overflow = 'hidden'
    void nextTick(() => newViewNameRef.value?.focus())
  } else {
    document.body.style.overflow = ''
    const el = newViewRestoreFocus
    newViewRestoreFocus = null
    if (el && document.contains(el)) void nextTick(() => el.focus())
  }
})

function setOpsRoot(id: string, el: Element | ComponentPublicInstance | null) {
  if (!el) {
    opsRoots.delete(id)
    return
  }
  const node = el instanceof HTMLElement ? el : ((el as ComponentPublicInstance).$el as HTMLElement | undefined)
  if (node) opsRoots.set(id, node)
}

function opsItemsFor(data: SidebarTreeNode): OpsItem[] {
  const items: OpsItem[] = [
    { cmd: 'new-view', label: 'New view' },
    { cmd: 'rename', label: '重命名' },
    { cmd: 'jump', label: '跳转到流程图' },
  ]
  if (data.kind === 'view') items.push({ cmd: 'promote', label: '提升为表' })
  items.push({ cmd: 'delete', label: '删除' })
  return items
}

function focusMenuItem(root: HTMLElement | null | undefined, index: number | null) {
  void nextTick(() => {
    if (!root || index === null) return
    const menu = root.querySelector('[role="menu"]')
    if (!menu) return
    const nodes = menu.querySelectorAll<HTMLElement>('[role="menuitem"]')
    nodes[index]?.focus()
  })
}

function focusAddTrigger() {
  void nextTick(() => {
    addRoot.value?.querySelector<HTMLElement>('.icon-btn')?.focus()
  })
}

function focusOpsTrigger(id: string | null) {
  if (!id) return
  void nextTick(() => {
    opsRoots.get(id)?.querySelector<HTMLElement>('.ops-btn')?.focus()
  })
}

function closeAdd(opts?: { restoreFocus?: boolean }) {
  const wasOpen = addOpen.value
  addOpen.value = false
  addActive.value = null
  if (wasOpen && opts?.restoreFocus !== false) focusAddTrigger()
}

function openAdd() {
  closeOps({ restoreFocus: false })
  // Intent-warm dialogs owned by workspace (CSV / Combine).
  void import('@/modules/table/CsvImportDialog.vue')
  void import('@/modules/table/CombineTablesDialog.vue')
  addOpen.value = true
  addActive.value = enabledMenuIndices(addItems)[0] ?? null
  focusMenuItem(addRoot.value, addActive.value)
}

function toggleAdd() {
  if (addOpen.value) closeAdd()
  else openAdd()
}

function pickAdd(cmd: string) {
  closeAdd({ restoreFocus: false })
  emit('add-data', cmd)
}

function onAddTriggerKey(e: KeyboardEvent) {
  if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
    if (!addOpen.value) {
      e.preventDefault()
      openAdd()
    }
  } else if (e.key === 'Escape' && addOpen.value) {
    e.preventDefault()
    closeAdd()
  }
}

function onAddMenuKey(e: KeyboardEvent) {
  handleMenuKeydown(e, addItems, {
    getActiveIndex: () => addActive.value,
    setActiveIndex: (i) => {
      addActive.value = i
      focusMenuItem(addRoot.value, i)
    },
    onActivate: (i) => {
      const item = addItems[i]
      if (item && !item.disabled) pickAdd(item.cmd)
    },
    onClose: () => closeAdd(),
  })
}

function closeOps(opts?: { restoreFocus?: boolean }) {
  const id = opsOpenId.value
  const wasOpen = !!id
  opsOpenId.value = null
  opsActive.value = null
  opsNode.value = null
  if (wasOpen && opts?.restoreFocus !== false) focusOpsTrigger(id)
}

function openOps(data: SidebarTreeNode) {
  closeAdd({ restoreFocus: false })
  opsNode.value = data
  opsOpenId.value = data.id
  const items = opsItemsFor(data)
  opsActive.value = enabledMenuIndices(items)[0] ?? null
  focusMenuItem(opsRoots.get(data.id), opsActive.value)
}

function toggleOps(data: SidebarTreeNode) {
  if (opsOpenId.value === data.id) closeOps()
  else openOps(data)
}

function pickOps(cmd: string, data: SidebarTreeNode) {
  closeOps({ restoreFocus: false })
  onMenu(cmd, data)
}

function onOpsTriggerKey(e: KeyboardEvent, data: SidebarTreeNode, index: number) {
  if (e.key === 'ArrowLeft' || e.key === 'Escape') {
    e.preventDefault()
    e.stopPropagation()
    if (opsOpenId.value === data.id) closeOps({ restoreFocus: false })
    focusTreeItem(index)
    return
  }
  if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
    if (opsOpenId.value !== data.id) {
      e.preventDefault()
      openOps(data)
    }
  }
}

function onSearchKeydown(e: KeyboardEvent) {
  const action = resolveSearchKeyAction(e.key, Boolean(q.value))
  if (!action) return
  e.preventDefault()
  if (action === 'clear') {
    q.value = ''
    // Announce after clear so the live region reflects the unfiltered tree;
    // skip when the message would duplicate the previous live status.
    void nextTick(() => {
      const next = nextSearchClearedStatus(searchStatus.value, flatNodes.value.length)
      if (next !== null) searchStatus.value = next
    })
    return
  }
  // enter-tree: move focus to first (or current) visible tree item
  const count = flatNodes.value.length
  if (!count) return
  const target = clampTreeFocusIndex(count, treeFocusIndex.value) ?? 0
  focusTreeItem(target)
}

function focusSearch() {
  void nextTick(() => {
    searchRef.value?.focus()
  })
}

function focusTreeItem(index: number | null) {
  if (index === null) return
  treeFocusIndex.value = index
  void nextTick(() => {
    const el = document.querySelector<HTMLElement>(
      `#sidebar-tree [data-tree-index="${index}"]`,
    )
    el?.focus()
  })
}

function onTreeActivate(data: SidebarTreeNode, index: number) {
  treeFocusIndex.value = index
  store.selectNode(data.id, 'workspace')
}

function onTreeItemKeydown(e: KeyboardEvent, data: SidebarTreeNode, index: number) {
  const action = resolveTreeKeyAction(e.key, index)
  if (!action) return

  const count = flatNodes.value.length
  if (!count) return

  if (action === 'leave-to-search') {
    e.preventDefault()
    e.stopPropagation()
    focusSearch()
    return
  }

  if (action === 'ops') {
    e.preventDefault()
    e.stopPropagation()
    treeFocusIndex.value = index
    void nextTick(() => {
      opsRoots.get(data.id)?.querySelector<HTMLElement>('.ops-btn')?.focus()
    })
    return
  }

  if (action === 'leave-ops') {
    // Already on the treeitem; ignore Left so ops-only leave path stays on the button.
    return
  }

  e.preventDefault()
  e.stopPropagation()

  if (action === 'activate') {
    onTreeActivate(data, index)
    return
  }

  let next: number | null = index
  if (action === 'next') next = nextTreeIndex(count, index)
  else if (action === 'prev') next = prevTreeIndex(count, index)
  else if (action === 'first') next = 0
  else if (action === 'last') next = count - 1

  if (next !== null) focusTreeItem(next)
}

function onOpsMenuKey(e: KeyboardEvent) {
  const data = opsNode.value
  if (!data) return
  const items = opsItemsFor(data)
  handleMenuKeydown(e, items, {
    getActiveIndex: () => opsActive.value,
    setActiveIndex: (i) => {
      opsActive.value = i
      focusMenuItem(opsRoots.get(data.id), i)
    },
    onActivate: (i) => {
      const item = items[i]
      if (item) pickOps(item.cmd, data)
    },
    onClose: () => closeOps(),
  })
}

function onDocPointer(e: PointerEvent) {
  const t = e.target as Node
  if (addOpen.value) {
    const root = addRoot.value
    if (root && !root.contains(t)) closeAdd({ restoreFocus: false })
  }
  if (opsOpenId.value) {
    const root = opsRoots.get(opsOpenId.value)
    if (root && !root.contains(t)) closeOps({ restoreFocus: false })
  }
}

function clearSearch() {
  q.value = ''
  void nextTick(() => {
    const next = nextSearchClearedStatus(searchStatus.value, flatNodes.value.length)
    if (next !== null) searchStatus.value = next
    focusSearch()
  })
}

function openNewViewDialog(opts: {
  tableId: string
  parentId: string
  restoreFocus?: HTMLElement | null
}) {
  const defaults = newViewDialogDefaults({ tableId: opts.tableId, parentId: opts.parentId })
  newViewParent.value = { tableId: defaults.tableId, parentId: defaults.parentId }
  newViewName.value = defaults.name
  newViewType.value = defaults.viewType
  pendingRestoreFocus = opts.restoreFocus ?? null
  showNewView.value = true
}

defineExpose({ openNewViewDialog })

function onMenu(cmd: string, data: SidebarTreeNode) {
  if (cmd === 'new-view') {
    openNewViewDialog({ tableId: data.tableId, parentId: data.id })
  } else if (cmd === 'rename') {
    void prompt('新名称', '重命名', { inputValue: data.label.replace(/ \(.*\)$/, '') })
      .then(({ value }) => {
        if (value) store.renameNode(data.id, value)
      })
      .catch((err) => {
        if (!isFeedbackCancel(err)) throw err
      })
  } else if (cmd === 'jump') {
    emit('jump-flowchart', data.id)
  } else if (cmd === 'promote') {
    store.selectNode(data.id, 'workspace')
    store.promoteViewToTable(data.id)
    toast('success', '已提升为 Analysis 表')
  } else if (cmd === 'delete') {
    void confirm(
      '确定删除？子视图将一并删除。此操作不可撤销。',
      '删除节点',
      dangerDeleteOptions('删除'),
    )
      .then(() => {
        const r = store.deleteNode(data.id)
        if (!r.ok) toast('error', r.reason || '删除失败')
        else toast('success', '已删除')
      })
      .catch((err) => {
        if (!isFeedbackCancel(err)) throw err
      })
  }
}

function closeNewView() {
  showNewView.value = false
}

function newViewFocusables(): HTMLElement[] {
  const root = newViewPanelRef.value
  if (!root) return []
  return [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
    (el) => !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true',
  )
}

function onNewViewTrapKeydown(e: KeyboardEvent) {
  if (e.key !== 'Tab') return
  const list = newViewFocusables()
  if (list.length < 2) return
  const first = list[0]
  const last = list[list.length - 1]
  const active = document.activeElement as HTMLElement | null
  if (e.shiftKey) {
    if (active === first || !list.includes(active as HTMLElement)) {
      e.preventDefault()
      last.focus()
    }
  } else if (active === last || !list.includes(active as HTMLElement)) {
    e.preventDefault()
    first.focus()
  }
}

function createView() {
  if (!newViewParent.value) return
  const name = newViewName.value.trim()
  if (!name) return
  store.addView(
    newViewParent.value.tableId,
    newViewParent.value.parentId,
    name,
    newViewType.value,
  )
  showNewView.value = false
}
</script>

<style scoped>
.sidebar {
  width: 280px;
  flex: 0 0 auto;
  background: var(--ia-sidebar);
  border-right: none;
  display: flex;
  flex-direction: column;
  padding: 10px;
  min-width: 0;
}
.search {
  width: 100%;
  height: 32px;
  margin-bottom: 8px;
  padding: 0 10px;
  border: 1px solid var(--ia-border);
  border-radius: 6px;
  background: #fff;
  color: inherit;
  font: inherit;
  font-size: 13px;
  box-sizing: border-box;
}
.search:focus-visible {
  outline: 2px solid var(--ia-accent);
  outline-offset: 1px;
  border-color: var(--ia-accent);
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
.tree-nav {
  flex: 1;
  min-height: 0;
  overflow: auto;
}
.sidebar-tree {
  list-style: none;
  margin: 0;
  padding: 0;
}
.tree-node-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  min-height: 32px;
  padding: 2px 4px 2px calc(8px + var(--tree-depth, 0) * 16px);
  border-radius: 4px;
  cursor: pointer;
  box-sizing: border-box;
}
.tree-node-content:hover {
  background: #f2f3f5;
}
.tree-node-content.is-current {
  background: var(--ia-accent-soft);
  color: var(--ia-accent);
}
.tree-node-content:focus-visible {
  outline: 2px solid var(--ia-accent);
  outline-offset: -1px;
}
.tree-empty {
  margin: 8px 4px;
  padding: 10px 8px;
  font-size: 12px;
  color: #8f959e;
  border-radius: 6px;
  background: #f7f8fa;
}
.tree-empty:focus-visible {
  outline: 2px solid var(--ia-accent);
  outline-offset: 2px;
}
.tree-empty__title {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #1f2329;
  margin-bottom: 4px;
}
.tree-empty__body {
  margin: 0 0 10px;
  line-height: 1.45;
}
.tree-empty__cta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.tree-empty .btn {
  height: 32px;
  padding: 0 12px;
  border: 1px solid var(--ia-border);
  border-radius: 6px;
  background: #fff;
  color: #1f2329;
  cursor: pointer;
  font: inherit;
  font-size: 12px;
}
.tree-empty .btn:hover {
  border-color: var(--ia-accent);
  color: var(--ia-accent);
}
.tree-empty .btn-primary {
  background: var(--ia-accent);
  border-color: var(--ia-accent);
  color: #fff;
}
.tree-empty .btn-primary:hover {
  filter: brightness(1.05);
  color: #fff;
}
.section-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  font-weight: 600;
  color: #646a73;
  margin-bottom: 6px;
}
.label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  font-size: 13px;
}
.menu-anchor {
  position: relative;
}
.icon-btn {
  min-width: 28px;
  height: 28px;
  padding: 0 6px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: #646a73;
  font: inherit;
  font-size: 16px;
  font-weight: 700;
  line-height: 1;
  cursor: pointer;
}
.icon-btn:hover {
  background: var(--ia-accent-soft);
  color: var(--ia-accent);
}
.icon-btn:focus-visible {
  outline: 2px solid var(--ia-accent);
  outline-offset: 1px;
}
.ops-btn {
  color: var(--ia-accent);
}
.native-menu {
  position: absolute;
  left: 0;
  top: calc(100% + 4px);
  z-index: 30;
  min-width: 200px;
  margin: 0;
  padding: 6px 0;
  list-style: none;
  background: #fff;
  border: 1px solid var(--ia-border);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.12);
}
.native-menu-end {
  left: auto;
  right: 0;
}
.native-menu li {
  padding: 8px 14px;
  font-size: 13px;
  cursor: pointer;
  color: #1f2329;
}
.native-menu li:hover:not(.is-disabled),
.native-menu li.is-active:not(.is-disabled),
.native-menu li:focus-visible:not(.is-disabled) {
  background: var(--ia-accent-soft);
  color: var(--ia-accent);
  outline: none;
}
.native-menu li.is-disabled {
  color: #c0c4cc;
  cursor: not-allowed;
}
.native-menu li.has-divider {
  margin-top: 4px;
  border-top: 1px solid var(--ia-border);
  padding-top: 10px;
}
.native-menu li.is-danger:hover,
.native-menu li.is-danger.is-active,
.native-menu li.is-danger:focus-visible {
  background: #fef0f0;
  color: #c45656;
}
.footer {
  margin-top: auto;
  padding-top: 10px;
}
.ext-btn {
  width: 100%;
  height: 32px;
  border: 1px solid var(--ia-border);
  border-radius: 6px;
  background: #fff;
  color: #1f2329;
  font: inherit;
  font-size: 13px;
  cursor: pointer;
}
.ext-btn:hover {
  border-color: var(--ia-accent);
  color: var(--ia-accent);
}
.ext-btn:focus-visible {
  outline: 2px solid var(--ia-accent);
  outline-offset: 1px;
}
.dialog-root {
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}
.dialog-backdrop {
  position: absolute;
  inset: 0;
  border: none;
  padding: 0;
  margin: 0;
  background: rgba(15, 23, 42, 0.45);
  cursor: pointer;
}
.dialog-panel {
  position: relative;
  z-index: 1;
  width: min(400px, 100%);
  background: #fff;
  border-radius: 10px;
  border: 1px solid var(--ia-border);
  box-shadow: 0 12px 40px rgba(15, 23, 42, 0.18);
}
.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 18px 8px;
}
.dialog-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}
.icon-close {
  border: none;
  background: transparent;
  font-size: 22px;
  line-height: 1;
  color: #8f959e;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
}
.icon-close:hover {
  color: #1f2329;
  background: #f2f3f5;
}
.dialog-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 8px 18px 18px;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.field-label {
  font-size: 13px;
  color: #646a73;
}
.field input,
.field select {
  height: 36px;
  padding: 0 10px;
  border: 1px solid var(--ia-border);
  border-radius: 6px;
  background: #fff;
  color: inherit;
  font: inherit;
}
.field input:focus-visible,
.field select:focus-visible {
  outline: 2px solid var(--ia-accent);
  outline-offset: 1px;
  border-color: var(--ia-accent);
}
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 4px;
}
.btn {
  height: 32px;
  padding: 0 14px;
  border: 1px solid var(--ia-border);
  border-radius: 6px;
  background: #fff;
  color: #1f2329;
  cursor: pointer;
  font: inherit;
}
.btn:hover {
  border-color: var(--ia-accent);
  color: var(--ia-accent);
}
.btn-primary {
  background: var(--ia-accent);
  border-color: var(--ia-accent);
  color: #fff;
}
.btn-primary:hover {
  filter: brightness(1.05);
  color: #fff;
}
</style>
