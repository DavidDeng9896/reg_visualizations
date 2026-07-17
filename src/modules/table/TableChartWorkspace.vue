<template>
  <div v-if="store.workspaceResult" class="ws">
    <a class="skip-link" href="#ws-toolbar">跳到工具栏</a>
    <div id="ws-toolbar" class="ws-toolbar" role="toolbar" aria-label="视图与数据工具栏" tabindex="-1">
      <template v-if="store.selectedView">
        <div class="tb-group" role="group" aria-label="视图">
          <span class="tb-label">视图</span>
          <el-input
            v-model="viewName"
            size="small"
            style="width: 180px"
            aria-label="视图名称"
            @change="store.renameNode(store.selectedView.view.id, viewName)"
          />
          <el-select
            v-model="viewType"
            size="small"
            style="width: 150px"
            aria-label="视图类型"
            @change="onViewType"
          >
            <el-option v-for="t in viewTypeOptions" :key="t.value" :label="t.label" :value="t.value" />
          </el-select>
        </div>
        <div class="tb-group" role="group" aria-label="布局">
          <span class="tb-label">布局</span>
          <el-select
            v-model="chartPos"
            size="small"
            style="width: 140px"
            aria-label="图表位置"
            :disabled="viewType === 'table'"
            @change="onPos"
          >
            <el-option label="图在下" value="bottom" />
            <el-option label="图在上" value="top" />
            <el-option label="图在左" value="left" />
            <el-option label="图在右" value="right" />
          </el-select>
          <button
            type="button"
            class="btn"
            :disabled="viewType === 'table'"
            @click="showChartEdit = true"
          >
            Edit 图表
          </button>
        </div>
        <div class="tb-group" role="group" aria-label="数据">
          <span class="tb-label">数据</span>
          <button type="button" class="btn" @click="showTransforms = true">过滤 / 转换</button>
          <button type="button" class="btn" @click="exportCsv">导出 CSV</button>
        </div>
      </template>
      <template v-else-if="store.selectedTable">
        <div class="tb-group" role="group" aria-label="表操作">
          <strong>{{ store.selectedTable.name }}</strong>
          <button type="button" class="btn btn-primary-plain" @click="quickView">New view</button>
          <button type="button" class="btn" @click="exportCsv">导出 CSV</button>
        </div>
      </template>
      <span class="row-count" aria-label="行列数">{{ rowCountLabel }}</span>
    </div>

    <div v-if="showLayoutHint" class="layout-hint" role="status">
      <span>窄屏下左右布局已临时改为上下排列，保证表与图均可操作；加宽窗口后恢复。</span>
      <button type="button" class="hint-dismiss" @click="onDismissLayoutHint">不再提示</button>
    </div>

    <div
      id="ws-main"
      ref="bodyRef"
      class="ws-body"
      :class="layoutClass"
      :style="splitStyle"
      tabindex="-1"
    >
      <div v-if="showChartPane" class="chart-pane" :style="chartPaneStyle">
        <ChartPanel
          :view-type="viewType"
          :columns="store.workspaceResult.columns"
          :rows="store.workspaceResult.rows"
          :config="chartConfig"
          @update:config="onChartSave"
          @open-edit="showChartEdit = true"
        />
      </div>
      <div
        v-if="showChartPane"
        ref="splitterRef"
        class="splitter"
        :class="splitterOrientation"
        role="separator"
        :aria-orientation="splitterOrientation === 'vertical' ? 'vertical' : 'horizontal'"
        aria-label="拖拽调整表图占比"
        :aria-valuenow="Math.round(splitRatio * 100)"
        :aria-valuemin="20"
        :aria-valuemax="80"
        :aria-valuetext="`图表区占比 ${Math.round(splitRatio * 100)}%`"
        tabindex="0"
        @pointerdown="onSplitterDown"
        @keydown="onSplitterKey"
      />
      <div class="table-pane" :style="tablePaneStyle">
        <EditableGrid
          :columns="store.workspaceResult.columns"
          :model-value="store.workspaceResult.rows"
          :editable="store.canEditGrid"
          :read-only-hint="gridReadOnlyHint"
          @update:model-value="onRows"
        />
      </div>
    </div>

    <TransformDialog v-model="showTransforms" />
    <ChartEditDrawer
      v-model="showChartEdit"
      :config="chartConfig"
      :columns="store.workspaceResult.columns"
      :rows="store.workspaceResult.rows"
      :view-type="viewType"
      :default-title="viewName || store.selectedTable?.name"
      @save="onChartSave"
    />
  </div>
  <div v-else class="empty">
    <h3>开始分析</h3>
    <p>从侧栏选择表或视图，或使用「+ Add data」导入 CSV / 合并表。</p>
  </div>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useAnalysisStore } from '@/modules/analysis/stores/analysisStore'
