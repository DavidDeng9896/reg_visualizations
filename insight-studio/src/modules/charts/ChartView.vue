<script setup lang="ts">
import { computed, inject, nextTick, onBeforeUnmount, provide, reactive, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import type { ChartConfig, ChartType, RowFlag } from '../../shared/types'
import { ROW_ID_FIELD } from '../../shared/types'
import { runPipeline } from '../../shared/pipeline'
import { findView } from '../../shared/tree'
import { viewNameOnTypeChange } from '../../shared/factories'
import { useAnalysisStore } from '../../stores/analysisStore'
import { IButton, IEmptyState, IIcon, IModal, IPopover, toast } from '../../ui'
import { TABLE_CHART_CONTEXT } from '../table/context'
import { downloadCsv, toCsv } from '../table/csv'
import { filterSummary } from '../table/filterForm'
import { transformSummary } from '../table/transformForm'
import { getChartDef, buildChartOption, validateChartMapping } from './registry'
import { migrateConfigure, migrateStyle } from './runtime/mapping'
import { samplingNotice } from './runtime/sampling'
import { buildMargin } from './runtime/shared'
import { cancelDraft, cloneConfig, commitDraft, createDraft, debounce, isDirty, type ChartDraft } from './draft'
import { exportPdf, exportPng } from './export'
import { addFlags, flagSetOf, removeFlags } from './flags'
import type { FitGroupSummary } from './fit/summary'
import ChartPanel, { type FlagMode } from './ChartPanel.vue'
import ChartConfigPanel from './panel/ChartConfigPanel.vue'
import ModelTables from './tables/ModelTables.vue'
import { CHART_DRAFT_CONTEXT } from './panel/context'
import type { ChartOption, MappingError } from './types'

/**
 * 图表视图总装：警告条 + ECharts 容器 + 悬停导出 + 右侧配置抽屉（草稿编辑 + 实时预览）。
 */
const tc = inject(TABLE_CHART_CONTEXT)!
const store = useAnalysisStore()
const { current } = storeToRefs(store)

const view = computed(() => tc.view.value)
const result = computed(() => tc.result.value)
const columns = computed(() => result.value?.columns ?? [])

/* ------------------------------- 草稿模型 ------------------------------- */

const savedConfig = computed<ChartConfig | null>(() => view.value?.chart ?? null)
const draftModel = reactive<ChartDraft>({
  saved: cloneConfig(savedConfig.value ?? fallbackConfig()),
  draft: cloneConfig(savedConfig.value ?? fallbackConfig()),
})
let lastSyncedViewId = view.value?.id ?? ''

function fallbackConfig(): ChartConfig {
  const t = (view.value?.type && view.value.type !== 'table' ? view.value.type : 'bar') as ChartType
  return { chartType: t, position: 'top', configure: {}, style: {} }
}

const panelOpen = ref(false)
const saveAttempted = ref(false)

function syncDraftFromView(): void {
  const cfg = savedConfig.value
  if (cfg) {
    const snap = cloneConfig(cfg)
    // 视图 type 与 chart.chartType 不一致时以视图为准，避免落到错误图种空面板
    if (view.value && view.value.type !== 'table' && snap.chartType !== view.value.type) {
      snap.chartType = view.value.type as ChartType
    }
    draftModel.saved = snap
    draftModel.draft = cloneConfig(snap)
  } else if (view.value && view.value.type !== 'table') {
    const snap = fallbackConfig()
    draftModel.saved = cloneConfig(snap)
    draftModel.draft = cloneConfig(snap)
  }
  saveAttempted.value = false
  lastSyncedViewId = view.value?.id ?? ''
}

// 仅在切换视图，或外部写入 chart 且本地无未保存草稿时重建。图种/方位变更不得冲掉 draft。
watch(
  () => [view.value?.id, savedConfig.value] as const,
  ([id]) => {
    if (id && id === lastSyncedViewId && isDirty(draftModel as ChartDraft)) return
    syncDraftFromView()
  },
  { immediate: true },
)
watch(
  () => view.value?.chart?.position,
  (p) => {
    if (!p) return
    if (draftModel.draft.position !== p) draftModel.draft.position = p
    if (draftModel.saved.position !== p) draftModel.saved.position = p
  },
)

const dirty = computed(() => isDirty(draftModel as ChartDraft))
const previewConfig = computed<ChartConfig>(() => (panelOpen.value ? draftModel.draft : (savedConfig.value ?? draftModel.draft)))
const def = computed(() => getChartDef(previewConfig.value.chartType))

/* ------------------------------- 预览构建 ------------------------------- */

const previewOption = ref<ChartOption | null>(null)
const warnings = ref<string[]>([])
const seriesNames = ref<string[]>([])
const fits = ref<FitGroupSummary[]>([])
const rebuilding = ref(false)
/** 首次成功渲染后置真：之前显示图表形骨架，之后只显示 2px 重建 shimmer。 */
const hasRendered = ref(false)

/** 视图打标（存于 ViewNode.flags）。 */
const flags = computed<RowFlag[]>(() => view.value?.flags ?? [])

let buildToken = 0
function doBuild(r: NonNullable<typeof result.value>, cfg: ChartConfig) {
  // 工作台页头已展示视图名，与看板卡片一致隐藏图内 g-gtitle
  const out = buildChartOption(r, cfg, view.value!.name, flags.value, { hideTitle: true })
  previewOption.value = out.option
  warnings.value = out.warnings
  seriesNames.value = out.seriesNames
  fits.value = out.fits ?? []
}

function rebuild() {
  const r = result.value
  const cfg = previewConfig.value
  if (!r || !view.value) {
    previewOption.value = null
    fits.value = []
    return
  }
  rebuilding.value = true
  // 4PL 大数据：setTimeout 分片让 loading 条先绘制，不阻塞 UI
  const heavy = cfg.configure.regression?.model === '4pl' && r.rows.length > 2000
  if (heavy) {
    const token = ++buildToken
    setTimeout(() => {
      if (token === buildToken) doBuild(r, cfg)
    }, 0)
  } else {
    buildToken += 1
    doBuild(r, cfg)
  }
}

const rebuildDeb = debounce(rebuild, 150)
// 首次同步重建，避免每次打开都先等 150ms 才出图
let chartRebuildPrimed = false
watch(result, () => {
  if (!chartRebuildPrimed) {
    chartRebuildPrimed = true
    rebuild()
    return
  }
  rebuildDeb.call()
}, { immediate: true })
watch(flags, () => rebuildDeb.call())
watch(previewConfig, () => rebuildDeb.call(), { deep: true })

// layout-only 快路径：边距改动跳过防抖与全量重建，直接 relayout（<100ms 生效）。
// 工作台始终不写图内标题（hideTitle），与页头/看板卡片保持一致。
watch(
  () => previewConfig.value.style.margins,
  () => {
    const style = previewConfig.value.style
    const margin = buildMargin(style)
    // 与 baseLayout 无标题时一致：收紧顶部留白
    if (style.margins?.top === undefined) margin.t = 32
    void chartRef.value?.relayout({
      title: { text: '' },
      margin,
    })
  },
  { deep: true },
)

function touch() {
  rebuildDeb.call()
}

/* ------------------------------- 校验 / 空态 ------------------------------- */

const previewErrors = computed<MappingError[]>(() => validateChartMapping(previewConfig.value, columns.value))
const requiredMissing = computed(() => previewErrors.value.some((e) => e.kind === 'required'))
const missingColumns = computed(() => previewErrors.value.filter((e) => e.kind === 'missing-column'))

// 首次进入缺必填映射时自动打开面板
watch(
  [requiredMissing, () => view.value?.id],
  ([missing]) => {
    if (missing && view.value) panelOpen.value = true
  },
  { immediate: true },
)

/* ------------------------------- Save / Cancel ------------------------------- */

const chartSaving = ref(false)

async function save(): Promise<boolean> {
  const v = view.value
  if (!v || chartSaving.value) return false
  const errors = validateChartMapping(draftModel.draft, columns.value)
  if (errors.length) {
    saveAttempted.value = true
    toast.error(`无法保存：${errors.map((e) => e.message).join('；')}`, { title: '图表配置不完整' })
    return false
  }
  const committed = commitDraft(draftModel as ChartDraft)
  const committedType: ChartType = committed.chartType
  const tableId = tc.selected.value?.tableId
  const viewId = tc.selected.value?.viewId
  let wrote = false
  store.mutate((a) => {
    const t = a.tables.find((tb) => tb.id === tableId)
    const target = t && viewId ? findView(t.views, viewId) : null
    if (target) {
      target.type = committedType
      target.chart = committed
      wrote = true
    }
  })
  if (!wrote) {
    toast.error('未找到当前图表视图，配置未写入')
    return false
  }
  saveAttempted.value = false
  chartSaving.value = true
  try {
    await store.saveNow()
    toast.success('图表配置已保存')
    return true
  } catch (e) {
    toast.error(e instanceof Error ? e.message : '保存失败', { title: '落盘失败' })
    return false
  } finally {
    chartSaving.value = false
  }
}

function cancel() {
  const was = cancelDraft(draftModel as ChartDraft)
  saveAttempted.value = false
  if (was) toast.info('已放弃修改')
  panelOpen.value = false
}

function rename(name: string) {
  store.mutate((a) => {
    const t = a.tables.find((tb) => tb.id === tc.selected.value?.tableId)
    const target = t && tc.selected.value?.viewId ? findView(t.views, tc.selected.value.viewId) : null
    if (target) target.name = name
  })
}

/* ------------------------------- 图种互切（11A） ------------------------------- */

function changeType(t: ChartType) {
  if (t === draftModel.draft.chartType) return
  const fromType = draftModel.draft.chartType
  const to = getChartDef(t)
  const { configure, carried } = migrateConfigure(draftModel.draft, to, columns.value)
  const base = { chartType: t, position: draftModel.draft.position }
  draftModel.draft = {
    ...base,
    configure: { ...to.createDefaultConfigure(), ...configure },
    style: { ...to.createDefaultStyle(), ...migrateStyle(draftModel.draft.style) },
  }
  saveAttempted.value = false
  const v = view.value
  const tableId = tc.selected.value?.tableId
  const viewId = tc.selected.value?.viewId
  if (v && viewId) {
    const table = current.value?.tables.find((tb) => tb.id === tableId)
    const nextName = viewNameOnTypeChange(v.name, fromType, t, table?.views ?? [])
    store.mutate((a) => {
      const tb = a.tables.find((x) => x.id === tableId)
      const target = tb ? findView(tb.views, viewId) : null
      if (!target) return
      target.type = t
      if (nextName !== target.name) target.name = nextName
    })
  }
  if (carried) toast.info('已切换图种，可复用映射已保留')
  touch()
}

/* ------------------------------- 上下文提供 ------------------------------- */

provide(CHART_DRAFT_CONTEXT, {
  def,
  // getter：draftModel.draft 重建（视图切换/图种互切）后下游仍拿到最新对象
  get draft() {
    return draftModel.draft
  },
  columns,
  errors: previewErrors,
  saveAttempted,
  seriesNames: computed(() => seriesNames.value),
  touch,
  dirty,
  changeType,
})

/* ------------------------------- 视图切换 dirty 守卫 ------------------------------- */

const guardOpen = ref(false)
let reverting = false
let pendingSelection: typeof tc.selected.value = null
watch(
  () => tc.selected.value,
  (n, o) => {
    if (reverting) return
    if (!panelOpen.value || !dirty.value) return
    if (!n || !o || n.viewId === o.viewId) return
    // 有未保存修改：回退选中并询问
    pendingSelection = n
    reverting = true
    store.select(o)
    queueMicrotask(() => {
      reverting = false
    })
    guardOpen.value = true
  },
)

async function guardSave() {
  if (chartSaving.value) return
  const ok = await save()
  if (!ok) return
  guardOpen.value = false
  if (pendingSelection) store.select(pendingSelection)
  pendingSelection = null
}
function guardDiscard() {
  guardOpen.value = false
  cancelDraft(draftModel as ChartDraft)
  if (pendingSelection) store.select(pendingSelection)
  pendingSelection = null
}
function guardCancel() {
  guardOpen.value = false
  pendingSelection = null
}

/* ------------------------------- 套索打标（Flag / Clear） ------------------------------- */

const flagCapable = computed(() => !!def.value.capabilities.regression)
const flagMode = ref<FlagMode>('off')
const flagCount = computed(() => flags.value.length)

// 视图切换 / 图种切换退出打标模式
watch([() => view.value?.id, () => def.value.type], () => {
  flagMode.value = 'off'
})

function mutateFlags(arr: RowFlag[]) {
  const sel = tc.selected.value
  if (!sel) return
  store.mutate((a) => {
    const t = a.tables.find((tb) => tb.id === sel.tableId)
    const target = t && sel.viewId ? findView(t.views, sel.viewId) : null
    if (target) target.flags = arr.map((f) => ({ ...f }))
  })
}

/** 写 flags + 入撤销栈（Ctrl/Cmd+Z 可撤）。 */
function applyFlagChange(next: RowFlag[], label: string) {
  const prev = flags.value.map((f) => ({ ...f }))
  mutateFlags(next)
  store.commit({
    label,
    undo: () => mutateFlags(prev),
    redo: () => mutateFlags(next.map((f) => ({ ...f }))),
  })
}

const flagModalOpen = ref(false)
const clearModalOpen = ref(false)
const pendingIds = ref<string[]>([])
const flagCommentInput = ref('')

/** 套索选中行的坐标预览（弹窗列表）。 */
const pendingPreview = computed(() => {
  const r = result.value
  if (!r) return []
  const cfg = previewConfig.value.configure
  const xf = cfg.x?.field
  const yf = cfg.values?.[0]?.field ?? cfg.y?.field
  const byId = new Map(r.rows.map((row) => [String(row[ROW_ID_FIELD] ?? ''), row]))
  return pendingIds.value.slice(0, 8).map((id) => {
    const row = byId.get(id)
    return {
      id,
      x: xf && row ? String(row[xf] ?? '') : '',
      y: yf && row ? String(row[yf] ?? '') : '',
    }
  })
})

function onLasso(ids: string[]) {
  if (flagMode.value === 'flag') {
    pendingIds.value = ids
    flagCommentInput.value = ''
    flagModalOpen.value = true
  } else if (flagMode.value === 'clear') {
    const flagged = flagSetOf(flags.value)
    const hit = ids.filter((id) => flagged.has(id))
    if (!hit.length) {
      toast.info('所选区域没有已打标（×）的点')
      return
    }
    pendingIds.value = hit
    clearModalOpen.value = true
  }
}

function confirmFlag() {
  const res = addFlags(flags.value, pendingIds.value, flagCommentInput.value)
  if (!res.ok) {
    toast.error(res.error)
    return
  }
  applyFlagChange(res.flags, `打标 ${res.added} 个点`)
  flagModalOpen.value = false
  flagMode.value = 'off'
  toast.success(`已打标 ${res.added} 个点`)
}

function confirmClear() {
  const { flags: next, removed } = removeFlags(flags.value, pendingIds.value)
  applyFlagChange(next, `清除 ${removed} 个打标`)
  clearModalOpen.value = false
  flagMode.value = 'off'
  toast.success(`已清除 ${removed} 个打标`)
}

const regModelActive = computed(() => (previewConfig.value.configure.regression?.model ?? 'none') !== 'none')

/* ------------------------------- Esc → 退出打标 / Cancel ------------------------------- */

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && flagMode.value !== 'off') {
    flagMode.value = 'off'
    toast.info('已退出打标模式')
    return
  }
  if (e.key === 'Escape' && panelOpen.value && !guardOpen.value && !flagModalOpen.value && !clearModalOpen.value) {
    cancel()
  }
}
if (typeof document !== 'undefined') document.addEventListener('keydown', onKeydown)
onBeforeUnmount(() => {
  if (typeof document !== 'undefined') document.removeEventListener('keydown', onKeydown)
  rebuildDeb.cancel()
})

