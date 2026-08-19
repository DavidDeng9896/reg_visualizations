<script lang="ts">
/** 节点详情展示方式：右侧固定 / 下侧固定（不允许浮窗形式）。 */
export type DetailLayout = 'right' | 'bottom'
</script>

<script setup lang="ts">
import { computed, defineAsyncComponent, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { IButton, IIcon, ITextField, toast } from '../../ui'
import type { IconName } from '../../ui'
import type { FlowNodeData } from './graph'
import { stepTypeLabel, viewTypeLabel } from './graph'
import { useAnalysisStore } from '../../stores/analysisStore'
import { refreshSqlSourceStep } from '../table/refreshSqlSource'
import { runPipeline, type ViewResult } from '../../shared/pipeline'
import DataGrid from '../table/DataGrid.vue'
import CsvImportDialog from '../table/CsvImportDialog.vue'
import ExcelImportDialog from '../table/ExcelImportDialog.vue'
import { previewStep, runStepAsync, IMPLEMENTED_STEP_TYPES, type StepPreviewResult } from '../steps/exec'
import StepConfigForm from '../steps/panel/StepConfigForm.vue'
import CustomCodePanel from '../steps/panel/CustomCodePanel.vue'
import ReportPanel from '../steps/panel/ReportPanel.vue'
import PlotlyArtifactPreview from '../steps/panel/PlotlyArtifactPreview.vue'
import type { AnalysisChartArtifact, StepNode } from '../../shared/types'

const FlowChartPreview = defineAsyncComponent(() => import('./FlowChartPreview.vue'))

const props = withDefaults(defineProps<{
  node: FlowNodeData
  layout: DetailLayout
  initialEditing?: boolean
}>(), { initialEditing: false })

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'open'): void
  (e: 'delete', stepId: string): void
  (e: 'update:layout', layout: DetailLayout): void
}>()

const store = useAnalysisStore()
const { current } = storeToRefs(store)
const refreshing = ref(false)
const editing = ref(props.initialEditing)
const nameInput = ref('')
const preview = ref<StepPreviewResult | null>(null)
const previewLoading = ref(false)

const LAYOUT_OPTIONS: { value: DetailLayout; label: string; icon: IconName }[] = [
  { value: 'right', label: '右侧固定', icon: 'panel-right' },
  { value: 'bottom', label: '下侧固定', icon: 'panel-bottom' },
]

const step = computed<StepNode | null>(() => {
  if (props.node.kind !== 'step' || !props.node.stepId || !current.value) return null
  return current.value.steps.find((s) => s.id === props.node.stepId) ?? null
})

const isChartNode = computed(
  () => props.node.kind === 'view' && !!props.node.viewType && props.node.viewType !== 'table' && !!props.node.viewId,
)

const isPythonChartNode = computed(() => props.node.kind === 'python-chart' && !!props.node.chartId)

const pythonChart = computed<AnalysisChartArtifact | null>(() => {
  if (!isPythonChartNode.value || !current.value) return null
  return (current.value.charts ?? []).find((c) => c.id === props.node.chartId) ?? null
})

const stepCharts = computed(() => {
  if (!step.value || step.value.type !== 'custom-code' || !current.value) return []
  const ids = step.value.output.charts ?? []
  if (!ids.length || !current.value.charts?.length) return []
  const byId = new Map(current.value.charts.map((c) => [c.id, c]))
  return ids.map((id) => byId.get(id)).filter((c): c is NonNullable<typeof c> => !!c)
})

/** 源步骤（无执行/配置逻辑）：编辑态直接内嵌 DataGrid 做数据编辑。 */
const isSourceStep = computed(() => !!step.value && !IMPLEMENTED_STEP_TYPES.has(step.value.type))
const sourceTable = computed(() => {
  const id = step.value?.output.tables[0]
  if (!id || !current.value) return null
  return current.value.tables.find((t) => t.id === id) ?? null
})
const sourceResult = computed<ViewResult | null>(() => {
  if (!current.value || !sourceTable.value) return null
  try {
    return runPipeline(current.value, sourceTable.value.id)
  } catch {
    return null
  }
})

