<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, provide, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import type { AnalysisTable, ChartPosition, ViewNode } from '../../shared/types'
import { runPipeline, PipelineError, isIdentityOrSortOnly, type ViewResult } from '../../shared/pipeline'
import { findTable, findView, findViewParent, findViewPath } from '../../shared/tree'
import { useAnalysisStore } from '../../stores/analysisStore'
import { IButton, IIcon, IModal, IPopover, ISplitPane, ITextField, toast } from '../../ui'
import DataGrid from './DataGrid.vue'
import ChartView from '../charts/ChartView.vue'
import { TABLE_CHART_CONTEXT, type TableChartContext } from './context'
import { promoteViewToTable } from './promote'
import { downloadCsv, toCsv } from './csv'

/**
 * 表+图一体化布局壳：
 * - 当前选中表/视图 → DataGrid
 * - 图表视图时按 chart.position（top/bottom/left/right）用 ISplitPane 排布图表区
 * - div[data-mount="chart-panel"] 为图表切片挂载点；上下文经 TABLE_CHART_CONTEXT provide
 */
const store = useAnalysisStore()
const { current, selected } = storeToRefs(store)

const table = computed<AnalysisTable | undefined>(() =>
  current.value && selected.value ? findTable(current.value, selected.value.tableId) : undefined,
)
const view = computed<ViewNode | null>(() =>
  table.value && selected.value?.viewId ? findView(table.value.views, selected.value.viewId) : null,
)

/* 管道结果：表格与图表共用 */
const result = computed<ViewResult | null>(() => {
  const a = current.value
  if (!a || !selected.value) return null
  try {
    return runPipeline(a, selected.value.tableId, selected.value.viewId)
  } catch (e) {
    if (e instanceof PipelineError) return null
    throw e
  }
})
const pipelineError = ref('')
watch(
  () => [selected.value, current.value],
  () => {
    const a = current.value
    pipelineError.value = ''
    if (!a || !selected.value) return
    try {
      runPipeline(a, selected.value.tableId, selected.value.viewId)
    } catch (e) {
      pipelineError.value = e instanceof Error ? e.message : '数据计算失败'
    }
  },
  { immediate: true, deep: false },
)

/* 图表方位（默认 bottom） */
const hasChart = computed(() => !!view.value && view.value.type !== 'table' && !!view.value.chart)
const chartPosition = computed<ChartPosition>(() => view.value?.chart?.position ?? 'bottom')

function setPosition(p: ChartPosition) {
  store.mutate((a) => {
    const t = selected.value ? findTable(a, selected.value.tableId) : undefined
    const v = t && selected.value?.viewId ? findView(t.views, selected.value.viewId) : null
    if (v?.chart) v.chart.position = p
  })
  positionOpen.value = false
}

/* 源表收起：图表视图可隐藏表格，只看全幅图表；按分析+视图持久化 */
const tableCollapsed = ref(false)
function tableCollapseKey() {
  const a = current.value?.id ?? ''
  const v = selected.value?.viewId ?? ''
  return `insight-studio:table-collapsed:${a}:${v}`
}
function loadTableCollapsed() {
  if (!hasChart.value || !selected.value?.viewId) {
    tableCollapsed.value = false
    return
  }
  try {
    tableCollapsed.value = localStorage.getItem(tableCollapseKey()) === '1'
  } catch {
    tableCollapsed.value = false
  }
}
function toggleTableCollapsed() {
  tableCollapsed.value = !tableCollapsed.value
  try {
    localStorage.setItem(tableCollapseKey(), tableCollapsed.value ? '1' : '0')
  } catch {
    /* ignore quota / private mode */
  }
}
watch(
  () => [current.value?.id, selected.value?.viewId, hasChart.value] as const,
  () => loadTableCollapsed(),
  { immediate: true },
)

/* 窄屏降级（<900px 左右 → 上下） */
const rootEl = ref<HTMLElement>()
const narrow = ref(false)
let ro: ResizeObserver | null = null
onMounted(() => {
  if (!rootEl.value) return
  ro = new ResizeObserver((entries) => {
    const w = entries[0]?.contentRect.width ?? 0
    narrow.value = w > 0 && w < 900
  })
  ro.observe(rootEl.value)
})
onBeforeUnmount(() => ro?.disconnect())

const degraded = computed(() => narrow.value && (chartPosition.value === 'left' || chartPosition.value === 'right'))
const effectivePosition = computed<ChartPosition>(() => (degraded.value ? (chartPosition.value === 'left' ? 'top' : 'bottom') : chartPosition.value))

const splitDirection = computed<'horizontal' | 'vertical'>(() =>
  effectivePosition.value === 'left' || effectivePosition.value === 'right' ? 'horizontal' : 'vertical',
)
/** 图表区在 first 还是 second */
const chartFirst = computed(() => effectivePosition.value === 'top' || effectivePosition.value === 'left')

