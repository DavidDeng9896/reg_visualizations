<template>
  <div v-if="store.workspaceResult" class="ws">
    <!-- Transform teleports to body (R35); mainBehind inerts #workspace-main. -->
    <div class="ws-surface">
    <a
      v-show="!showChartEdit && !showTransforms"
      class="skip-link"
      data-ia-skip="1"
      href="#ws-toolbar"
    >跳到工具栏</a>
    <div id="ws-toolbar" class="ws-toolbar" role="toolbar" aria-label="视图与数据工具栏" tabindex="-1" :class="{ 'is-compact': toolbarCompact }">
      <template v-if="store.selectedView">
        <div class="tb-group" role="group" aria-label="视图">
          <span class="tb-label">视图</span>
          <input
            v-model="viewName"
            type="text"
            class="tb-input"
            style="width: 180px"
            aria-label="视图名称"
            autocomplete="off"
            @change="onRename"
          />
          <div class="tb-select-wrap">
            <select
              v-model="viewType"
              class="tb-select"
              :style="{ width: `${viewTypeSelectWidth}px` }"
              aria-label="视图类型"
              :data-current="viewTypeCurrentLabel"
              @change="onViewType(viewType)"
            >
              <option v-for="t in viewTypeOptions" :key="t.value" :value="t.value">{{ t.label }}</option>
            </select>
            <span class="tb-current" aria-hidden="true">{{ viewTypeCurrentLabel }}</span>
          </div>
        </div>
        <div class="tb-group" role="group" aria-label="布局">
          <span class="tb-label">布局</span>
          <div
            class="pos-seg"
            role="group"
            aria-label="图表位置快捷切换"
            aria-controls="ws-main"
            :aria-disabled="viewType === 'table' || undefined"
          >
            <button
              v-for="p in chartPosOptions"
              :key="p.value"
              type="button"
              class="pos-seg-btn"
              :aria-pressed="chartPos === p.value"
              :aria-label="p.label"
              :disabled="viewType === 'table'"
              :title="p.label"
              @click="onPos(p.value)"
            >
              {{ p.short }}
            </button>
          </div>
          <div v-if="!toolbarCompact" class="tb-select-wrap tb-pos-select">
            <select
              v-model="chartPos"
              class="tb-select"
              style="width: 110px"
              aria-label="图表位置"
              :disabled="viewType === 'table'"
              :data-current="chartPosCurrentLabel"
              @change="onPos(chartPos)"
            >
              <option v-for="p in chartPosOptions" :key="p.value" :value="p.value">{{ p.label }}</option>
            </select>
            <span class="tb-current" aria-hidden="true">{{ chartPosCurrentLabel }}</span>
          </div>
          <button
            type="button"
            class="btn"
            :disabled="viewType === 'table'"
            @click="openChartEdit"
            @pointerenter="warmEditChunk"
            @focus="warmEditChunk"
          >
            Edit 图表
          </button>
        </div>
        <div class="tb-group" role="group" aria-label="数据">
          <span class="tb-label">数据</span>
          <template v-if="!toolbarCompact">
            <button type="button" class="btn" @click="openTransforms" @pointerenter="warmTransformChunk" @focus="warmTransformChunk">过滤 / 转换</button>
            <button type="button" class="btn" @click="exportCsv">导出 CSV</button>
          </template>
          <details
            v-else
            ref="moreDetailsRef"
            class="tb-more"
            @toggle="onMoreToggle"
            @keydown="onMoreKeydown"
          >
            <summary
              class="btn tb-more-summary"
              aria-label="更多数据操作"
              :style="moreTouchStyle"
            >
              更多
            </summary>
            <div class="tb-more-menu" role="menu" aria-label="更多数据操作">
              <button
                type="button"
                class="btn tb-more-item"
                role="menuitem"
                :style="moreTouchStyle"
                @click="openTransforms"
                @pointerenter="warmTransformChunk"
                @focus="warmTransformChunk"
              >
                过滤 / 转换
              </button>
              <button
                type="button"
                class="btn tb-more-item"
                role="menuitem"
                :style="moreTouchStyle"
                @click="exportCsv"
              >
                导出 CSV
              </button>
            </div>
          </details>
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

    <div
      v-if="noViewsHint"
      class="no-views-hint"
      role="region"
      aria-label="新建视图引导"
    >
      <div class="no-views-hint__text">
        <strong>{{ noViewsHint.title }}</strong>
        <p>{{ noViewsHint.body }}</p>
      </div>
      <button
        type="button"
        class="btn btn-primary empty-cta"
        :aria-label="tableNoViewsCtaAria()"
        @click="quickView"
      >
        New view
      </button>
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
      <div v-if="showChartPane" :id="CHART_PANE_ID" class="chart-pane" :style="chartPaneStyle">
        <ChartPanel
          :view-type="viewType"
          :columns="store.workspaceResult.columns"
          :rows="store.workspaceResult.rows"
          :config="chartConfig"
          @update:config="onChartSave"
          @open-edit="openChartEdit"
        />
      </div>
      <div
        v-if="showChartPane"
        ref="splitterRef"
        class="splitter"
        :class="splitterOrientation"
        role="separator"
        :aria-orientation="splitterOrientation === 'vertical' ? 'vertical' : 'horizontal'"
        aria-label="拖拽调整表图占比，双击恢复默认"
        :aria-controls="splitterAriaControls()"
        :aria-valuenow="Math.round(splitRatio * 100)"
        :aria-valuemin="20"
        :aria-valuemax="80"
        :aria-valuetext="splitRatioLiveText(splitRatio)"
        tabindex="0"
        @pointerdown="onSplitterDown"
        @keydown="onSplitterKey"
        @dblclick="onSplitterDblClick"
      />
      <div :id="TABLE_PANE_ID" class="table-pane" :style="tablePaneStyle">
        <EditableGrid
          :columns="store.workspaceResult.columns"
          :model-value="store.workspaceResult.rows"
          :editable="store.canEditGrid"
          :read-only-hint="gridReadOnlyHint"
          @update:model-value="onRows"
        />
      </div>
    </div>

    <p
      v-if="showChartPane && splitLiveAnnounce"
      class="sr-only"
      role="status"
      aria-live="polite"
    >{{ splitLiveAnnounce }}</p>

    </div>

    <TransformDialog v-if="showTransforms" v-model="showTransforms" />
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
  <div v-else class="empty" v-bind="workspaceEmptyRegionAttrs()">
    <h3>{{ emptyCopy.title }}</h3>
    <p>{{ emptyCopy.body }}</p>
    <div class="empty__cta">
      <button
        type="button"
        class="btn btn-primary empty-cta"
        :aria-label="workspaceEmptyCtaAria('csv')"
        @click="emit('add-data', 'csv')"
      >
        导入 CSV
      </button>
      <button
        type="button"
        class="btn empty-cta"
        :aria-label="workspaceEmptyCtaAria('combine')"
        @click="emit('add-data', 'combine')"
      >
        合并表
      </button>
    </div>
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
  CHART_PANE_ID,
  clampSplitRatio,
  DEFAULT_SPLIT_RATIO,
  effectiveChartPosition,
  resetSplitRatio,
  splitRatioLiveText,
  splitterAriaControls,
  TABLE_PANE_ID,
} from './layout'
import { dismissLayoutHint, isLayoutHintDismissed } from './layoutPrefs'
import {
  isToolbarCompact,
  toolbarMoreTouchMinPx,
  toolbarViewTypeSelectWidth,
} from './toolbarLayout'
import {
  workspaceEmptyCopy,
  workspaceEmptyCtaAria,
  workspaceEmptyRegionAttrs,
} from './workspaceEmpty'
import { tableNoViewsCtaAria, tableNoViewsHint } from './tableNoViewsHint'
import { warmIdle } from '@/shared/ui/warmIdle'
import { handleMenuKeydown } from '@/shared/ui/menuNav'
import { setWorkspaceDialogOpen } from '@/modules/analysis/workspaceOverlay'