const isQuerySql = computed(() => step.value?.type === 'query-sql')

const sqlStepMeta = computed(() => {
  if (!isQuerySql.value || !step.value) return null
  return {
    lastSyncedAt: typeof step.value.config.lastSyncedAt === 'string' ? step.value.config.lastSyncedAt : '',
    connectionName: typeof step.value.config.connectionName === 'string' ? step.value.config.connectionName : '',
    autoRefresh: !!step.value.config.autoRefresh,
  }
})

const kindTitle = computed(() => {
  const n = props.node
  if (n.kind === 'python-chart') return 'Python chart'
  if (n.kind === 'step') return stepTypeLabel(n.stepType!)
  return isChartNode.value ? viewTypeLabel(n.viewType ?? 'bar') : '视图'
})

const nodeIcon = computed<IconName>(() => {
  const n = props.node
  if (n.kind === 'python-chart') return 'scatter'
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
    case 'report':
      return 'file-text'
    default:
      return 'database'
  }
})

const statusLabel = computed(() => {
  const s = props.node.status
  if (s === 'running') return '执行中'
  if (s === 'pending') return '待配置'
  if (s === 'failed') return '失败'
  if (s === 'stale') return '需重跑'
  return '已配置'
})

const statusClass = computed(() => `sdp__status--${props.node.status ?? 'configured'}`)

