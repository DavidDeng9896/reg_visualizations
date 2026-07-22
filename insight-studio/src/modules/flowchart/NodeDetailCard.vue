<script setup lang="ts">
import { computed } from 'vue'
import { IButton, IIcon } from '../../ui'
import type { IconName } from '../../ui'
import type { FlowNodeData } from './graph'
import { joinTypeLabel, sourceLabel, viewTypeLabel } from './graph'
import FlowChartPreview from './FlowChartPreview.vue'

/** 选中节点右侧详情卡：类型/名称/摘要 +（图表节点）预览 + Inputs / Outputs + 打开主按钮。 */
const props = defineProps<{
  node: FlowNodeData
  inputs: FlowNodeData[]
  outputs: FlowNodeData[]
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'focus', id: string): void
  (e: 'open'): void
}>()

/** 图表类视图：侧边展示真实图表内容（对齐参考：点选图表节点 → 预览）。 */
const isChartNode = computed(
  () => props.node.kind === 'view' && !!props.node.viewType && props.node.viewType !== 'table' && !!props.node.viewId,
)

const kindTitle = computed(() => {
  const n = props.node
  if (n.kind === 'table') return '数据表'
  if (n.kind === 'view') return isChartNode.value ? viewTypeLabel(n.viewType ?? 'bar') : '视图'
  return 'Combine 步骤'
})

const nodeIcon = computed<IconName>(() => {
  const n = props.node
  if (n.kind === 'table') return n.source === 'combine' ? 'combine' : 'database'
  if (n.kind === 'combine-step') return 'combine'
  return (n.viewType ?? 'table') as IconName
})

interface MetaRow {
  label: string
  value: string
}

const metaRows = computed<MetaRow[]>(() => {
  const n = props.node
  if (n.kind === 'table') {
    return [
      { label: '来源', value: sourceLabel(n.source ?? 'csv') },
      { label: '行数', value: String(n.rowCount ?? 0) },
      { label: '列数', value: String(n.columnCount ?? 0) },
      { label: '视图数', value: String(n.viewCount ?? 0) },
    ]
  }
  if (n.kind === 'view') {
    return [
      { label: '类型', value: viewTypeLabel(n.viewType ?? 'table') },
      { label: '过滤器', value: String(n.filterCount ?? 0) },
      { label: '转换', value: String(n.transformCount ?? 0) },
      { label: '子视图', value: String(n.childCount ?? 0) },
    ]
  }
  return [
    { label: 'Join 类型', value: n.joinType ? joinTypeLabel(n.joinType) : '—' },
    { label: 'Join 键', value: String(n.joinKeyCount ?? 0) },
    { label: '结果表', value: n.contextLabel ?? '—' },
    { label: '状态', value: n.valid ? '输入完整' : '输入缺失' },
  ]
})

function refIcon(n: FlowNodeData): IconName {
  if (n.kind === 'table') return n.source === 'combine' ? 'combine' : 'database'
  if (n.kind === 'combine-step') return 'combine'
  return (n.viewType ?? 'table') as IconName
}
</script>