/* ------------------------------- 采样 / 导出 ------------------------------- */

const sampling = computed(() => (result.value ? samplingNotice(result.value) : { sampled: false, message: '' }))

function downloadFull() {
  const a = current.value
  const sel = tc.selected.value
  if (!a || !sel) return
  const full = runPipeline(a, sel.tableId, sel.viewId, { skipSampling: true })
  downloadCsv(`${view.value?.name ?? 'data'}-full.csv`, toCsv(full.columns, full.rows))
  toast.success(`已导出全量 ${full.rows.length.toLocaleString()} 行`)
}

const chartRef = ref<InstanceType<typeof ChartPanel>>()
const exportOpen = ref(false)
const warnOpen = ref(false)
function doExport(kind: 'png' | 'pdf') {
  exportOpen.value = false
  warnOpen.value = false
  const get = () => chartRef.value?.getDataURL() ?? Promise.resolve('')
  const name = view.value?.name ?? 'chart'
  if (kind === 'png') void exportPng(get, name)
  else void exportPdf(get, name)
}

/* 导出菜单键盘可达：打开聚焦首项，↑/↓ 循环移动，Esc 关闭 */
watch(exportOpen, async (open) => {
  if (!open) return
  await nextTick()
  document.querySelector<HTMLButtonElement>('.cview__export-menu [role="menuitem"]')?.focus()
})
function onExportMenuKeydown(e: KeyboardEvent) {
  const menu = e.currentTarget as HTMLElement
  const items = Array.from(menu.querySelectorAll<HTMLButtonElement>('[role="menuitem"]'))
  if (!items.length) return
  const idx = items.indexOf(document.activeElement as HTMLButtonElement)
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    items[(idx + 1) % items.length]?.focus()
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    items[(idx - 1 + items.length) % items.length]?.focus()
  } else if (e.key === 'Escape') {
    e.preventDefault()
    exportOpen.value = false
  }
}