const emit = defineEmits<{ 'add-data': [cmd: string]; 'request-new-view': [] }>()
const store = useAnalysisStore()
const showTransforms = ref(false)
const showChartEdit = ref(false)
let editChunkWarmed = false
let transformChunkWarmed = false
const bodyRef = ref<HTMLElement | null>(null)
const splitterRef = ref<HTMLElement | null>(null)
const viewportWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 1200)
const splitRatio = ref(DEFAULT_SPLIT_RATIO)
const dragging = ref(false)
const splitLiveAnnounce = ref('')
let splitLiveClearTimer: ReturnType<typeof setTimeout> | null = null
const layoutHintDismissed = ref(isLayoutHintDismissed())

watch(showTransforms, (open) => setWorkspaceDialogOpen('transform', open))
watch(showChartEdit, (open) => setWorkspaceDialogOpen('chartEdit', open))

const viewTypeOptions: { value: ViewType; label: string }[] = [
  { value: 'table', label: '表格 table' },
  { value: 'bar', label: '柱状 bar' },
  { value: 'line', label: '折线 line' },
  { value: 'scatter', label: '散点 scatter' },
  { value: 'box', label: '箱线 box' },
  { value: 'pie', label: '饼图 pie' },
  { value: 'heatmap', label: '热力 heatmap' },
]

