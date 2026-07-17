<template>
  <aside class="sidebar" :style="{ width: `${width}px` }" aria-label="Analysis 侧栏">
    <el-input
      v-model="q"
      placeholder="搜索表 / 视图"
      clearable
      size="small"
      class="search"
      aria-label="搜索表或视图"
    />
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
      <el-tree
        :data="treeData"
        node-key="id"
        default-expand-all
        highlight-current
        :expand-on-click-node="false"
        :current-node-key="store.selectedNodeId || undefined"
        aria-label="表与视图树"
        @node-click="onClick"
      >
        <template #default="{ data }">
          <div class="node" :aria-label="`${data.kind === 'table' ? '表' : '视图'} ${data.label}`">
            <span class="label">{{ data.label }}</span>
            <span class="ops" @click.stop>
              <div class="menu-anchor" :ref="(el) => setOpsRoot(data.id, el)">
                <button
                  type="button"
                  class="icon-btn ops-btn"
                  :aria-label="`${data.label} 更多操作`"
                  aria-haspopup="menu"
                  :aria-expanded="opsOpenId === data.id"
                  :aria-controls="opsOpenId === data.id ? `node-ops-menu-${data.id}` : undefined"
                  @click="toggleOps(data)"
                  @keydown="(e) => onOpsTriggerKey(e, data)"
                >
                  ⋯
                </button>
                <ul
                  v-if="opsOpenId === data.id"
                  :id="`node-ops-menu-${data.id}`"
                  class="native-menu native-menu-end"
                  role="menu"
                  :aria-label="`${data.label} 更多操作`"
                  @keydown="onOpsMenuKey"
                >
                  <li
                    v-for="(item, i) in opsItemsFor(data)"
                    :key="item.cmd"
                    role="menuitem"
                    :tabindex="opsActive === i ? 0 : -1"
                    :class="{
                      'is-active': opsActive === i,
                      'is-danger': item.cmd === 'delete',
                      'has-divider': item.cmd === 'delete',
                    }"
                    @click="pickOps(item.cmd, data)"
                  >
                    {{ item.label }}
                  </li>
                </ul>
              </div>
            </span>
          </div>
        </template>
      </el-tree>
    </nav>

    <div class="footer">
      <el-button class="ext" @click="toast('info', 'Connect with external tool：后续版本')">
        Connect with external tool
      </el-button>
    </div>

    <el-dialog v-model="showNewView" title="新建视图" width="400px">
      <el-form label-width="90px">
        <el-form-item label="名称">
          <el-input v-model="newViewName" />
        </el-form-item>
        <el-form-item label="View Type">
          <el-select v-model="newViewType" style="width: 100%">
            <el-option v-for="t in viewTypes" :key="t" :label="t" :value="t" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showNewView = false">取消</el-button>
        <el-button type="primary" @click="createView">创建</el-button>
      </template>
    </el-dialog>
  </aside>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, type ComponentPublicInstance } from 'vue'
import { confirm, prompt, toast } from '@/shared/ui/feedback'
import { enabledMenuIndices, handleMenuKeydown } from '@/shared/ui/menuNav'
import { useAnalysisStore } from '@/modules/analysis/stores/analysisStore'
import type { ViewType } from '@/shared/types/analysis'

const emit = defineEmits<{ 'add-data': [string]; 'jump-flowchart': [string] }>()
withDefaults(
  defineProps<{ width?: number }>(),
  { width: 280 },
)
const store = useAnalysisStore()
const q = ref('')
const showNewView = ref(false)
const newViewName = ref('New view')
const newViewType = ref<ViewType>('table')
const newViewParent = ref<{ tableId: string; parentId: string } | null>(null)
const viewTypes: ViewType[] = ['table', 'bar', 'line', 'scatter', 'box', 'pie', 'heatmap']

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
const opsNode = ref<TreeNode | null>(null)

type TreeNode = {
  id: string
  label: string
  kind: 'table' | 'view'
  tableId: string
  children?: TreeNode[]
}

type OpsItem = { cmd: string; label: string; disabled?: boolean }