watch(
  () => warnings.value.length,
  (n) => {
    if (!n) warnOpen.value = false
  },
)

const chips = computed(() => {
  const v = view.value
  if (!v) return []
  return [...v.filters.map((f) => filterSummary(f, columns.value)), ...v.transforms.map((t) => transformSummary(t))]
})

const rowCount = computed(() => result.value?.rows.length ?? 0)
const chartWidth = computed(() => previewConfig.value.style.width)
const chartHeight = computed(() => previewConfig.value.style.height)
</script>

<template>
  <div class="cview">
    <div class="cview__main">
      <!-- 绑定列消失警告（单条关键，保留横幅） -->
      <div v-if="missingColumns.length" class="cview__notice cview__notice--missing">
        <IIcon name="warning" :size="14" />
        <span>{{ missingColumns.map((e) => e.message).join('；') }}，请打开配置面板重新绑定</span>
      </div>

      <!-- 采样警告条（单条，保留横幅） -->
      <div v-if="sampling.sampled" class="cview__notice cview__notice--sample">
        <IIcon name="warning" :size="14" />
        <span>{{ sampling.message }}</span>
        <button type="button" class="cview__notice-link" @click="downloadFull">Download</button>
        <span class="cview__notice-hint">to view the complete data.</span>
      </div>

      <!-- 图表区（构建警告收进工具条芯片，不占图面） -->
      <div class="cview__stage">
        <template v-if="!requiredMissing">
          <ChartPanel
            ref="chartRef"
            :option="previewOption"
            :row-count="rowCount"
            :width="chartWidth"
            :height="chartHeight"
            :flag-mode="flagMode"
            class="cview__chart"
            data-testid="chart-canvas"
            @rendered="hasRendered = true; rebuilding = false"
            @lasso="onLasso"
          />
          <!-- 首绘骨架（Plotly chunk 加载/首次构建期间）：图表形 shimmer -->
          <div v-if="!hasRendered" class="cview__skeleton" role="status" aria-label="图表加载中">
            <div class="cview__skeleton-plot">
              <span v-for="h in [42, 68, 30, 80, 55, 72, 38]" :key="h" class="cview__skeleton-bar" :style="{ height: `${h}%` }" />
            </div>
          </div>
          <!-- 重建 shimmer（已有图之后的局部刷新） -->
          <div v-else-if="rebuilding" class="cview__loading" role="status" aria-label="图表更新中" />

          <!-- 右上工具条：提示 / 导出 / 配置 -->
          <div class="cview__toolbar">
            <span v-if="flagCapable && flagCount" class="cview__flagcount" title="已打标点">{{ flagCount }} flagged</span>

            <IPopover
              v-if="warnings.length"
              :open="warnOpen"
              placement="bottom-end"
              :arrow="false"
              @update:open="warnOpen = $event"
            >
              <template #anchor>
                <button
                  type="button"
                  class="cview__warnchip"
                  :aria-expanded="warnOpen"
                  aria-haspopup="dialog"
                  :title="`${warnings.length} 条图表提示`"
                  data-testid="chart-warnings"
                  @click="warnOpen = !warnOpen"
                >
                  <IIcon name="warning" :size="13" />
                  <span>{{ warnings.length }} 条提示</span>
                </button>
              </template>
              <template #default>
                <div class="cview__warnpanel" role="dialog" aria-label="图表提示">
                  <div class="cview__warnpanel-head">图表提示（{{ warnings.length }}）</div>
                  <ul class="cview__warnlist">
                    <li v-for="(w, i) in warnings" :key="i" class="cview__warnitem">{{ w }}</li>
                  </ul>
                </div>
              </template>
            </IPopover>

            <IPopover :open="exportOpen" placement="bottom-end" :arrow="false" @update:open="exportOpen = $event">
              <template #anchor>
                <IButton size="sm" variant="secondary" icon="download" aria-label="导出图表" @click="exportOpen = !exportOpen" />
              </template>
              <template #default>
                <div class="cview__export-menu" role="menu" @keydown="onExportMenuKeydown">
                  <button type="button" role="menuitem" @click="doExport('png')">导出 PNG</button>
                  <button type="button" role="menuitem" @click="doExport('pdf')">导出 PDF</button>
                </div>
              </template>
            </IPopover>

            <button
              v-if="!panelOpen"
              type="button"
              class="cview__open"
              title="打开配置面板"
              @click="panelOpen = true"
            >
              <IIcon name="gear" :size="14" />
              配置
            </button>
          </div>
        </template>

        <!-- 必填缺失空态 -->
        <IEmptyState
          v-else
          :icon="def.icon"
          title="开始配置图表"
          description="选择 X 轴与 Y 轴字段开始绘图"
        >
          <IButton variant="primary" icon="gear" @click="panelOpen = true">打开配置面板</IButton>
        </IEmptyState>
      </div>

      <!-- MODEL TABLES 底栏（6G-1） -->
      <ModelTables
        v-if="view"
        :result="result"
        :fits="fits"
        :flags="flags"
        :view-name="view.name"
        :model-selected="regModelActive"
      />
    </div>

    <!-- 右侧配置抽屉：固定宽度，禁止用 width:0 做 Transition（会被 flex 压没） -->
    <Transition name="cview-drawer">
      <aside v-if="panelOpen" class="cview__drawer" aria-label="图表配置">
      <ChartConfigPanel
          v-if="view"
          :view-name="view.name"
          :chips="chips"
          :saving="chartSaving"
          @rename="rename"
          @cancel="cancel"
          @save="save"
        />
      </aside>
    </Transition>

    <!-- 切换视图 dirty 确认 -->
    <IModal :open="guardOpen" title="未保存的图表修改" :width="420" @update:open="guardCancel">
      <p class="cview__guard-text">当前图表配置有未保存的修改，切换视图前要保存吗？</p>
      <template #footer>
        <IButton @click="guardCancel">取消</IButton>
        <IButton variant="danger" :disabled="chartSaving" @click="guardDiscard">放弃修改</IButton>
        <IButton variant="primary" :loading="chartSaving" @click="guardSave">保存并切换</IButton>
      </template>
    </IModal>

    <!-- Flag 确认（comment 必填） -->
    <IModal :open="flagModalOpen" title="Flag selected points" :width="440" @update:open="flagModalOpen = $event">
      <div class="cview__flagmodal">
        <p class="cview__flagmodal-hint">已选 <b>{{ pendingIds.length }}</b> 个点，打标后显示为 ×；开启 Exclude flagged 后不参与拟合。</p>
        <label class="cview__flagmodal-label">
          Comment <span class="cview__flagmodal-req">*</span>
          <textarea
            v-model="flagCommentInput"
            class="cview__flagmodal-textarea"
            rows="3"
            placeholder="例如：Bad samples /  outliers"
            aria-label="打标备注（必填）"
          />
        </label>
        <ul class="cview__flagmodal-list">
          <li v-for="p in pendingPreview" :key="p.id">
            <span class="cview__flagmodal-coord">x: {{ p.x }}</span>
            <span class="cview__flagmodal-coord">y: {{ p.y }}</span>
          </li>
          <li v-if="pendingIds.length > pendingPreview.length" class="cview__flagmodal-more">… 共 {{ pendingIds.length }} 个</li>
        </ul>
      </div>
      <template #footer>
        <IButton @click="flagModalOpen = false">取消</IButton>
        <IButton variant="primary" icon="flag" :disabled="!flagCommentInput.trim()" @click="confirmFlag">Flag {{ pendingIds.length }} 个点</IButton>
      </template>
    </IModal>

    <!-- Clear 确认 -->
    <IModal :open="clearModalOpen" title="清除打标" :width="400" @update:open="clearModalOpen = $event">
      <p class="cview__guard-text">将移除 <b>{{ pendingIds.length }}</b> 个点的打标（×），确定继续吗？</p>
      <template #footer>
        <IButton @click="clearModalOpen = false">取消</IButton>
        <IButton variant="danger" @click="confirmClear">清除 {{ pendingIds.length }} 个打标</IButton>
      </template>
    </IModal>
  </div>
