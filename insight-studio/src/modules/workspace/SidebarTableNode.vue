<script setup lang="ts">
import { computed } from 'vue'
import type { AnalysisTable, ViewNode } from '../../shared/types'
import type { TableTreeNode } from '../../shared/tree'
import { IIcon, IPopover } from '../../ui'
import SidebarTreeNode from './SidebarTreeNode.vue'

defineOptions({ name: 'SidebarTableNode' })

const props = defineProps<{
  node: TableTreeNode
  depth: number
  search: string
  collapsedTables: Set<string>
  expanded: Set<string>
  selectedTableId?: string
  selectedViewId?: string
  editingId: string | null
  menuFor: string | null
}>()

const emit = defineEmits<{
  (e: 'toggle-table', id: string): void
  (e: 'toggle-view', id: string): void
  (e: 'select-table', tableId: string): void
  (e: 'select-view', tableId: string, viewId: string): void
  (e: 'menu', id: string | null): void
  (e: 'rename', id: string, name: string): void
  (e: 'rename-start', id: string): void
  (e: 'rename-cancel'): void
  (e: 'delete-view', tableId: string, viewId: string, name: string): void
  (e: 'delete-table', table: AnalysisTable): void
  (e: 'rename-table', table: AnalysisTable): void
  (e: 'new-view', tableId: string, parentViewId: string | null): void
  (e: 'show-in-flowchart', tableId: string, viewId?: string): void
}>()

const t = computed(() => props.node.table)
const isExpanded = computed(() => !props.collapsedTables.has(t.value.id))
const isSelected = computed(() => props.selectedTableId === t.value.id)
const q = computed(() => props.search.trim().toLowerCase())

function viewMatches(v: ViewNode, query: string): boolean {
  if (v.name.toLowerCase().includes(query)) return true
  return v.children.some((c) => viewMatches(c, query))
}
function filterViews(views: ViewNode[], query: string): ViewNode[] {
  if (!query) return views
  return views.filter((v) => viewMatches(v, query))
}

const visibleViews = computed(() => filterViews(t.value.views, q.value))
const hasChildren = computed(() => visibleViews.value.length > 0 || props.node.children.length > 0)

function onSelectView(tableId: string, viewId: string) {
  emit('select-view', tableId, viewId)
}
function onRename(id: string, name: string) {
  emit('rename', id, name)
}
function onDeleteViewFromTree(id: string, name: string) {
  emit('delete-view', t.value.id, id, name)
}
function onDeleteViewNested(tableId: string, viewId: string, name: string) {
  emit('delete-view', tableId, viewId, name)
}
function onNewView(tableId: string, parentId: string | null) {
  emit('new-view', tableId, parentId)
}
function onShowInFlowchart(tableId: string, viewId?: string) {
  emit('show-in-flowchart', tableId, viewId)
}
</script>

