<script setup lang="ts">
import type { ViewNode, ViewType } from '../../shared/types'
import type { TableTreeNode } from '../../shared/tree'
import { IIcon, type IconName } from '../../ui'
import SourceViewNodes from './SourceViewNodes.vue'

defineOptions({ name: 'SourceTreeNodes' })

defineProps<{
  nodes: TableTreeNode[]
  depth: number
  expandedTables: Set<string>
  expandedViews: Set<string>
  selectedKey: string | null
  viewIcon: Record<ViewType, IconName>
  viewKind: Record<ViewType, string>
}>()

const emit = defineEmits<{
  (e: 'toggle-table', id: string): void
  (e: 'toggle-view', id: string): void
  (e: 'pick-table', tableId: string): void
  (e: 'pick-view', tableId: string, view: ViewNode): void
}>()
</script>

<template>
  <template v-for="node in nodes" :key="node.table.id">
    <div
      class="stp__row"
      :class="{ 'stp__row--on': selectedKey === `t:${node.table.id}` }"
      :style="{ '--d': depth }"
      role="treeitem"
      :aria-selected="selectedKey === `t:${node.table.id}`"
      tabindex="0"
      @click="emit('pick-table', node.table.id)"
      @keydown.enter.prevent="emit('pick-table', node.table.id)"
    >
      <button
        type="button"
        class="stp__chev"
        :class="{ 'stp__chev--hid': !node.table.views.length && !node.children.length }"
        @click.stop="emit('toggle-table', node.table.id)"
      >
        <IIcon
          v-if="node.table.views.length || node.children.length"
          :name="expandedTables.has(node.table.id) ? 'chevron-down' : 'chevron-right'"
          :size="14"
        />
      </button>
      <IIcon
        :name="node.table.source === 'combine' ? 'combine' : 'database'"
        :size="15"
        class="stp__ico"
      />
      <span class="stp__name is-ellipsis" :title="node.table.name">{{ node.table.name }}</span>
      <span class="stp__badge">源表</span>
    </div>

    <template v-if="expandedTables.has(node.table.id)">
      <SourceViewNodes
        :views="node.table.views"
        :table-id="node.table.id"
        :depth="depth + 1"
        :expanded-views="expandedViews"
        :selected-key="selectedKey"
        :view-icon="viewIcon"
        :view-kind="viewKind"
        @toggle-view="emit('toggle-view', $event)"
        @pick-view="(tid, v) => emit('pick-view', tid, v)"
      />
      <SourceTreeNodes
        :nodes="node.children"
        :depth="depth + 1"
        :expanded-tables="expandedTables"
        :expanded-views="expandedViews"
        :selected-key="selectedKey"
        :view-icon="viewIcon"
        :view-kind="viewKind"
        @toggle-table="emit('toggle-table', $event)"
        @toggle-view="emit('toggle-view', $event)"
        @pick-table="emit('pick-table', $event)"
        @pick-view="(tid, v) => emit('pick-view', tid, v)"
      />
    </template>
  </template>
</template>