</template>

<style scoped>
.cview {
  height: 100%;
  min-height: 0;
  min-width: 0;
  display: flex;
  flex-direction: row;
  align-items: stretch;
  position: relative;
  overflow: hidden;
}
.cview__main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  position: relative;
}
.cview__notice {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: var(--is-radius-sm);
  font-size: var(--is-text-sm);
}
.cview__notice--sample {
  background: var(--is-warning-bg);
  color: var(--is-warning-text);
}
.cview__notice--missing {
  background: var(--is-danger-soft);
  color: var(--is-danger);
}
.cview__notice--info {
  background: var(--is-surface-hover);
  color: var(--is-text-secondary);
  font-size: var(--is-text-xs);
}
.cview__notice--warn {
  background: var(--is-warning-bg);
  color: var(--is-warning-text);
}
.cview__warnchip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 26px;
  padding: 0 8px;
  border: 1px solid color-mix(in srgb, var(--is-warning-text) 28%, transparent);
  border-radius: var(--is-radius-sm);
  background: var(--is-warning-bg);
  color: var(--is-warning-text);
  font-size: var(--is-text-xs);
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
}
.cview__warnchip:hover {
  filter: brightness(0.97);
}
.cview__warnpanel {
  width: min(360px, 70vw);
  max-height: min(280px, 50vh);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.cview__warnpanel-head {
  padding: 10px 12px 6px;
  font-size: var(--is-text-xs);
  font-weight: 600;
  color: var(--is-text-secondary);
}
.cview__warnlist {
  margin: 0;
  padding: 4px 0 8px;
  list-style: none;
  overflow: auto;
}
.cview__warnitem {
  position: relative;
  padding: 8px 12px 8px 28px;
  font-size: var(--is-text-xs);
  line-height: 1.45;
  color: var(--is-warning-text);
  border-top: 1px solid var(--is-border);
}
.cview__warnitem:first-child {
  border-top: none;
}
.cview__warnitem::before {
  content: '';
  position: absolute;
  left: 12px;
  top: 12px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--is-warning-text);
  opacity: 0.55;
}
.cview__toolbar {
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
  z-index: 5;
}
.cview__flagcount {
  font-size: var(--is-text-xs);
  color: #d92d20;
  font-weight: 600;
  margin-right: 2px;
}
.cview__flagbtn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 26px;
  padding: 0 10px;
  font-size: var(--is-text-xs);
  font-weight: 500;
  color: var(--is-primary);
  background: var(--is-surface);
  border: 1px solid var(--is-primary);
  border-radius: var(--is-radius-sm);
  transition:
    background-color var(--is-dur-fast) var(--is-ease),
    color var(--is-dur-fast) var(--is-ease);
}
.cview__flagbtn:hover:not(:disabled) {
  background: rgba(30, 42, 120, 0.06);
}
.cview__flagbtn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.cview__flagbtn--active {
  background: var(--is-primary);
  color: #fff;
}
.cview__flagmodal {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.cview__flagmodal-hint {
  font-size: var(--is-text-sm);
  color: var(--is-text-secondary);
}
.cview__flagmodal-label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: var(--is-text-xs);
  font-weight: 600;
  color: var(--is-text-secondary);
}
.cview__flagmodal-req {
  color: var(--is-danger);
}
.cview__flagmodal-textarea {
  width: 100%;
  resize: vertical;
  min-height: 60px;
  padding: 8px 10px;
  font-size: var(--is-text-sm);
  font-family: inherit;
  color: var(--is-text);
  border: 1px solid var(--is-border-strong);
  border-radius: var(--is-radius-sm);
  outline: none;
}
.cview__flagmodal-textarea:focus {
  border-color: var(--is-accent);
  box-shadow: var(--is-ring);
}
.cview__flagmodal-list {
  list-style: none;
  margin: 0;
  padding: 6px 8px;
  max-height: 120px;
  overflow-y: auto;
  background: var(--is-surface-hover);
  border-radius: var(--is-radius-sm);
  display: flex;
  flex-direction: column;
  gap: 3px;
  font-size: var(--is-text-xs);
  color: var(--is-text-secondary);
}
.cview__flagmodal-coord {
  margin-right: 12px;
}
.cview__flagmodal-more {
  color: var(--is-text-tertiary);
}
.cview__notice-link {
  color: var(--is-accent);
  font-weight: 600;
  text-decoration: underline;
}
.cview__notice-hint {
  color: var(--is-warning-text);
  opacity: 0.8;
}
.cview__stage {
  flex: 1;
  min-height: 0;
  position: relative;
  display: flex;
  flex-direction: column;
  /* 底部 MODEL TABLES 面板展开会把 stage 压扁：裁掉溢出的绝对定位浮层
     （Flag 工具条 / 导出按钮），避免盖住 tab bar 上的按钮 */
  overflow: hidden;
}
.cview__chart {
  flex: 1;
  min-height: 0;
}
.cview__loading {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  overflow: hidden;
}
.cview__loading::after {
  content: '';
  display: block;
  height: 100%;
  width: 40%;
  background: var(--is-accent);
  border-radius: 2px;
  animation: cview-shimmer 0.9s var(--is-ease) infinite;
}
@keyframes cview-shimmer {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(350%);
  }
}