const chartPosOptions: { value: ChartPosition; label: string; short: string }[] = [
  { value: 'bottom', label: '图在下', short: '下' },
  { value: 'top', label: '图在上', short: '上' },
  { value: 'left', label: '图在左', short: '左' },
  { value: 'right', label: '图在右', short: '右' },
]

const viewName = ref('')
const viewType = ref<ViewType>('table')
const chartPos = ref<ChartPosition>('bottom')
const chartConfig = ref<ChartConfig>(store.defaultChartConfig())

const viewTypeCurrentLabel = computed(
  () => viewTypeOptions.find((t) => t.value === viewType.value)?.label ?? viewType.value,
)
const chartPosCurrentLabel = computed(
  () => chartPosOptions.find((p) => p.value === chartPos.value)?.label ?? chartPos.value,
)
const toolbarCompact = computed(() => isToolbarCompact(viewportWidth.value))
const viewTypeSelectWidth = computed(() => toolbarViewTypeSelectWidth(toolbarCompact.value))
const moreTouchMin = computed(() => toolbarMoreTouchMinPx(toolbarCompact.value))
const moreTouchStyle = computed(() => {
  const px = moreTouchMin.value
  return px == null ? undefined : { minHeight: `${px}px` }
})
const emptyCopy = computed(() =>
  workspaceEmptyCopy({ hasTables: (store.current?.tables.length ?? 0) > 0 }),
)
const noViewsHint = computed(() => {
  const table = store.selectedTable
  if (!table) return null
  return tableNoViewsHint({ viewCount: table.views.length })
})
const moreDetailsRef = ref<HTMLDetailsElement | null>(null)
const moreMenuIndex = ref<number | null>(null)
const moreMenuItems = [{ disabled: false }, { disabled: false }]

function focusMoreMenuItem(index: number | null) {
  moreMenuIndex.value = index
  if (index === null) return
  void nextTick(() => {
    const buttons = moreDetailsRef.value?.querySelectorAll<HTMLButtonElement>('.tb-more-menu .btn')
    buttons?.[index]?.focus()
  })
}

function closeMoreMenu() {
  const el = moreDetailsRef.value
  if (el) el.open = false
  moreMenuIndex.value = null
  void nextTick(() => {
    moreDetailsRef.value?.querySelector<HTMLElement>('summary')?.focus()
  })
}

function onMoreKeydown(e: KeyboardEvent) {
  const el = moreDetailsRef.value
  if (!el?.open) return
  handleMenuKeydown(e, moreMenuItems, {
    getActiveIndex: () => moreMenuIndex.value,
    setActiveIndex: (index) => focusMoreMenuItem(index),
    onActivate: (index) => {
      const buttons = el.querySelectorAll<HTMLButtonElement>('.tb-more-menu .btn')
      buttons[index]?.click()
      closeMoreMenu()
    },
    onClose: () => closeMoreMenu(),
  })
}