const splitKey = computed(() => `chart-split:${current.value?.id ?? ''}:${selected.value?.viewId ?? ''}:${effectivePosition.value}`)

/* 标题栏 ⋯ 菜单 */
const menuOpen = ref(false)
const positionOpen = ref(false)
const renameOpen = ref(false)
const renameName = ref('')

const POSITIONS: { value: ChartPosition; label: string; icon: 'chevron-up' | 'chevron-down' | 'chevron-left' | 'chevron-right' }[] = [
  { value: 'top', label: '图表在上', icon: 'chevron-up' },
  { value: 'bottom', label: '图表在下（默认）', icon: 'chevron-down' },
  { value: 'left', label: '图表在左', icon: 'chevron-left' },
  { value: 'right', label: '图表在右', icon: 'chevron-right' },
]

function openRename() {
  renameName.value = view.value?.name ?? ''
  renameOpen.value = true
}
function submitRename() {
  const name = renameName.value.trim()
  if (!name) return
  store.mutate((a) => {
    const t = selected.value ? findTable(a, selected.value.tableId) : undefined
    const v = t && selected.value?.viewId ? findView(t.views, selected.value.viewId) : null
    if (v) v.name = name
  })
  renameOpen.value = false
}

function promote() {
  if (selected.value?.viewId) promoteViewToTable(store, selected.value.tableId, selected.value.viewId)
}

function deleteView() {
  const s = selected.value
  if (!s?.viewId || !view.value) return
  const name = view.value.name
  store.mutate((a) => {
    const t = findTable(a, s.tableId)
    if (!t || !s.viewId) return
    const loc = findViewParent(t.views, s.viewId)
    if (loc) {
      const i = loc.siblings.findIndex((v) => v.id === s.viewId)
      if (i >= 0) loc.siblings.splice(i, 1)
    }
  })
  store.select({ kind: 'table', tableId: s.tableId })
  toast.success(`已删除视图「${name}」`)
}

function exportCsv() {
  const r = result.value
  if (!r) return
  downloadCsv(`${view.value?.name ?? table.value?.name ?? 'data'}.csv`, toCsv(r.columns, r.rows))
  toast.success('已导出 CSV')
}

/* 全局撤销/重做快捷键（网格内已有兜底，这里覆盖工作区其余区域） */
function onGlobalKeydown(e: KeyboardEvent) {
  const mod = e.ctrlKey || e.metaKey
  if (!mod) return
  const target = e.target as HTMLElement
  if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return
  if (e.key.toLowerCase() === 'z') {
    e.preventDefault()
    if (e.shiftKey) store.redo()
    else store.undo()
  } else if (e.key.toLowerCase() === 'y') {
    e.preventDefault()
    store.redo()
  }
}
onMounted(() => document.addEventListener('keydown', onGlobalKeydown))
onBeforeUnmount(() => document.removeEventListener('keydown', onGlobalKeydown))

/* 提供给图表切片的上下文 */
const editable = computed(() => {
  const t = table.value
  if (!t) return false
  if (!view.value || !selected.value?.viewId) return true
  const path = findViewPath(t.views, selected.value.viewId) ?? []
  return isIdentityOrSortOnly(view.value, path.slice(0, -1))
})
provide(
  TABLE_CHART_CONTEXT,
  {
    result,
    table,
    view,
    selected,
    chartPosition: effectivePosition,
    narrow,
    editable,
  } satisfies TableChartContext,
)
</script>