import type { ChartConfig, ChartPosition, ViewType } from '@/shared/types/analysis'
import EditableGrid from './EditableGrid.vue'
import ChartPanel from '@/modules/chart/ChartPanel.vue'

const TransformDialog = defineAsyncComponent(() => import('@/modules/transform/TransformDialog.vue'))
const ChartEditDrawer = defineAsyncComponent(() => import('@/modules/chart/ChartEditDrawer.vue'))
import { cloneDeep } from '@/shared/utils/clone'
import { guessConfigure } from '@/modules/chart/guessMapping'
import {
  clampSplitRatio,
  DEFAULT_SPLIT_RATIO,
  effectiveChartPosition,
} from './layout'
import { dismissLayoutHint, isLayoutHintDismissed } from './layoutPrefs'

const store = useAnalysisStore()
const showTransforms = ref(false)
const showChartEdit = ref(false)
const bodyRef = ref<HTMLElement | null>(null)
const splitterRef = ref<HTMLElement | null>(null)
const viewportWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 1200)
const splitRatio = ref(DEFAULT_SPLIT_RATIO)
const dragging = ref(false)
const layoutHintDismissed = ref(isLayoutHintDismissed())

const viewTypeOptions: { value: ViewType; label: string }[] = [
  { value: 'table', label: '表格 table' },
  { value: 'bar', label: '柱状 bar' },
  { value: 'line', label: '折线 line' },
  { value: 'scatter', label: '散点 scatter' },
  { value: 'box', label: '箱线 box' },
  { value: 'pie', label: '饼图 pie' },
  { value: 'heatmap', label: '热力 heatmap' },
]

const viewName = ref('')
const viewType = ref<ViewType>('table')
const chartPos = ref<ChartPosition>('bottom')
const chartConfig = ref<ChartConfig>(store.defaultChartConfig())

watch(
  () => store.selectedView,
  (sv) => {
    if (!sv) return
    viewName.value = sv.view.name
    viewType.value = sv.view.viewType
    chartPos.value = sv.view.chartConfig.chartPosition
    chartConfig.value = cloneDeep(sv.view.chartConfig)
    splitRatio.value = clampSplitRatio(sv.view.chartConfig.splitRatio)
  },
  { immediate: true },
)

const showChartPane = computed(() => store.selectedView && viewType.value !== 'table')

const layoutInfo = computed(() =>
  effectiveChartPosition(chartPos.value, viewportWidth.value),
)
const layoutDegraded = computed(() => showChartPane.value && layoutInfo.value.degraded)
const showLayoutHint = computed(() => layoutDegraded.value && !layoutHintDismissed.value)
const effectivePos = computed(() => layoutInfo.value.position)

const layoutClass = computed(() => {
  if (!showChartPane.value) return 'only-table'
  return `pos-${effectivePos.value}`
})

const splitterOrientation = computed(() =>
  effectivePos.value === 'left' || effectivePos.value === 'right' ? 'vertical' : 'horizontal',
)

const chartPaneStyle = computed(() => {
  if (!showChartPane.value) return {}
  const r = splitRatio.value
  if (splitterOrientation.value === 'horizontal') {
    return { flex: `${r} 1 0`, minHeight: '160px' }
  }
  return { flex: `${r} 1 0`, minWidth: '240px' }
})

const tablePaneStyle = computed(() => {
  if (!showChartPane.value) return { flex: '1 1 auto' }
  const r = 1 - splitRatio.value
  if (splitterOrientation.value === 'horizontal') {
    return { flex: `${r} 1 0`, minHeight: '140px' }
  }
  return { flex: `${r} 1 0`, minWidth: '240px' }
})

const splitStyle = computed(() => (dragging.value ? { userSelect: 'none' as const } : {}))

const rowCountLabel = computed(() => {
  const n = store.workspaceResult?.rows.length ?? 0
  const cols = store.workspaceResult?.columns.length ?? 0
  return `${n.toLocaleString()} 行 · ${cols} 列`
})

const gridReadOnlyHint = computed(() => {
  if (store.canEditGrid) return ''
  if (store.selectedView && store.selectedView.view.viewType !== 'table') {
    return '图表视图中的数据表为只读预览；切到源表或提升为表后可编辑'
  }
  return '当前视图含过滤/转换，表格只读；可提升为表后编辑'
})

function onViewport() {
  viewportWidth.value = window.innerWidth
}