<template>
  <div class="tnode" :style="{ '--depth': depth }">
    <div
      class="tnode__row"
      :class="{ 'tnode__row--selected': isSelected }"
      role="treeitem"
      data-testid="sidebar-table"
      :data-name="t.name"
      :aria-expanded="isExpanded"
      :aria-selected="isSelected"
      tabindex="0"
      @click="emit('select-table', t.id)"
      @keydown.enter="emit('select-table', t.id)"
    >
      <button
        type="button"
        class="tnode__chevron"
        :class="{ 'tnode__chevron--hidden': !hasChildren }"
        :aria-label="isExpanded ? '收起' : '展开'"
        @click.stop="emit('toggle-table', t.id)"
      >
        <IIcon v-if="hasChildren" :name="isExpanded ? 'chevron-down' : 'chevron-right'" :size="14" />
      </button>
      <IIcon :name="t.source === 'combine' ? 'combine' : 'database'" :size="16" class="tnode__icon" />
      <span class="tnode__name is-ellipsis" :title="t.name">{{ t.name }}</span>
      <span class="tnode__actions">
        <button
          type="button"
          class="tnode__action"
          aria-label="在流程图中定位"
          title="在流程图中定位"
          @click.stop="emit('show-in-flowchart', t.id)"
        >
          <IIcon name="flowchart" :size="12" />
        </button>
        <button
          type="button"
          class="tnode__action"
          aria-label="新建视图"
          title="新建视图"
          @click.stop="emit('new-view', t.id, null)"
        >
          <IIcon name="plus" :size="12" />
        </button>
        <IPopover
          :open="menuFor === t.id"
          placement="bottom-end"
          :arrow="false"
          @update:open="emit('menu', $event ? t.id : null)"
        >
          <template #anchor>
            <button
              type="button"
              class="tnode__action"
              aria-label="更多操作"
              @click.stop="emit('menu', menuFor === t.id ? null : t.id)"
            >
              <IIcon name="more" :size="13" />
            </button>
          </template>
          <template #default="{ close }">
            <div class="menu" role="menu">
              <button type="button" class="menu__item" role="menuitem" @click.stop="close(); emit('show-in-flowchart', t.id)">
                <IIcon name="flowchart" :size="13" /> 在流程图中显示
              </button>
              <button type="button" class="menu__item" role="menuitem" @click.stop="close(); emit('rename-table', t)">
                <IIcon name="edit" :size="13" /> 重命名
              </button>
              <button type="button" class="menu__item" role="menuitem" @click.stop="close(); emit('new-view', t.id, null)">
                <IIcon name="plus" :size="13" /> 新建视图
              </button>
              <button type="button" class="menu__item menu__item--danger" role="menuitem" @click.stop="close(); emit('delete-table', t)">
                <IIcon name="trash" :size="13" /> 删除
              </button>
            </div>
          </template>
        </IPopover>
      </span>
    </div>

    <div v-if="isExpanded && hasChildren" class="tnode__children" role="group">
      <!-- 图紧跟本表数据；派生表再下一层 —— 一层层对应 -->
      <SidebarTreeNode
        v-for="v in visibleViews"
        :key="v.id"
        :node="v"
        :table-id="t.id"
        :depth="depth + 1"
        :expanded="expanded"
        :selected-view-id="selectedViewId"
        :editing-id="editingId"
        :menu-for="menuFor"
        @toggle="emit('toggle-view', $event)"
        @select="onSelectView"
        @menu="emit('menu', $event)"
        @rename="onRename"
        @rename-start="emit('rename-start', $event)"
        @rename-cancel="emit('rename-cancel')"
        @delete="onDeleteViewFromTree"
        @new-view="onNewView"
        @show-in-flowchart="onShowInFlowchart"
      />
      <SidebarTableNode
        v-for="child in node.children"
        :key="child.table.id"
        :node="child"
        :depth="depth + 1"
        :search="search"
        :collapsed-tables="collapsedTables"
        :expanded="expanded"
        :selected-table-id="selectedTableId"
        :selected-view-id="selectedViewId"
        :editing-id="editingId"
        :menu-for="menuFor"
        @toggle-table="emit('toggle-table', $event)"
        @toggle-view="emit('toggle-view', $event)"
        @select-table="emit('select-table', $event)"
        @select-view="onSelectView"
        @menu="emit('menu', $event)"
        @rename="onRename"
        @rename-start="emit('rename-start', $event)"
        @rename-cancel="emit('rename-cancel')"
        @delete-view="onDeleteViewNested"
        @delete-table="emit('delete-table', $event)"
        @rename-table="emit('rename-table', $event)"
        @new-view="onNewView"
        @show-in-flowchart="onShowInFlowchart"
      />
    </div>
  </div>
</template>

<style scoped>
.tnode__row {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 8px 0 calc(8px + var(--depth, 0) * 16px);
  border-radius: var(--is-radius-sm);
  margin: 0 8px;
  cursor: pointer;
  color: var(--is-text);
}
.tnode__row:hover {
  background: var(--is-surface-hover);
}
.tnode__row--selected,
.tnode__row--selected:hover {
  background: var(--is-accent-soft);
}
.tnode__children {
  display: flex;
  flex-direction: column;
}
.tnode__row--selected .tnode__name {
  font-weight: 600;
  color: var(--is-accent);
}
.tnode__row--selected .tnode__icon {
  color: var(--is-accent);
}
.tnode__chevron {
  display: inline-flex;
  width: 18px;
  height: 18px;
  align-items: center;
  justify-content: center;
  color: var(--is-text-tertiary);
  flex-shrink: 0;
}
.tnode__chevron--hidden {
  visibility: hidden;
}
.tnode__icon {
  flex-shrink: 0;
  color: var(--is-text-secondary);
}
.tnode__name {
  flex: 1;
  min-width: 0;
  font-size: var(--is-text-sm);
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
  color: var(--is-text-secondary);
}
.tnode__action:hover {
  background: var(--is-surface);
  color: var(--is-text);
}
.menu {
  display: flex;
  flex-direction: column;
  padding: 4px;
  min-width: 160px;
}
.menu__item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  border-radius: var(--is-radius-sm);
  font-size: var(--is-text-sm);
  text-align: left;
}
.menu__item:hover {
  background: var(--is-surface-hover);
}
.menu__item--danger {
  color: var(--is-danger);
}
</style>