function onMoreToggle(e: Event) {
  const el = e.target as HTMLDetailsElement
  if (!el.open) {
    moreMenuIndex.value = null
    return
  }
  moreMenuIndex.value = 0
  void nextTick(() => focusMoreMenuItem(0))
  const close = (ev: PointerEvent) => {
    if (!el.contains(ev.target as Node)) {
      el.open = false
      document.removeEventListener('pointerdown', close, true)
    }
  }
  document.addEventListener('pointerdown', close, true)
}

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

function warmEditChunk() {
  if (editChunkWarmed) return
  editChunkWarmed = true
  void import('@/modules/chart/ChartEditDrawer.vue')
}

function warmTransformChunk() {
  if (transformChunkWarmed) return
  transformChunkWarmed = true
  void import('@/modules/transform/TransformDialog.vue')
}

function openChartEdit() {
  warmEditChunk()
  showChartEdit.value = true
}

function openTransforms() {
  warmTransformChunk()
  showTransforms.value = true
}

onMounted(() => {
  window.addEventListener('resize', onViewport, { passive: true })
  onViewport()
  // Defer Edit/Transform EP buckets until idle so first paint stays lean;
  // hover/focus/open still warms on intent for reliable first open.
  warmIdle(() => {
    warmEditChunk()
    warmTransformChunk()
  }, 5000)
})
onUnmounted(() => {
  window.removeEventListener('resize', onViewport)
  window.removeEventListener('pointermove', onSplitterMove)
  window.removeEventListener('pointerup', onSplitterUp)
  if (splitLiveClearTimer) {
    clearTimeout(splitLiveClearTimer)
    splitLiveClearTimer = null
  }
  setWorkspaceDialogOpen('transform', false)
  setWorkspaceDialogOpen('chartEdit', false)
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

function announceSplitRatio(ratio: number) {
  const text = splitRatioLiveText(ratio)
  // Retrigger polite live region when the same percentage repeats.
  splitLiveAnnounce.value = ''
  void nextTick(() => {
    splitLiveAnnounce.value = text
  })
  if (splitLiveClearTimer) clearTimeout(splitLiveClearTimer)
  splitLiveClearTimer = setTimeout(() => {
    splitLiveAnnounce.value = ''
    splitLiveClearTimer = null
  }, 1500)
}

function persistSplitRatio(ratio: number, opts?: { announce?: boolean }) {
  splitRatio.value = clampSplitRatio(ratio)
  if (opts?.announce) announceSplitRatio(splitRatio.value)
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
  persistSplitRatio(splitRatio.value, { announce: true })
}

function onSplitterKey(e: KeyboardEvent) {
  const step = e.shiftKey ? 0.08 : 0.03
  let next = splitRatio.value
  if (e.key === 'Home') {
    e.preventDefault()
    persistSplitRatio(0.2, { announce: true })
    return
  }
  if (e.key === 'End') {
    e.preventDefault()
    persistSplitRatio(0.8, { announce: true })
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
  persistSplitRatio(next, { announce: true })
}

/** Round 122: double-click resets chart/table split to default and announces. */
function onSplitterDblClick(e: MouseEvent) {
  e.preventDefault()
  persistSplitRatio(resetSplitRatio(), { announce: true })
}

function onRename() {
  if (!store.selectedView) return
  store.renameNode(store.selectedView.view.id, viewName.value)
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
  if (t !== 'table') {
    warmEditChunk()
    focusSplitter()
  }
}

function onPos(p: ChartPosition) {
  if (!store.selectedView) return
  chartPos.value = p
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
  // Handoff to sidebar native New view dialog (Round 30) so naming/type + focus restore stay consistent.
  emit('request-new-view')
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
  min-height: 0;
}
/* Fill remaining workspace height so table/chart split can grow (was content-sized ~350px). */
.ws-surface {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
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
.tb-input,
.tb-select {
  height: 28px;
  padding: 0 8px;
  border: 1px solid var(--ia-border);
  border-radius: 6px;
  background: #fff;
  color: #1f2329;
  font: inherit;
  font-size: 12px;
}
.tb-select-wrap {
  position: relative;
  display: inline-flex;
  align-items: center;
}
.tb-select-wrap .tb-select {
  /* Keep native control for a11y / form value; badge shows current pick clearly. */
  color: transparent;
  caret-color: transparent;
}
.tb-select-wrap .tb-select option {
  color: #1f2329;
}
.tb-current {
  position: absolute;
  left: 8px;
  right: 22px;
  top: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  font-size: 12px;
  color: #1f2329;
  pointer-events: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.tb-select-wrap:has(.tb-select:disabled) .tb-current {
  color: #8a9199;
}
.tb-select-wrap:has(.tb-select:focus) .tb-current {
  color: var(--ia-accent);
}
.pos-seg {
  display: inline-flex;
  flex-wrap: wrap;
  border: 1px solid var(--ia-border);
  border-radius: 6px;
  overflow: hidden;
  background: #fff;
  max-width: 100%;
}
.pos-seg-btn {
  height: 28px;
  min-width: 28px;
  min-height: 28px;
  padding: 0 8px;
  border: 0;
  border-right: 1px solid var(--ia-border);
  background: transparent;
  color: #646a73;
  font: inherit;
  font-size: 12px;
  cursor: pointer;
  touch-action: manipulation;
}
.ws-toolbar.is-compact .pos-seg-btn {
  height: 36px;
  min-width: 40px;
  min-height: 36px;
  padding: 0 12px;
  font-size: 13px;
}
.pos-seg-btn:last-child {
  border-right: 0;
}
.pos-seg-btn:hover:not(:disabled) {
  color: var(--ia-accent);
  background: color-mix(in srgb, var(--ia-accent) 8%, #fff);
}
.pos-seg-btn[aria-pressed='true'] {
  color: var(--ia-accent);
  background: color-mix(in srgb, var(--ia-accent) 14%, #fff);
  font-weight: 600;
}
.pos-seg-btn:focus-visible {
  outline: 2px solid var(--ia-accent);
  outline-offset: -2px;
  z-index: 1;
}
.pos-seg-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.tb-more {
  position: relative;
  display: inline-block;
}
.tb-more-summary {
  list-style: none;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
}
.tb-more-summary::-webkit-details-marker {
  display: none;
}
.tb-more-menu {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  z-index: 30;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 140px;
  padding: 6px;
  background: #fff;
  border: 1px solid var(--ia-border);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(31, 35, 41, 0.12);
}
.tb-more-menu .btn {
  width: 100%;
  justify-content: flex-start;
  border: 0;
  border-radius: 4px;
}
.tb-more-menu .btn:focus-visible {
  outline: 2px solid var(--ia-accent, #3370ff);
  outline-offset: 1px;
}
.tb-input:focus,
.tb-select:focus {
  outline: 2px solid var(--ia-accent);
  outline-offset: 1px;
  border-color: var(--ia-accent);
}
.tb-select:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  background: #f5f6f7;
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
.btn-primary {
  background: var(--ia-accent);
  border-color: var(--ia-accent);
  color: #fff;
}
.btn-primary:hover:not(:disabled) {
  filter: brightness(1.05);
  color: #fff;
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
  min-width: 240px;
  /* Floor comes from inline minHeight; 0 lets flex share space instead of content-size. */
  min-height: 0;
  background: #fff;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.chart-pane > :deep(.chart) {
  flex: 1;
  min-height: 0;
}
.table-pane {
  min-width: 240px;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
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
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  outline: none;
}
.empty h3 {
  margin: 0;
  color: #1f2329;
  font-size: 18px;
}
.empty p {
  margin: 0;
  font-size: 14px;
  max-width: 36em;
}
.empty__cta {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
  margin-top: 8px;
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
.no-views-hint {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px 16px;
  margin: 0 12px 8px;
  padding: 12px 14px;
  background: #f0f7ff;
  border: 1px solid #b3d0ff;
  border-radius: 8px;
  color: #1f2329;
}
.no-views-hint__text {
  flex: 1 1 220px;
  min-width: 0;
}
.no-views-hint__text strong {
  display: block;
  font-size: 14px;
  margin-bottom: 4px;
}
.no-views-hint__text p {
  margin: 0;
  font-size: 13px;
  line-height: 1.45;
  color: #646a73;
}
.tb-more-summary,
.tb-more-item {
  box-sizing: border-box;
}
.ws-toolbar.is-compact .tb-more-summary,
.ws-toolbar.is-compact .tb-more-item {
  min-height: 44px;
}
</style>