const treeData = computed(() => {
  const a = store.current
  if (!a) return []
  const match = (s: string) => !q.value || s.toLowerCase().includes(q.value.toLowerCase())
  const mapViews = (views: typeof a.tables[0]['views'], tableId: string): TreeNode[] =>
    views
      .map((v) => ({
        id: v.id,
        label: `${v.name} (${v.viewType})`,
        kind: 'view' as const,
        tableId,
        children: mapViews(v.children, tableId),
      }))
      .filter((n) => match(n.label) || (n.children && n.children.length))

  return a.tables
    .map((t) => ({
      id: t.id,
      label: t.name,
      kind: 'table' as const,
      tableId: t.id,
      children: mapViews(t.views, t.id),
    }))
    .filter((n) => match(n.label) || (n.children && n.children.length))
})

onMounted(() => {
  document.addEventListener('pointerdown', onDocPointer, true)
})

onUnmounted(() => {
  document.removeEventListener('pointerdown', onDocPointer, true)
})

function setOpsRoot(id: string, el: Element | ComponentPublicInstance | null) {
  if (!el) {
    opsRoots.delete(id)
    return
  }
  const node = el instanceof HTMLElement ? el : ((el as ComponentPublicInstance).$el as HTMLElement | undefined)
  if (node) opsRoots.set(id, node)
}

function opsItemsFor(data: TreeNode): OpsItem[] {
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

function closeAdd() {
  addOpen.value = false
  addActive.value = null
}

function openAdd() {
  closeOps()
  addOpen.value = true
  addActive.value = enabledMenuIndices(addItems)[0] ?? null
  focusMenuItem(addRoot.value, addActive.value)
}

function toggleAdd() {
  if (addOpen.value) closeAdd()
  else openAdd()
}

function pickAdd(cmd: string) {
  closeAdd()
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
    onClose: closeAdd,
  })
}

function closeOps() {
  opsOpenId.value = null
  opsActive.value = null
  opsNode.value = null
}

function openOps(data: TreeNode) {
  closeAdd()
  opsNode.value = data
  opsOpenId.value = data.id
  const items = opsItemsFor(data)
  opsActive.value = enabledMenuIndices(items)[0] ?? null
  focusMenuItem(opsRoots.get(data.id), opsActive.value)
}

function toggleOps(data: TreeNode) {
  if (opsOpenId.value === data.id) closeOps()
  else openOps(data)
}

function pickOps(cmd: string, data: TreeNode) {
  closeOps()
  onMenu(cmd, data)
}

function onOpsTriggerKey(e: KeyboardEvent, data: TreeNode) {
  if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
    if (opsOpenId.value !== data.id) {
      e.preventDefault()
      openOps(data)
    }
  } else if (e.key === 'Escape' && opsOpenId.value === data.id) {
    e.preventDefault()
    closeOps()
  }
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
    onClose: closeOps,
  })
}

function onDocPointer(e: PointerEvent) {
  const t = e.target as Node
  if (addOpen.value) {
    const root = addRoot.value
    if (root && !root.contains(t)) closeAdd()
  }
  if (opsOpenId.value) {
    const root = opsRoots.get(opsOpenId.value)
    if (root && !root.contains(t)) closeOps()
  }
}

function onClick(data: TreeNode) {
  store.selectNode(data.id, 'workspace')
}

function onMenu(cmd: string, data: TreeNode) {
  if (cmd === 'new-view') {
    newViewParent.value = { tableId: data.tableId, parentId: data.id }
    newViewName.value = 'New view'
    newViewType.value = 'table'
    showNewView.value = true
  } else if (cmd === 'rename') {
    void prompt('新名称', '重命名', { inputValue: data.label.replace(/ \(.*\)$/, '') }).then(({ value }) => {
      if (value) store.renameNode(data.id, value)
    })
  } else if (cmd === 'jump') {
    emit('jump-flowchart', data.id)
  } else if (cmd === 'promote') {
    store.selectNode(data.id, 'workspace')
    store.promoteViewToTable(data.id)
    toast('success', '已提升为 Analysis 表')
  } else if (cmd === 'delete') {
    void confirm('确定删除？子视图将一并删除。', '确认').then(() => {
      const r = store.deleteNode(data.id)
      if (!r.ok) toast('error', r.reason || '删除失败')
      else toast('success', '已删除')
    })
  }
}

function createView() {
  if (!newViewParent.value) return
  store.addView(
    newViewParent.value.tableId,
    newViewParent.value.parentId,
    newViewName.value,
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
  margin-bottom: 8px;
}
.tree-nav {
  flex: 1;
  min-height: 0;
  overflow: auto;
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
.node {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding-right: 4px;
}
.label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
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
.ext {
  width: 100%;
}
</style>
