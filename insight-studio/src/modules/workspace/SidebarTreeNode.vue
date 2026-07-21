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