/* 首绘骨架：坐标轴 + 柱形 shimmer */
.cview__skeleton {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: stretch;
  padding: 48px 32px 40px 56px;
  background: var(--is-surface);
  z-index: 1;
}
.cview__skeleton-plot {
  flex: 1;
  display: flex;
  align-items: flex-end;
  justify-content: space-around;
  gap: 6%;
  border-left: 2px solid var(--is-border);
  border-bottom: 2px solid var(--is-border);
  padding: 0 4% 0 2%;
}
.cview__skeleton-bar {
  flex: 1;
  max-width: 48px;
  border-radius: 4px 4px 0 0;
  background: linear-gradient(90deg, var(--is-surface-hover) 25%, #e9edf3 50%, var(--is-surface-hover) 75%);
  background-size: 200% 100%;
  animation: cview-skel-shimmer 1.2s linear infinite;
}
@keyframes cview-skel-shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

/* 配置抽屉滑出过渡（transform，不动 width） */
.cview-drawer-enter-active,
.cview-drawer-leave-active {
  transition:
    transform 200ms var(--is-ease),
    opacity 200ms var(--is-ease);
}
.cview-drawer-enter-from,
.cview-drawer-leave-to {
  transform: translateX(24px);
  opacity: 0;
}

/* 焦点环统一（工具条/菜单等原生 button） */
.cview__open:focus-visible,
.cview__export-menu button:focus-visible,
.cview__notice-link:focus-visible {
  outline: none;
  box-shadow: var(--is-ring-sm);
}
.cview__export-menu {
  display: flex;
  flex-direction: column;
  padding: 4px;
  min-width: 120px;
}
.cview__export-menu button {
  text-align: left;
  padding: 7px 10px;
  border-radius: var(--is-radius-sm);
  font-size: var(--is-text-sm);
}
.cview__export-menu button:hover {
  background: var(--is-surface-hover);
}
.cview__open {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 26px;
  padding: 0 10px;
  font-size: var(--is-text-xs);
  color: var(--is-text-secondary);
  background: var(--is-surface);
  border: 1px solid var(--is-border-strong);
  border-radius: var(--is-radius-sm);
  box-shadow: var(--is-shadow-sm);
  transition:
    color var(--is-dur-fast) var(--is-ease),
    border-color var(--is-dur-fast) var(--is-ease);
}
.cview__open:hover {
  color: var(--is-text);
  border-color: var(--is-accent);
}
.cview__drawer {
  width: 340px;
  min-width: 340px;
  max-width: 340px;
  flex: 0 0 340px;
  height: 100%;
  overflow: hidden;
  background: var(--is-surface);
  border-left: 1px solid var(--is-border);
  z-index: 2;
}
.cview__guard-text {
  font-size: var(--is-text-sm);
  color: var(--is-text-secondary);
}
</style>