onMounted(() => {
  window.addEventListener('resize', onViewport, { passive: true })
  onViewport()
  // Warm Edit/Transform async chunks after paint so first open is reliable.
  void import('@/modules/chart/ChartEditDrawer.vue')
  void import('@/modules/transform/TransformDialog.vue')
})
onUnmounted(() => {
  window.removeEventListener('resize', onViewport)
  window.removeEventListener('pointermove', onSplitterMove)
  window.removeEventListener('pointerup', onSplitterUp)
})

function onDismissLayoutHint() {
  dismissLayoutHint()
  layoutHintDismissed.value = true
}

function focusSplitter() {
  void nextTick(() => {
    splitterRef.value?.focus()
  })
}

function persistSplitRatio(ratio: number) {
  splitRatio.value = clampSplitRatio(ratio)
  if (!store.selectedView) return
  const next = { ...chartConfig.value, splitRatio: splitRatio.value }
  chartConfig.value = next
  store.setChartConfig(store.selectedView.view.id, next)
}

function onSplitterDown(e: PointerEvent) {
  e.preventDefault()
  dragging.value = true
  ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
  window.addEventListener('pointermove', onSplitterMove)
  window.addEventListener('pointerup', onSplitterUp)
}

function onSplitterMove(e: PointerEvent) {
  if (!dragging.value || !bodyRef.value) return
  const rect = bodyRef.value.getBoundingClientRect()
  let ratio: number
  if (splitterOrientation.value === 'horizontal') {
    const y = e.clientY - rect.top
    ratio = effectivePos.value === 'top' ? y / rect.height : 1 - y / rect.height
  } else {
    const x = e.clientX - rect.left
    ratio = effectivePos.value === 'left' ? x / rect.width : 1 - x / rect.width
  }
  splitRatio.value = clampSplitRatio(ratio)
}

function onSplitterUp() {
  if (!dragging.value) return
  dragging.value = false
  window.removeEventListener('pointermove', onSplitterMove)
  window.removeEventListener('pointerup', onSplitterUp)
  persistSplitRatio(splitRatio.value)
}

function onSplitterKey(e: KeyboardEvent) {
  const step = e.shiftKey ? 0.08 : 0.03
  let next = splitRatio.value
  if (e.key === 'Home') {
    e.preventDefault()
    persistSplitRatio(0.2)
    return
  }
  if (e.key === 'End') {
    e.preventDefault()
    persistSplitRatio(0.8)
    return
  }
  if (splitterOrientation.value === 'horizontal') {
    if (e.key === 'ArrowUp') next += effectivePos.value === 'top' ? -step : step
    else if (e.key === 'ArrowDown') next += effectivePos.value === 'top' ? step : -step
    else return
  } else {
    if (e.key === 'ArrowLeft') next += effectivePos.value === 'left' ? -step : step
    else if (e.key === 'ArrowRight') next += effectivePos.value === 'left' ? step : -step
    else return
  }
  e.preventDefault()
  persistSplitRatio(next)
}

function onViewType(t: ViewType) {
  if (!store.selectedView) return
  const cols = store.workspaceResult?.columns || store.selectedView.table.columns
  const next = {
    ...chartConfig.value,
    configure: guessConfigure(t, cols, chartConfig.value.configure),
    splitRatio: splitRatio.value,
  }
  chartConfig.value = next
  viewType.value = t
  store.updateView(store.selectedView.view.id, { viewType: t, chartConfig: next })
  if (t !== 'table') focusSplitter()
}

function onPos(p: ChartPosition) {
  if (!store.selectedView) return
  store.setChartPosition(store.selectedView.view.id, p)
  focusSplitter()
}

function onChartSave(cfg: ChartConfig) {
  const next = { ...cfg, splitRatio: splitRatio.value, chartPosition: chartPos.value }
  chartConfig.value = next
  if (!store.selectedView) return
  store.setChartConfig(store.selectedView.view.id, next)
  showChartEdit.value = false
}

function onRows(rows: Record<string, unknown>[]) {
  if (store.selectedTable) {
    store.updateTableRows(store.selectedTable.id, rows)
  } else if (store.selectedView && store.canEditGrid) {
    store.updateTableRows(store.selectedView.table.id, rows)
  }
}

function quickView() {
  if (!store.selectedTable) return
  store.addView(store.selectedTable.id, store.selectedTable.id, 'New view', 'table')
}

