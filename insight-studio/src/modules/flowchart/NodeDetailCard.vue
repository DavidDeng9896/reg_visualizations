<script lang="ts">
/** 节点详情展示方式：右侧固定 / 下侧固定（不允许浮窗形式）。 */
export type DetailLayout = 'right' | 'bottom'
</script>

<script setup lang="ts">
import { computed, defineAsyncComponent, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { IButton, IIcon, toast } from '../../ui'
import type { IconName } from '../../ui'
import type { FlowNodeData } from './graph'
import { stepTypeLabel, viewTypeLabel } from './graph'
import { useAnalysisStore } from '../../stores/analysisStore'
import { refreshSqlSourceStep } from '../table/refreshSqlSource'

const FlowChartPreview = defineAsyncComponent(() => import('./FlowChartPreview.vue'))
const PlotlyArtifactPreview = defineAsyncComponent(
  () => import('../steps/panel/PlotlyArtifactPreview.vue'),
)

const props = defineProps<{
  node: FlowNodeData
  inputs: FlowNodeData[]
  outputs: FlowNodeData[]
  layout: DetailLayout
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'focus', id: string): void
  (e: 'open'): void
  (e: 'edit'): void
  (e: 'delete', stepId: string): void
  (e: 'update:layout', layout: DetailLayout): void
}>()

const store = useAnalysisStore()
const { current } = storeToRefs(store)
const refreshing = ref(false)

const LAYOUT_OPTIONS: { value: DetailLayout; label: string; icon: IconName }[] = [
  { value: 'right', label: '右侧固定', icon: 'panel-right' },
  { value: 'bottom', label: '下侧固定', icon: 'panel-bottom' },
]

const isChartNode = computed(
  () => props.node.kind === 'view' && !!props.node.viewType && props.node.viewType !== 'table' && !!props.node.viewId,
)

const stepCharts = computed(() => {
  if (props.node.kind !== 'step' || props.node.stepType !== 'custom-code' || !current.value) return []
  const step = current.value.steps.find((s) => s.id === props.node.stepId)
  const ids = step?.output.charts ?? []
  if (!ids.length || !current.value.charts?.length) return []
  const byId = new Map(current.value.charts.map((c) => [c.id, c]))
  return ids.map((id) => byId.get(id)).filter((c): c is NonNullable<typeof c> => !!c)
})

const showWidePreview = computed(() => isChartNode.value || stepCharts.value.length > 0)

const kindTitle = computed(() => {
  const n = props.node
  if (n.kind === 'step') return stepTypeLabel(n.stepType!)
  return isChartNode.value ? viewTypeLabel(n.viewType ?? 'bar') : '视图'
})

const nodeIcon = computed<IconName>(() => {
  const n = props.node
  if (n.kind === 'view') return (n.viewType ?? 'table') as IconName
  switch (n.stepType) {
    case 'upload-csv':
    case 'upload-xlsx':
    case 'import-files':
    case 'file-to-table':
      return 'upload'
    case 'query-sql':
      return 'database'
    case 'join':
    case 'union':
      return 'combine'
    case 'filter':
      return 'filter'
    case 'hide-columns':
      return 'table'
    case 'computed-column':
      return 'type-number'
    case 'interpolation':
      return 'line'
    case 'custom-code':
      return 'database'
    default:
      return 'database'
  }
})

interface MetaRow {
  label: string
  value: string
}

const metaRows = computed<MetaRow[]>(() => {
  const n = props.node
  if (n.kind === 'step') {
    const rows: MetaRow[] = [
      { label: '类型', value: stepTypeLabel(n.stepType!) },
      { label: '状态', value: n.status ?? '—' },
    ]
    if (n.rowCount !== undefined) rows.push({ label: '行数', value: String(n.rowCount) })
    if (n.columnCount !== undefined) rows.push({ label: '列数', value: String(n.columnCount) })
    if (stepCharts.value.length) rows.push({ label: '图表', value: String(stepCharts.value.length) })
    if (sqlStepMeta.value?.lastSyncedAt) {
      rows.push({ label: '上次同步', value: formatSyncedAt(sqlStepMeta.value.lastSyncedAt) })
    }
    if (sqlStepMeta.value?.connectionName) {
      rows.push({ label: '连接', value: sqlStepMeta.value.connectionName })
    }
    if (n.error) rows.push({ label: '错误', value: n.error })
    return rows
  }
  return [
    { label: '类型', value: viewTypeLabel(n.viewType ?? 'table') },
    { label: '子视图', value: String(n.childCount ?? 0) },
  ]
})

const isQuerySql = computed(() => props.node.kind === 'step' && props.node.stepType === 'query-sql')

const sqlStepMeta = computed(() => {
  if (!isQuerySql.value || !current.value || !props.node.stepId) return null
  const step = current.value.steps.find((s) => s.id === props.node.stepId)
  if (!step) return null
  return {
    lastSyncedAt: typeof step.config.lastSyncedAt === 'string' ? step.config.lastSyncedAt : '',
    connectionName: typeof step.config.connectionName === 'string' ? step.config.connectionName : '',
    autoRefresh: !!step.config.autoRefresh,
  }
})