<template>
  <div ref="rootEl" class="tcw">
    <!-- 标题栏 -->
    <header v-if="view" class="tcw__head">
      <span class="tcw__head-title is-ellipsis">{{ view.name }}</span>
      <IButton
        v-if="hasChart"
        variant="ghost"
        size="sm"
        :icon="tableCollapsed ? 'table' : 'eye-off'"
        :title="tableCollapsed ? '显示源表' : '隐藏源表'"
        @click="toggleTableCollapsed"
      >
        {{ tableCollapsed ? '显示源表' : '隐藏源表' }}
      </IButton>
      <IPopover v-if="hasChart" :open="positionOpen" placement="bottom-end" :arrow="false" @update:open="positionOpen = $event">
        <template #anchor>
          <IButton variant="ghost" size="sm" icon="columns" title="图表位置" @click="positionOpen = !positionOpen">
            图表位置
          </IButton>
        </template>
        <template #default>
          <div class="tcw__menu" role="menu">
            <button
              v-for="p in POSITIONS"
              :key="p.value"
              type="button"
              class="tcw__menu-item"
              :class="{ 'tcw__menu-item--active': chartPosition === p.value }"
              role="menuitemradio"
              :aria-checked="chartPosition === p.value"
              @click="setPosition(p.value)"
            >
              <IIcon :name="p.icon" :size="13" /> {{ p.label }}
              <IIcon v-if="chartPosition === p.value" name="check" :size="12" class="tcw__menu-check" />
            </button>
          </div>
        </template>
      </IPopover>
      <IPopover :open="menuOpen" placement="bottom-end" :arrow="false" @update:open="menuOpen = $event">
        <template #anchor>
          <IButton variant="ghost" icon="more" size="sm" aria-label="视图菜单" @click="menuOpen = !menuOpen" />
        </template>
        <template #default="{ close }">
          <div class="tcw__menu" role="menu">
            <button type="button" class="tcw__menu-item" role="menuitem" @click="close(); openRename()">
              <IIcon name="edit" :size="13" /> 重命名
            </button>
            <button type="button" class="tcw__menu-item" role="menuitem" @click="close(); promote()">
              <IIcon name="level-up" :size="13" /> 提升为表
            </button>
            <button type="button" class="tcw__menu-item" role="menuitem" @click="close(); exportCsv()">
              <IIcon name="download" :size="13" /> 导出 CSV
            </button>
            <button type="button" class="tcw__menu-item tcw__menu-item--danger" role="menuitem" @click="close(); deleteView()">
              <IIcon name="trash" :size="13" /> 删除视图
            </button>
          </div>
        </template>
      </IPopover>
    </header>

    <div v-if="degraded" class="tcw__notice">
      <IIcon name="info" :size="13" /> 屏幕较窄，左右布局已自动调整为上下排列
    </div>

    <div v-if="pipelineError" class="tcw__error">
      <IIcon name="warning" :size="14" /> {{ pipelineError }}
    </div>

    <!-- 主体 -->
    <div v-if="result && selected" class="tcw__body" data-mount="table-chart">
      <!-- 图表视图且已收起源表：全幅图表 -->
      <div v-if="hasChart && tableCollapsed" class="tcw__chart tcw__chart--solo" data-mount="chart-panel">
        <ChartView />
      </div>

      <ISplitPane
        v-else-if="hasChart"
        :key="splitKey"
        :direction="splitDirection"
        :default-ratio="0.55"
        :min-first="200"
        :min-second="200"
        :storage-key="splitKey"
      >
        <template #first>
          <div v-if="chartFirst" class="tcw__chart" data-mount="chart-panel">
            <ChartView />
          </div>
          <DataGrid v-else :table-id="selected.tableId" :view-id="selected.viewId" :result="result" />
        </template>
        <template #second>
          <DataGrid v-if="chartFirst" :table-id="selected.tableId" :view-id="selected.viewId" :result="result" />
          <div v-else class="tcw__chart" data-mount="chart-panel">
            <ChartView />
          </div>
        </template>
      </ISplitPane>

      <div v-else class="tcw__grid-only" data-mount="table">
        <DataGrid :table-id="selected.tableId" :view-id="selected.viewId" :result="result" />
      </div>
    </div>
  </div>

  <!-- 重命名视图 -->
  <IModal :open="renameOpen" title="重命名视图" :width="400" @update:open="renameOpen = $event">
    <ITextField v-model="renameName" autofocus @enter="submitRename" />
    <template #footer>
      <IButton @click="renameOpen = false">取消</IButton>
      <IButton variant="primary" :disabled="!renameName.trim()" @click="submitRename">保存</IButton>
    </template>
  </IModal>
</template>

<style scoped>
.tcw {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 12px 16px 16px;
  gap: 8px;
}
.tcw__head {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
}
.tcw__head-title {
  margin-right: auto;
  font-size: var(--is-text-md);
  font-weight: 600;
}
.tcw__menu {
  padding: 4px;
  display: flex;
  flex-direction: column;
  min-width: 170px;
}
.tcw__menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  border-radius: var(--is-radius-sm);
  font-size: var(--is-text-sm);
  text-align: left;
  color: var(--is-text);
  white-space: nowrap;
}
.tcw__menu-item:hover {
  background: var(--is-surface-hover);
}
.tcw__menu-item--active {
  color: var(--is-accent);
}
.tcw__menu-item--danger {
  color: var(--is-danger);
}
.tcw__menu-item--danger:hover {
  background: var(--is-danger-soft);
}
.tcw__menu-check {
  margin-left: auto;
}
.tcw__notice {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: var(--is-text-xs);
  color: var(--is-warning-text);
  background: var(--is-warning-bg);
  border-radius: var(--is-radius-sm);
  padding: 6px 10px;
}
.tcw__error {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: var(--is-text-sm);
  color: var(--is-danger);
  background: var(--is-danger-soft);
  border-radius: var(--is-radius-sm);
  padding: 8px 12px;
}
.tcw__body {
  flex: 1;
  min-height: 0;
}
.tcw__grid-only {
  height: 100%;
}
.tcw__chart {
  height: 100%;
  min-height: 0;
  background: var(--is-surface);
  border: 1px solid var(--is-border);
  border-radius: var(--is-radius);
  overflow: hidden;
  padding: 8px;
}
.tcw__chart--solo {
  width: 100%;
}
.tcw__chart-hint {
  font-size: var(--is-text-sm);
  color: var(--is-text-tertiary);
  padding: 16px;
  text-align: center;
}
</style>
