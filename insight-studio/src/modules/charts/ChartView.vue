<script setup lang="ts">
import { computed, inject, onBeforeUnmount, provide, reactive, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import type { ChartConfig, ChartType, RowFlag } from '../../shared/types'
import { ROW_ID_FIELD } from '../../shared/types'
import { runPipeline } from '../../shared/pipeline'
import { findView } from '../../shared/tree'
import { useAnalysisStore } from '../../stores/analysisStore'
import { IButton, IEmptyState, IIcon, IModal, IPopover, toast } from '../../ui'
import { TABLE_CHART_CONTEXT } from '../table/context'
import { downloadCsv, toCsv } from '../table/csv'
import { filterSummary } from '../table/filterForm'
import { transformSummary } from '../table/transformForm'
import { getChartDef, buildChartOption, validateChartMapping } from './registry'
import { migrateConfigure, migrateStyle } from './runtime/mapping'
import { samplingNotice } from './runtime/sampling'
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
const draftModel = reactive<ChartDraft>({ saved: cloneConfig(savedConfig.value ?? fallbackConfig()), draft: cloneConfig(savedConfig.value ?? fallbackConfig()) })

function fallbackConfig(): ChartConfig {
  return { chartType: 'bar', position: 'bottom', configure: {}, style: {} }
}

const panelOpen = ref(false)
const saveAttempted = ref(false)

// 视图切换 / 外部保存后重建草稿
watch(
  () => [view.value?.id, view.value?.chart] as const,
  () => {
    const cfg = savedConfig.value
    if (!cfg) return
    const snap = cloneConfig(cfg)
    draftModel.saved = snap
    draftModel.draft = cloneConfig(snap)
    saveAttempted.value = false
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

/** 视图打标（存于 ViewNode.flags）。 */
const flags = computed<RowFlag[]>(() => view.value?.flags ?? [])

let buildToken = 0
function doBuild(r: NonNullable<typeof result.value>, cfg: ChartConfig) {
  const out = buildChartOption(r, cfg, view.value!.name, flags.value)
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
watch([result, previewConfig, flags], () => rebuildDeb.call(), { deep: true, immediate: true })

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

function save() {
  const v = view.value
  if (!v) return
  const errors = validateChartMapping(draftModel.draft, columns.value)
  if (errors.length) {
    saveAttempted.value = true
    toast.error(`无法保存：${errors.map((e) => e.message).join('；')}`, { title: '图表配置不完整' })
    return
  }
  const committed = commitDraft(draftModel as ChartDraft)
  const committedType: ChartType = committed.chartType
  store.mutate((a) => {
    const t = a.tables.find((tb) => tb.id === tc.selected.value?.tableId)
    const target = t && tc.selected.value?.viewId ? findView(t.views, tc.selected.value.viewId) : null
    if (target) {
      target.type = committedType
      target.chart = committed
    }
  })
  saveAttempted.value = false
  toast.success('图表配置已保存')
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
  const to = getChartDef(t)
  const { configure, carried } = migrateConfigure(draftModel.draft, to, columns.value)
  const base = { chartType: t, position: draftModel.draft.position }
  draftModel.draft = {
    ...base,
    configure: { ...to.createDefaultConfigure(), ...configure },
    style: { ...to.createDefaultStyle(), ...migrateStyle(draftModel.draft.style) },
  }
  saveAttempted.value = false
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
  defaultTitle: computed(() => view.value?.name ?? ''),
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

function guardSave() {
  guardOpen.value = false
  save()
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

function toggleFlagMode(mode: 'flag' | 'clear') {
  if (flagMode.value === mode) {
    flagMode.value = 'off'
    return
  }
  flagMode.value = mode
  toast.info(mode === 'flag' ? '打标模式：在图表上套索圈选数据点（Esc 退出）' : '清除模式：套索圈选已打标（×）的点（Esc 退出）')
}

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
function doExport(kind: 'png' | 'pdf') {
  exportOpen.value = false
  const get = () => chartRef.value?.getDataURL() ?? ''
  const name = view.value?.name ?? 'chart'
  if (kind === 'png') exportPng(get, name)
  else exportPdf(get, name)
}

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
      <!-- 采样警告条 -->
      <div v-if="sampling.sampled" class="cview__notice cview__notice--sample">
        <IIcon name="warning" :size="14" />
        <span>{{ sampling.message }}</span>
        <button type="button" class="cview__notice-link" @click="downloadFull">Download</button>
        <span class="cview__notice-hint">to view the complete data.</span>
      </div>

      <!-- 绑定列消失警告 -->
      <div v-if="missingColumns.length" class="cview__notice cview__notice--missing">
        <IIcon name="warning" :size="14" />
        <span>{{ missingColumns.map((e) => e.message).join('；') }}，请打开配置面板重新绑定</span>
      </div>

      <!-- 构建警告（log 回退 / 拟合失败 / 负值剔除等） -->
      <div v-for="(w, i) in warnings" :key="i" class="cview__notice cview__notice--warn">
        <IIcon name="warning" :size="13" />
        <span>{{ w }}</span>
      </div>

      <!-- 图表区 -->
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
            @rendered="rebuilding = false"
            @lasso="onLasso"
          />
          <!-- 加载 shimmer -->
          <div v-if="rebuilding" class="cview__loading" aria-hidden="true" />

          <!-- Flag / Clear 工具条（Line/Scatter） -->
          <div v-if="flagCapable" class="cview__flagbar">
            <span v-if="flagCount" class="cview__flagcount" title="已打标点">{{ flagCount }} flagged</span>
            <button
              type="button"
              class="cview__flagbtn"
              :class="{ 'cview__flagbtn--active': flagMode === 'flag' }"
              :aria-pressed="flagMode === 'flag'"
              @click="toggleFlagMode('flag')"
            >
              <IIcon name="flag" :size="13" /> Flag
            </button>
            <button
              type="button"
              class="cview__flagbtn"
              :class="{ 'cview__flagbtn--active': flagMode === 'clear' }"
              :aria-pressed="flagMode === 'clear'"
              @click="toggleFlagMode('clear')"
            >
              <IIcon name="flag" :size="13" /> Clear
            </button>
          </div>

          <!-- 悬停导出 -->
          <div class="cview__export">
            <IPopover :open="exportOpen" placement="bottom-end" :arrow="false" @update:open="exportOpen = $event">
              <template #anchor>
                <IButton size="sm" variant="secondary" icon="download" aria-label="导出图表" @click="exportOpen = !exportOpen" />
              </template>
              <template #default>
                <div class="cview__export-menu" role="menu">
                  <button type="button" role="menuitem" @click="doExport('png')">导出 PNG</button>
                  <button type="button" role="menuitem" @click="doExport('pdf')">导出 PDF</button>
                </div>
              </template>
            </IPopover>
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

      <!-- 打开配置按钮（面板关闭时） -->
      <button v-if="!panelOpen" type="button" class="cview__open" title="打开配置面板" @click="panelOpen = true">
        <IIcon name="gear" :size="14" />
        配置
      </button>

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

    <!-- 右侧配置抽屉（v-show：开合不重建 ECharts） -->
    <Transition name="cview-drawer">
      <div v-show="panelOpen" class="cview__drawer">
        <ChartConfigPanel v-if="view" :view-name="view.name" :chips="chips" @rename="rename" @cancel="cancel" @save="save" />
      </div>
    </Transition>

    <!-- 切换视图 dirty 确认 -->
    <IModal :open="guardOpen" title="未保存的图表修改" :width="420" @update:open="guardCancel">
      <p class="cview__guard-text">当前图表配置有未保存的修改，切换视图前要保存吗？</p>
      <template #footer>
        <IButton @click="guardCancel">取消</IButton>
        <IButton variant="danger" @click="guardDiscard">放弃修改</IButton>
        <IButton variant="primary" @click="guardSave">保存并切换</IButton>
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
  display: flex;
  position: relative;
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
.cview__flagbar {
  position: absolute;
  top: 8px;
  right: 48px;
  display: flex;
  align-items: center;
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
.cview__flagbtn:hover {
  background: rgba(30, 42, 120, 0.06);
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
.cview__export {
  position: absolute;
  top: 8px;
  right: 8px;
  opacity: 0;
  transition: opacity var(--is-dur-fast) var(--is-ease);
  z-index: 5;
}
.cview__stage:hover .cview__export,
.cview__export:focus-within {
  opacity: 1;
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
  position: absolute;
  top: 8px;
  left: 8px;
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
  height: 100%;
  overflow: hidden;
}
.cview-drawer-enter-active,
.cview-drawer-leave-active {
  transition:
    width var(--is-dur) var(--is-ease),
    opacity var(--is-dur) var(--is-ease);
  width: 340px;
}
.cview-drawer-enter-from,
.cview-drawer-leave-to {
  width: 0;
  opacity: 0;
}
.cview__guard-text {
  font-size: var(--is-text-sm);
  color: var(--is-text-secondary);
}
</style>