function exportCsv() {
  const res = store.workspaceResult
  if (!res) return
  const header = res.columns.map((c) => c.field).join(',')
  const lines = res.rows.map((r) =>
    res.columns.map((c) => JSON.stringify(r[c.field] ?? '')).join(','),
  )
  const blob = new Blob([[header, ...lines].join('\n')], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'export.csv'
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<style scoped>
.ws {
  height: 100%;
  display: flex;
  flex-direction: column;
  position: relative;
}
.skip-link {
  position: absolute;
  left: -9999px;
  top: 0;
  z-index: 20;
  padding: 8px 12px;
  background: var(--ia-accent);
  color: #fff;
  font-size: 13px;
  text-decoration: none;
  border-radius: 0 0 4px 0;
}
.skip-link:focus {
  left: 0;
}
.ws-toolbar {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 8px 10px;
  background: #fff;
  border-bottom: 1px solid var(--ia-border);
  flex-wrap: wrap;
}
.tb-group {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding-right: 10px;
  border-right: 1px solid var(--ia-border);
}
.tb-group:last-of-type {
  border-right: none;
  padding-right: 0;
}
.tb-label {
  font-size: 11px;
  font-weight: 600;
  color: #8a9199;
  text-transform: none;
  letter-spacing: 0.02em;
  white-space: nowrap;
}
.row-count {
  margin-left: auto;
  font-size: 12px;
  line-height: 22px;
  color: #646a73;
  background: #f2f3f5;
  border-radius: 4px;
  padding: 0 8px;
  white-space: nowrap;
}
.btn {
  height: 28px;
  padding: 0 10px;
  border: 1px solid var(--ia-border);
  border-radius: 6px;
  background: #fff;
  color: #1f2329;
  font: inherit;
  font-size: 12px;
  cursor: pointer;
}
.btn:hover:not(:disabled) {
  border-color: var(--ia-accent);
  color: var(--ia-accent);
}
.btn:focus-visible {
  outline: 2px solid var(--ia-accent);
  outline-offset: 1px;
}
.btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.btn-primary-plain {
  color: var(--ia-accent);
  border-color: color-mix(in srgb, var(--ia-accent) 45%, #fff);
  background: color-mix(in srgb, var(--ia-accent) 8%, #fff);
}
.btn-primary-plain:hover:not(:disabled) {
  background: color-mix(in srgb, var(--ia-accent) 14%, #fff);
  color: var(--ia-accent);
}
.layout-hint {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 6px 12px;
  font-size: 12px;
  color: #8a6d3b;
  background: #fff8e6;
  border-bottom: 1px solid #f0e0b2;
}
.hint-dismiss {
  flex-shrink: 0;
  border: 1px solid #e0c98a;
  background: #fff;
  color: #8a6d3b;
  border-radius: 4px;
  padding: 2px 8px;
  font-size: 12px;
  cursor: pointer;
}
.hint-dismiss:hover {
  background: #fff3d1;
}
.ws-body {
  flex: 1;
  min-height: 0;
  display: flex;
}
.ws-body.only-table .table-pane {
  flex: 1;
}
.ws-body.pos-bottom {
  flex-direction: column;
}
.ws-body.pos-top {
  flex-direction: column;
}
.ws-body.pos-top .chart-pane {
  order: 0;
}
.ws-body.pos-top .splitter {
  order: 1;
}
.ws-body.pos-top .table-pane {
  order: 2;
}
.ws-body.pos-bottom .chart-pane {
  order: 2;
}
.ws-body.pos-bottom .splitter {
  order: 1;
}
.ws-body.pos-bottom .table-pane {
  order: 0;
}
.ws-body.pos-right {
  flex-direction: row;
}
.ws-body.pos-left {
  flex-direction: row;
}
.ws-body.pos-left .chart-pane {
  order: 0;
}
.ws-body.pos-left .splitter {
  order: 1;
}
.ws-body.pos-left .table-pane {
  order: 2;
}
.ws-body.pos-right .chart-pane {
  order: 2;
}
.ws-body.pos-right .splitter {
  order: 1;
}
.ws-body.pos-right .table-pane {
  order: 0;
}
.chart-pane {
  min-height: 160px;
  min-width: 240px;
  background: #fff;
  overflow: hidden;
}
.table-pane {
  min-height: 140px;
  min-width: 240px;
  overflow: hidden;
}
.splitter {
  flex: 0 0 6px;
  background: var(--ia-border);
  position: relative;
  z-index: 2;
  transition: background 0.15s ease;
}
.splitter:hover,
.splitter:focus-visible {
  background: var(--ia-accent);
  outline: none;
}
.splitter.horizontal {
  cursor: row-resize;
}
.splitter.vertical {
  cursor: col-resize;
}
.empty {
  padding: 48px 24px;
  color: #646a73;
  text-align: center;
}
.empty h3 {
  margin: 0 0 8px;
  color: #1f2329;
  font-size: 18px;
}
.empty p {
  margin: 0;
  font-size: 14px;
}
</style>
