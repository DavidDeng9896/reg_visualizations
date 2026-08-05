<script setup lang="ts">
/**
 * 看板「添加组件」源树：与 Insight 侧栏一致的表/视图父子与类型图标。
 */
import { computed, reactive, watch } from 'vue'
import type { Analysis, ViewNode, ViewType } from '../../shared/types'
import { buildTableForest } from '../../shared/tree'
import type { IconName } from '../../ui'
import SourceTreeNodes from './SourceTreeNodes.vue'

export type TreePick =
  | { kind: 'table'; tableId: string }
  | { kind: 'view'; tableId: string; viewId: string; viewType: ViewType }

const props = defineProps<{
  analysis: Analysis | null
  modelValue: TreePick | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: TreePick | null): void
}>()

const VIEW_ICON: Record<ViewType, IconName> = {
  table: 'table',
  bar: 'bar',
  line: 'line',
  scatter: 'scatter',
  box: 'box',
  pie: 'pie',
  heatmap: 'heatmap',
  bignumber: 'bignumber',
}

const VIEW_KIND: Record<ViewType, string> = {
  table: '表视图',
  bar: '柱状图',
  line: '折线图',
  scatter: '散点图',
  box: '箱线图',
  pie: '饼图',
  heatmap: '热图',
  bignumber: '指标卡',
}

const forest = computed(() => (props.analysis ? buildTableForest(props.analysis) : []))
const expandedTables = reactive(new Set<string>())
const expandedViews = reactive(new Set<string>())

watch(
  () => props.analysis?.id,
  () => {
    expandedTables.clear()
    expandedViews.clear()
    for (const n of forest.value) {
      expandedTables.add(n.table.id)
      seedExpandViews(n.table.views)
      seedExpandChildTables(n)
    }
  },
  { immediate: true },
)

function seedExpandViews(views: ViewNode[]) {
  for (const v of views) {
    if (v.children.length) {
      expandedViews.add(v.id)
      seedExpandViews(v.children)
    }
  }
}
function seedExpandChildTables(n: ReturnType<typeof buildTableForest>[number]) {
  for (const c of n.children) {
    expandedTables.add(c.table.id)
    seedExpandViews(c.table.views)
    seedExpandChildTables(c)
  }
}

function toggleTable(id: string) {
  if (expandedTables.has(id)) expandedTables.delete(id)
  else expandedTables.add(id)
}
function toggleView(id: string) {
  if (expandedViews.has(id)) expandedViews.delete(id)
  else expandedViews.add(id)
}

const selectedKey = computed(() => {
  const v = props.modelValue
  if (!v) return null
  return v.kind === 'table' ? `t:${v.tableId}` : `v:${v.viewId}`
})

function pickTable(tableId: string) {
  emit('update:modelValue', { kind: 'table', tableId })
}
function pickView(tableId: string, view: ViewNode) {
  emit('update:modelValue', { kind: 'view', tableId, viewId: view.id, viewType: view.type })
}
</script>

<template>
  <div class="stp" role="tree" aria-label="选择表或视图">
    <p v-if="!analysis" class="stp__empty">请先选择 Insight</p>
    <p v-else-if="!forest.length" class="stp__empty">该 Insight 还没有表</p>
    <SourceTreeNodes
      v-else
      :nodes="forest"
      :depth="0"
      :expanded-tables="expandedTables"
      :expanded-views="expandedViews"
      :selected-key="selectedKey"
      :view-icon="VIEW_ICON"
      :view-kind="VIEW_KIND"
      @toggle-table="toggleTable"
      @toggle-view="toggleView"
      @pick-table="pickTable"
      @pick-view="pickView"
    />
  </div>
</template>

<style>
.stp {
  max-height: 320px;
  overflow: auto;
  border: 1px solid var(--is-border);
  border-radius: var(--is-radius-md, 8px);
  background: var(--is-surface);
  padding: 6px;
}
.stp__empty {
  margin: 0;
  padding: 24px 12px;
  text-align: center;
  font-size: var(--is-text-sm);
  color: var(--is-text-tertiary);
}
.stp__row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px 6px calc(8px + var(--d, 0) * 14px);
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  color: var(--is-text);
}
.stp__row:hover {
  background: var(--is-surface-hover, #f2f4f7);
}
.stp__row--on {
  background: color-mix(in srgb, var(--is-accent, #3b82f6) 12%, transparent);
  font-weight: 600;
}
.stp__chev {
  width: 18px;
  height: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  padding: 0;
  cursor: pointer;
  color: var(--is-text-tertiary);
  flex-shrink: 0;
}
.stp__chev--hid {
  visibility: hidden;
  pointer-events: none;
}
.stp__ico {
  flex-shrink: 0;
  color: var(--is-text-secondary);
}
.stp__name {
  flex: 1;
  min-width: 0;
}
.stp__badge {
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 500;
  color: var(--is-text-tertiary);
  padding: 1px 6px;
  border-radius: 999px;
  background: var(--is-surface-muted, #f2f4f7);
}
</style>