function formatSyncedAt(iso: string): string {
  const t = Date.parse(iso)
  if (!Number.isFinite(t)) return iso
  try {
    return new Date(t).toLocaleString('zh-CN', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

async function onRefreshSql(): Promise<void> {
  if (!props.node.stepId || refreshing.value) return
  refreshing.value = true
  try {
    const r = await refreshSqlSourceStep(props.node.stepId)
    if (r.mode === 'unchanged') {
      toast.success('数据源无变化，下游未重跑')
      return
    }
    const extra =
      r.mode === 'reran' ? `，下游已重跑 ${r.ran} 步` : r.mode === 'stale-only' ? '，下游已标 stale（请点 Run stale）' : ''
    toast.success(`数据源已刷新（${r.rowCount} 行）${extra}`)
  } catch (e) {
    toast.error(e instanceof Error ? e.message : '刷新失败')
  } finally {
    refreshing.value = false
  }
}

function toggleAutoRefresh(): void {
  if (!props.node.stepId) return
  let next = false
  store.mutate((a) => {
    const s = a.steps.find((x) => x.id === props.node.stepId)
    if (!s || s.type !== 'query-sql') return
    next = !s.config.autoRefresh
    s.config.autoRefresh = next
  })
  toast.success(next ? '已开启自动刷新（打开分析时约每 2 分钟）' : '已关闭自动刷新')
}

function refIcon(n: FlowNodeData): IconName {
  if (n.kind === 'view') return (n.viewType ?? 'table') as IconName
  return nodeIcon.value
}

function onDelete() {
  if (props.node.kind === 'step' && props.node.stepId) {
    emit('delete', props.node.stepId)
  }
}
</script>

<template>
  <aside
    class="flow-detail flow-detail--docked"
    :class="{ 'flow-detail--chart': showWidePreview }"
    role="complementary"
    :aria-label="isChartNode ? '图表预览' : '节点详情'"
  >
    <header class="flow-detail__head">
      <span class="flow-detail__icon">
        <IIcon :name="nodeIcon" :size="16" />
      </span>
      <div class="flow-detail__title">
        <span class="flow-detail__kind">{{ kindTitle }}</span>
        <span class="flow-detail__name is-ellipsis" :title="node.label">{{ node.label }}</span>
      </div>
      <div class="flow-detail__layout" role="group" aria-label="详情展示方式">
        <button
          v-for="opt in LAYOUT_OPTIONS"
          :key="opt.value"
          type="button"
          class="flow-detail__layout-btn"
          :class="{ 'flow-detail__layout-btn--on': layout === opt.value }"
          :title="opt.label"
          :aria-label="opt.label"
          :aria-pressed="layout === opt.value"
          @click="emit('update:layout', opt.value)"
        >
          <IIcon :name="opt.icon" :size="13" />
        </button>
      </div>
      <button type="button" class="flow-detail__close" aria-label="关闭详情" @click="emit('close')">
        <IIcon name="close" :size="14" />
      </button>
    </header>

    <div class="flow-detail__body">
      <section v-if="isChartNode && node.viewId" class="flow-detail__preview">
        <h4 class="flow-detail__section-title">Output chart</h4>
        <FlowChartPreview :table-id="node.tableId ?? ''" :view-id="node.viewId" @open="emit('open')" />
      </section>

      <section v-else-if="stepCharts.length" class="flow-detail__preview" data-testid="step-chart-artifacts">
        <h4 class="flow-detail__section-title">Output charts</h4>
        <PlotlyArtifactPreview
          v-for="ch in stepCharts"
          :key="ch.id"
          :name="ch.name"
          :plotly-json="ch.plotlyJson"
        />
      </section>

      <dl class="flow-detail__meta" :class="{ 'flow-detail__meta--compact': showWidePreview }">
        <template v-for="row in metaRows" :key="row.label">
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
      <template v-if="node.kind === 'step'">
        <IButton
          v-if="isQuerySql"
          variant="ghost"
          icon="refresh"
          :loading="refreshing"
          data-testid="sql-source-refresh"
          @click="onRefreshSql"
        >
          刷新数据源
        </IButton>
        <IButton
          v-if="isQuerySql"
          variant="ghost"
          data-testid="sql-source-auto"
          @click="toggleAutoRefresh"
        >
          {{ sqlStepMeta?.autoRefresh ? '自动刷新：开' : '自动刷新：关' }}
        </IButton>
        <IButton variant="ghost" icon="edit" @click="emit('edit')">Edit</IButton>
        <IButton variant="ghost" icon="trash" @click="onDelete">Delete</IButton>
      </template>
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
/* 固定模式（右/下分割面板）：填满面板，去掉悬浮外壳 */
.flow-detail--docked {
  width: 100%;
  height: 100%;
  max-height: none;
  border: none;
  border-radius: 0;
  box-shadow: none;
}
.flow-detail__layout {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 2px;
  border: 1px solid var(--is-border);
  border-radius: var(--is-radius-sm);
  flex-shrink: 0;
}
.flow-detail__layout-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 3px;
  color: var(--is-text-tertiary);
  transition:
    background-color var(--is-dur-fast) var(--is-ease),
    color var(--is-dur-fast) var(--is-ease);
}
.flow-detail__layout-btn:hover {
  background: var(--is-surface-hover);
  color: var(--is-text);
}
.flow-detail__layout-btn--on {
  background: var(--is-accent-soft);
  color: var(--is-accent);
}
.flow-detail__head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--is-border);
}
.flow-detail__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: var(--is-accent-soft);
  color: var(--is-accent);
  flex-shrink: 0;
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
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.flow-detail__preview {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.flow-detail__meta {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 8px 16px;
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
  margin-bottom: 8px;
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
  padding: 12px 16px;
  border-top: 1px solid var(--is-border);
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
