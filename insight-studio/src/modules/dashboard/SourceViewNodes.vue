<script setup lang="ts">
import type { ViewNode, ViewType } from '../../shared/types'
import { IIcon, type IconName } from '../../ui'

defineOptions({ name: 'SourceViewNodes' })

defineProps<{
  views: ViewNode[]
  tableId: string
  depth: number
  expandedViews: Set<string>
  selectedKey: string | null
  viewIcon: Record<ViewType, IconName>
  viewKind: Record<ViewType, string>
}>()

const emit = defineEmits<{
  (e: 'toggle-view', id: string): void
  (e: 'pick-view', tableId: string, view: ViewNode): void
}>()
</script>

<template>
  <template v-for="v in views" :key="v.id">
    <div
      class="stp__row"
      :class="{ 'stp__row--on': selectedKey === `v:${v.id}` }"
      :style="{ '--d': depth }"
      role="treeitem"
      :aria-selected="selectedKey === `v:${v.id}`"
      tabindex="0"
      @click="emit('pick-view', tableId, v)"
      @keydown.enter.prevent="emit('pick-view', tableId, v)"
    >
      <button
        type="button"
        class="stp__chev"
        :class="{ 'stp__chev--hid': !v.children.length }"
        @click.stop="v.children.length && emit('toggle-view', v.id)"
      >
        <IIcon
          v-if="v.children.length"
          :name="expandedViews.has(v.id) ? 'chevron-down' : 'chevron-right'"
          :size="14"
        />
      </button>
      <IIcon :name="viewIcon[v.type]" :size="15" class="stp__ico" />
      <span class="stp__name is-ellipsis" :title="v.name">{{ v.name }}</span>
      <span class="stp__badge">{{ v.type === 'table' ? '表视图' : viewKind[v.type] }}</span>
    </div>
    <SourceViewNodes
      v-if="expandedViews.has(v.id) && v.children.length"
      :views="v.children"
      :table-id="tableId"
      :depth="depth + 1"
      :expanded-views="expandedViews"
      :selected-key="selectedKey"
      :view-icon="viewIcon"
      :view-kind="viewKind"
      @toggle-view="emit('toggle-view', $event)"
      @pick-view="(tid, view) => emit('pick-view', tid, view)"
    />
  </template>
</template>