const metaChips = computed(() => {
  const chips: string[] = []
  if (props.node.rowCount !== undefined) chips.push(`${props.node.rowCount} 行`)
  if (props.node.columnCount !== undefined) chips.push(`${props.node.columnCount} 列`)
  if (stepCharts.value.length) chips.push(`${stepCharts.value.length} 图`)
  if (sqlStepMeta.value?.lastSyncedAt) chips.push(`同步 ${formatSyncedAt(sqlStepMeta.value.lastSyncedAt)}`)
  return chips
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

/** Table 视图节点：详情预览直接跑 pipeline 展示列表。 */
const isTableView = computed(
  () => props.node.kind === 'view' && props.node.viewType === 'table' && !!props.node.tableId,
)

let previewTimer: ReturnType<typeof setTimeout> | null = null
function schedulePreview() {
  if (!current.value) return
  if (isTableView.value) {
    previewLoading.value = false
    try {
      const r = runPipeline(current.value, props.node.tableId!, props.node.viewId)
      preview.value = { columns: r.columns, rows: r.rows.slice(0, 50), totalRows: r.totalRows }
    } catch (e) {
      preview.value = { columns: [], rows: [], totalRows: 0, error: e instanceof Error ? e.message : '数据计算失败' }
    }
    return
  }
  if (!step.value) {
    preview.value = null
    return
  }
  if (step.value.type === 'custom-code' || step.value.type === 'report') {
    preview.value = null
    previewLoading.value = false
    return
  }
  if (previewTimer) clearTimeout(previewTimer)
  previewLoading.value = true
  previewTimer = setTimeout(() => {
    previewTimer = null
    preview.value = previewStep(current.value!, step.value!, 50)
    previewLoading.value = false
  }, 150)
}

watch(
  () => [step.value?.config, step.value?.id, props.node.id, current.value?.updatedAt],
  schedulePreview,
  { deep: true, immediate: true },
)

watch(() => props.node.id, () => {
  editing.value = props.initialEditing
})

function startEdit() {
  if (!step.value) return
  nameInput.value = step.value.name
  editing.value = true
}

function cancelEdit() {
  editing.value = false
}

/** 源步骤编辑态无保存按钮：改名在名称输入框回车时直接提交。 */
function commitSourceRename() {
  if (!isSourceStep.value || !step.value || !current.value) return
  const name = nameInput.value.trim()
  if (!name || name === step.value.name) return
  store.mutate((a) => {
    const s = a.steps.find((x) => x.id === step.value!.id)
    if (!s) return
    s.name = name
    const outTable = s.output.tables[0] ? a.tables.find((t) => t.id === s.output.tables[0]) : undefined
    if (outTable) outTable.name = name
    if (typeof s.config.tableName === 'string') s.config.tableName = name
  })
}

/** 上传节点重传新内容对话框。 */
const reuploadOpen = ref(false)

function saveEdit() {
  if (!step.value || !current.value) return
  const s = step.value
  const name = nameInput.value.trim()
  if (name) {
    store.mutate(() => {
      s.name = name
      // 源步骤（upload-csv 等无执行逻辑）：重命名同步到输出表
      if (!IMPLEMENTED_STEP_TYPES.has(s.type)) {
        const outTable = s.output.tables[0] ? current.value!.tables.find((t) => t.id === s.output.tables[0]) : undefined
        if (outTable) outTable.name = name
      }
    })
  }
  editing.value = false
  // 保存后默认执行一次
  if (IMPLEMENTED_STEP_TYPES.has(s.type)) {
    void runStepAsync(current.value, s).then(() => {
      store.mutate(() => {})
    })
  }
}

function runStep() {
  if (!step.value || !current.value || !IMPLEMENTED_STEP_TYPES.has(step.value.type)) return
  void runStepAsync(current.value, step.value).then(() => {
    store.mutate(() => {})
  })
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

function onDelete() {
  if (props.node.kind === 'step' && props.node.stepId) {
    emit('delete', props.node.stepId)
  }
}
</script>

<template>
  <aside class="sdp" role="complementary" :aria-label="editing ? '编辑步骤' : '节点预览'">
    <header class="sdp__head">
      <template v-if="!editing">
        <span class="sdp__icon">
          <IIcon :name="nodeIcon" :size="16" />
        </span>
        <div class="sdp__title">
          <span class="sdp__kind">{{ kindTitle }}</span>
          <span class="sdp__name is-ellipsis" :title="node.label">{{ node.label }}</span>
        </div>
        <div class="sdp__layout" role="group" aria-label="详情展示方式">
          <button
            v-for="opt in LAYOUT_OPTIONS"
            :key="opt.value"
            type="button"
            class="sdp__layout-btn"
            :class="{ 'sdp__layout-btn--on': layout === opt.value }"
            :title="opt.label"
            :aria-label="opt.label"
            :aria-pressed="layout === opt.value"
            @click="emit('update:layout', opt.value)"
          >
            <IIcon :name="opt.icon" :size="13" />
          </button>
        </div>
        <button type="button" class="sdp__close" aria-label="关闭" @click="emit('close')">
          <IIcon name="close" :size="14" />
        </button>
      </template>
      <template v-else>
        <button type="button" class="sdp__back" aria-label="返回预览" @click="cancelEdit">
          <IIcon name="chevron-left" :size="14" />
        </button>
        <div class="sdp__title">
          <span class="sdp__kind">编辑 {{ kindTitle }}</span>
          <ITextField v-model="nameInput" size="sm" aria-label="步骤名称" @enter="commitSourceRename" />
        </div>
      </template>
    </header>

    <!-- 预览态 -->
    <div v-if="!editing" class="sdp__body">
      <div v-if="metaChips.length" class="sdp__meta">
        <span v-for="chip in metaChips" :key="chip" class="sdp__chip">{{ chip }}</span>
      </div>

      <section v-if="isPythonChartNode" class="sdp__preview sdp__preview--cc">
        <PlotlyArtifactPreview
          v-if="pythonChart"
          :name="pythonChart.name"
          :plotly-json="pythonChart.plotlyJson"
        />
        <div v-else class="sdp__preview-empty">Python 图已不存在，请重跑 Custom Code</div>
        <p class="sdp__readonly-hint">只读。改图请编辑上游 Custom Code 后重新运行。</p>
      </section>

      <!-- 图表视图预览 -->
      <section v-else-if="isChartNode && node.viewId" class="sdp__preview">
        <FlowChartPreview :table-id="node.tableId ?? ''" :view-id="node.viewId" @open="emit('open')" />
      </section>

      <!-- Custom Code 节点预览（与编辑页同组件，只读） -->
      <section v-else-if="step?.type === 'custom-code'" class="sdp__preview sdp__preview--cc">
        <CustomCodePanel :step="step" readonly />
      </section>

      <!-- 报告节点预览（与编辑页同组件，只读） -->
      <section v-else-if="step?.type === 'report'" class="sdp__preview sdp__preview--report">
        <ReportPanel :step="step" readonly />
      </section>

      <!-- 数据步骤 / Table 视图表格预览 -->
      <section v-else-if="step || isTableView" class="sdp__preview">
        <div v-if="previewLoading" class="sdp__preview-loading">加载预览…</div>
        <div v-else-if="preview?.error" class="sdp__preview-error">{{ preview.error }}</div>
        <template v-else-if="preview && preview.rows.length">
          <div class="sdp__preview-count">{{ preview.totalRows }} 行</div>
          <div class="sdp__preview-table-wrap">
            <table class="sdp__preview-table">
              <thead>
                <tr>
                  <th v-for="c in preview.columns" :key="c.field">{{ c.title }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, i) in preview.rows" :key="i">
                  <td v-for="c in preview.columns" :key="c.field">{{ row[c.field] ?? '' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </template>
        <div v-else class="sdp__preview-empty">无预览数据</div>
      </section>

      <div v-else class="sdp__preview-empty">该节点暂无预览内容</div>
    </div>

    <!-- 编辑态 -->
    <div v-else class="sdp__body sdp__body--editing">
      <template v-if="step">
        <div v-if="isSourceStep && sourceTable && sourceResult" class="sdp__grid-edit">
          <div v-if="step.type === 'upload-csv' || step.type === 'upload-xlsx'" class="sdp__reupload">
            <IButton size="sm" variant="secondary" icon="upload" @click="reuploadOpen = true">上传新内容</IButton>
            <span class="sdp__reupload-hint">替换当前节点数据，下游自动同步</span>
          </div>
          <DataGrid :table-id="sourceTable.id" :result="sourceResult" />
          <CsvImportDialog
            v-if="step.type === 'upload-csv'"
            :open="reuploadOpen"
            :replace-table-id="sourceTable.id"
            @update:open="reuploadOpen = $event"
          />
          <ExcelImportDialog
            v-else-if="step.type === 'upload-xlsx'"
            :open="reuploadOpen"
            :replace-table-id="sourceTable.id"
            @update:open="reuploadOpen = $event"
          />
        </div>
        <StepConfigForm v-else :step="step" @change="schedulePreview" />
      </template>
      <div v-else class="sdp__preview-empty">该节点不支持配置</div>
    </div>

    <footer class="sdp__foot">
      <div class="sdp__foot-status">
        <span class="sdp__status" :class="statusClass">{{ statusLabel }}</span>
        <span v-if="node.error" class="sdp__error" :title="node.error">{{ node.error }}</span>
      </div>
      <template v-if="!editing">
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
          <IButton variant="ghost" icon="trash" @click="onDelete">删除</IButton>
        </template>
        <IButton
          v-if="node.kind === 'step' && step && IMPLEMENTED_STEP_TYPES.has(step.type)"
          variant="secondary"
          icon="play"
          @click="runStep"
        >
          运行
        </IButton>
        <IButton v-if="step" variant="secondary" icon="edit" @click="startEdit">编辑</IButton>
        <IButton v-if="!isPythonChartNode" variant="primary" icon="external" @click="emit('open')">在工作区打开</IButton>
      </template>
      <template v-else>
        <IButton variant="ghost" icon="trash" @click="onDelete">删除</IButton>
        <!-- 源步骤的数据保存由 DataGrid「编辑数据」会话负责，footer 不再重复提供取消/保存 -->
        <div v-if="!isSourceStep" class="sdp__foot-right">
          <IButton @click="cancelEdit">取消</IButton>
          <IButton variant="primary" @click="saveEdit">保存</IButton>
        </div>
      </template>
    </footer>
  </aside>
</template>

<style scoped>
.sdp {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  background: var(--is-surface);
  overflow: hidden;
}

.sdp__head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--is-border);
  flex-shrink: 0;
}
.sdp__icon {
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
.sdp__title {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.sdp__kind {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--is-text-tertiary);
}
.sdp__name {
  font-size: var(--is-text-md);
  font-weight: 600;
}
.sdp__layout {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 2px;
  border: 1px solid var(--is-border);
  border-radius: var(--is-radius-sm);
  flex-shrink: 0;
}
.sdp__layout-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 3px;
  color: var(--is-text-tertiary);
}
.sdp__layout-btn:hover {
  background: var(--is-surface-hover);
  color: var(--is-text);
}
.sdp__layout-btn--on {
  background: var(--is-accent-soft);
  color: var(--is-accent);
}
.sdp__close,
.sdp__back {
  display: inline-flex;
  padding: 5px;
  border-radius: var(--is-radius-sm);
  color: var(--is-text-tertiary);
  flex-shrink: 0;
}
.sdp__close:hover,
.sdp__back:hover {
  background: var(--is-surface-hover);
  color: var(--is-text);
}

.sdp__body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.sdp__body--editing {
  padding: 0;
}
.sdp__grid-edit {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.sdp__reupload {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--is-border);
  flex-shrink: 0;
}
.sdp__reupload-hint {
  font-size: var(--is-text-xs);
  color: var(--is-text-tertiary);
}

.sdp__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}
.sdp__status {
  display: inline-flex;
  align-items: center;
  height: 22px;
  padding: 0 8px;
  white-space: nowrap;
  flex-shrink: 0;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  background: rgba(46, 160, 90, 0.12);
  color: #1b7a45;
}
.sdp__status--pending {
  background: var(--is-warning-bg);
  color: var(--is-warning-text);
}
.sdp__status--failed {
  background: var(--is-danger-soft);
  color: var(--is-danger);
}
.sdp__status--stale {
  background: #fff4e5;
  color: #b54708;
}
.sdp__status--running {
  background: var(--is-accent-soft);
  color: var(--is-accent);
}
.sdp__chip {
  font-size: 11px;
  color: var(--is-text-tertiary);
  background: var(--is-surface-hover);
  padding: 3px 8px;
  border-radius: 999px;
}
.sdp__error {
  font-size: 11px;
  color: var(--is-danger);
  background: var(--is-danger-soft);
  padding: 3px 8px;
  border-radius: 4px;
  max-width: 100%;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sdp__preview {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 0;
}
.sdp__preview--report {
  flex: 1;
  min-height: 420px;
}
.sdp__preview--cc {
  flex: 1;
  min-height: 420px;
}
.sdp__preview-loading,
.sdp__preview-error,
.sdp__preview-empty {
  padding: 24px;
  text-align: center;
  font-size: var(--is-text-sm);
  color: var(--is-text-tertiary);
}
.sdp__preview-error {
  color: var(--is-danger);
}
.sdp__readonly-hint {
  margin: 8px 0 0;
  font-size: var(--is-text-xs);
  color: var(--is-text-tertiary);
}
.sdp__preview-count {
  font-size: var(--is-text-xs);
  color: var(--is-text-tertiary);
}
.sdp__preview-table-wrap {
  overflow: auto;
  border: 1px solid var(--is-border);
  border-radius: 6px;
  max-height: 400px;
}
.sdp__preview-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--is-text-xs);
}
.sdp__preview-table th,
.sdp__preview-table td {
  padding: 6px 10px;
  border-bottom: 1px solid var(--is-border);
  text-align: left;
}
.sdp__preview-table th {
  background: var(--is-surface-hover);
  font-weight: 600;
  position: sticky;
  top: 0;
}

.sdp__foot {
  padding: 12px 16px;
  border-top: 1px solid var(--is-border);
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  flex-shrink: 0;
}
.sdp__foot-status {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-right: auto;
  min-width: 0;
}
.sdp__foot-right {
  display: flex;
  gap: 8px;
}
</style>