<template>
  <aside
    class="flow-detail"
    :class="{ 'flow-detail--chart': isChartNode }"
    role="complementary"
    :aria-label="isChartNode ? '图表预览' : '节点详情'"
  >
    <header class="flow-detail__head">
      <span class="flow-detail__icon" :class="{ 'flow-detail__icon--chart': isChartNode }">
        <IIcon :name="nodeIcon" :size="16" />
      </span>
      <div class="flow-detail__title">
        <span class="flow-detail__kind">{{ kindTitle }}</span>
        <span class="flow-detail__name is-ellipsis" :title="node.label">{{ node.label }}</span>
      </div>
      <button type="button" class="flow-detail__close" aria-label="关闭详情" @click="emit('close')">
        <IIcon name="close" :size="14" />
      </button>
    </header>

    <div class="flow-detail__body">
      <!-- 图表节点：侧边主内容为图表预览 -->
      <section v-if="isChartNode && node.viewId" class="flow-detail__preview">
        <h4 class="flow-detail__section-title">Output chart</h4>
        <FlowChartPreview :table-id="node.tableId" :view-id="node.viewId" @open="emit('open')" />
      </section>

      <dl v-if="!isChartNode" class="flow-detail__meta">
        <template v-for="row in metaRows" :key="row.label">
          <dt>{{ row.label }}</dt>
          <dd class="is-ellipsis" :title="row.value">{{ row.value }}</dd>
        </template>
      </dl>

      <dl v-else class="flow-detail__meta flow-detail__meta--compact">
        <template v-for="row in metaRows.slice(0, 2)" :key="row.label">
          <dt>{{ row.label }}</dt>
          <dd class="is-ellipsis" :title="row.value">{{ row.value }}</dd>
        </template>
      </dl>

      <section class="flow-detail__section">
        <h4 class="flow-detail__section-title">Inputs</h4>
        <p v-if="!inputs.length" class="flow-detail__none">无上游节点</p>
        <button
          v-for="n in inputs"
          :key="n.id"
          type="button"
          class="flow-detail__ref"
          :title="`定位到 ${n.label}`"
          @click="emit('focus', n.id)"
        >
          <IIcon :name="refIcon(n)" :size="13" />
          <span class="is-ellipsis">{{ n.label }}</span>
        </button>
      </section>

      <section class="flow-detail__section">
        <h4 class="flow-detail__section-title">Outputs</h4>
        <p v-if="!outputs.length" class="flow-detail__none">无下游节点</p>
        <button
          v-for="n in outputs"
          :key="n.id"
          type="button"
          class="flow-detail__ref"
          :title="`定位到 ${n.label}`"
          @click="emit('focus', n.id)"
        >
          <IIcon :name="refIcon(n)" :size="13" />
          <span class="is-ellipsis">{{ n.label }}</span>
        </button>
      </section>
    </div>

    <footer class="flow-detail__foot">
      <IButton variant="primary" icon="external" @click="emit('open')">在工作区打开</IButton>
    </footer>
  </aside>
</template>

<style scoped>
.flow-detail {
  display: flex;
  flex-direction: column;
  width: 300px;
  max-height: calc(100% - 32px);
  background: var(--is-surface);
  border: 1px solid var(--is-border);
  border-radius: var(--is-radius);
  box-shadow: var(--is-shadow-lg);
  overflow: hidden;
}
.flow-detail--chart {
  width: min(520px, calc(100vw - 48px));
}
.flow-detail__head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  border-bottom: 1px solid var(--is-border);
}
.flow-detail__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: var(--is-success-soft);
  color: var(--is-success);
  flex-shrink: 0;
}
.flow-detail__icon--chart {
  background: var(--is-accent-soft);
  color: var(--is-accent);
}
.flow-detail__title {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.flow-detail__kind {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--is-text-tertiary);
}
.flow-detail__name {
  font-size: var(--is-text-md);
  font-weight: 600;
}
.flow-detail__close {
  display: inline-flex;
  padding: 5px;
  border-radius: var(--is-radius-sm);
  color: var(--is-text-tertiary);
}
.flow-detail__close:hover {
  background: var(--is-surface-hover);
  color: var(--is-text);
}

.flow-detail__body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.flow-detail__preview {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.flow-detail__meta {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 6px 14px;
  margin: 0;
}
.flow-detail__meta--compact {
  padding-top: 2px;
  border-top: 1px solid var(--is-border);
}
.flow-detail__meta dt {
  font-size: var(--is-text-xs);
  color: var(--is-text-tertiary);
}
.flow-detail__meta dd {
  margin: 0;
  font-size: var(--is-text-xs);
  color: var(--is-text);
  font-weight: 500;
}

.flow-detail__section-title {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--is-text-tertiary);
  margin-bottom: 6px;
}
.flow-detail__none {
  font-size: var(--is-text-xs);
  color: var(--is-text-tertiary);
}
.flow-detail__ref {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 6px 8px;
  border-radius: var(--is-radius-sm);
  font-size: var(--is-text-sm);
  color: var(--is-text);
  text-align: left;
  transition: background-color var(--is-dur-fast) var(--is-ease);
}
.flow-detail__ref:hover {
  background: var(--is-accent-soft);
  color: var(--is-accent);
}

.flow-detail__foot {
  padding: 12px;
  border-top: 1px solid var(--is-border);
  display: flex;
}
.flow-detail__foot :deep(.is-btn) {
  flex: 1;
}
</style>
