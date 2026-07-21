<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { RowFlag } from '../../../shared/types'
import { ROW_ID_FIELD } from '../../../shared/types'
import type { ViewResult } from '../../../shared/pipeline'
import { IButton, IIcon, IModal, IPopover, ISelect, toast } from '../../../ui'
import { downloadCsv, toCsv } from '../../table/csv'
import { flagSetOf, flagCommentOf } from '../flags'
import { formatNumber } from '../runtime/shared'
import type { FitGroupSummary } from '../fit/summary'

/**
 * MODEL TABLES 底栏（6G-1，截图 09）：
 * SOURCE TABLE / MODEL OUTPUT TABLE / MODEL VARIABLES 三个 Tab；
 * 无拟合时后两个 disabled；可折叠（chevron）+ 高度拖拽；
 * MODEL OUTPUT 卡带标题「{视图名} | Model output — {组名}」+ 放大 + ⋯ 导出 CSV。
 */
const props = defineProps<{
  result: ViewResult | null
  fits: FitGroupSummary[]
  flags: RowFlag[]
  viewName: string
  /** 草稿中已选回归模型（非 none），用于 disabled 提示。 */
  modelSelected: boolean
}>()

type TabKey = 'source' | 'output' | 'variables'

const collapsed = ref(true)
const tab = ref<TabKey>('source')
const height = ref(260)
const groupIdx = ref(0)
const expandOpen = ref(false)
const menuOpen = ref(false)

const hasFit = computed(() => props.fits.length > 0)
const tabs = computed(() => [
  { key: 'source' as TabKey, label: 'SOURCE TABLE', disabled: false },
  { key: 'output' as TabKey, label: 'MODEL OUTPUT TABLE', disabled: !hasFit.value },
  { key: 'variables' as TabKey, label: 'MODEL VARIABLES', disabled: !hasFit.value },
])

function selectTab(key: TabKey) {
  const t = tabs.value.find((x) => x.key === key)
  if (!t || t.disabled) {
    if (t?.disabled) toast.info(props.modelSelected ? '拟合不可用（检查数据点数与模型要求）' : '选择 Regression model 后可用')
    return
  }
  if (tab.value === key && !collapsed.value) {
    collapsed.value = true
    return
  }
  tab.value = key
  collapsed.value = false
}

watch(hasFit, (v) => {
  if (!v && tab.value !== 'source') tab.value = 'source'
  groupIdx.value = 0
})

const activeFit = computed<FitGroupSummary | null>(() => props.fits[Math.min(groupIdx.value, props.fits.length - 1)] ?? null)
const groupOptions = computed(() => props.fits.map((f, i) => ({ value: String(i), label: f.group || '(全部数据)' })))
const groupIdxModel = computed({
  get: () => String(groupIdx.value),
  set: (v: string | number) => {
    groupIdx.value = Number(v)
  },
})

/* ------------------------------- 高度拖拽 ------------------------------- */
let dragStartY = 0
let dragStartH = 0
function onDragStart(e: MouseEvent) {
  dragStartY = e.clientY
  dragStartH = height.value
  const onMove = (ev: MouseEvent) => {
    height.value = Math.min(520, Math.max(140, dragStartH + (dragStartY - ev.clientY)))
  }
  const onUp = () => {
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
  }
  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onUp)
}

/* ------------------------------- SOURCE TABLE ------------------------------- */
const flagSet = computed(() => flagSetOf(props.flags))
const SOURCE_CAP = 500
const sourceRows = computed(() => (props.result?.rows ?? []).slice(0, SOURCE_CAP))
const sourceCapped = computed(() => (props.result?.rows.length ?? 0) > SOURCE_CAP)
function isFlagged(row: Record<string, unknown>): boolean {
  return flagSet.value.has(String(row[ROW_ID_FIELD] ?? ''))
}
function flagComment(row: Record<string, unknown>): string | undefined {
  return flagCommentOf(props.flags, String(row[ROW_ID_FIELD] ?? ''))
}

/* ------------------------------- 导出 ------------------------------- */
function exportOutputCsv() {
  const f = activeFit.value
  if (!f) return
  menuOpen.value = false
  const columns = [
    { field: 'X', title: 'X', dataType: 'number' as const },
    { field: 'Y', title: 'Y', dataType: 'number' as const },
    { field: 'Y pred', title: 'Y pred', dataType: 'number' as const },
    { field: 'Residual', title: 'Residual', dataType: 'number' as const },
    { field: 'Flagged', title: 'Flagged', dataType: 'string' as const },
  ]
  const rows = f.output.map((r) => ({ X: r.x, Y: r.y, 'Y pred': r.yPred, Residual: r.residual, Flagged: r.flagged ? '×' : '' }))
  const suffix = f.group ? `-${f.group}` : ''
  downloadCsv(`${props.viewName || 'chart'}-model-output${suffix}.csv`, toCsv(columns, rows))
  toast.success('已导出 Model output CSV')
}

const cardTitle = computed(() => {
  const f = activeFit.value
  if (!f) return props.viewName
  const base = `${props.viewName} | ${tab.value === 'variables' ? 'Model variables' : 'Model output'}`
  return f.group ? `${base} — ${f.group}` : base
})

const OUTPUT_CAP = 1000
const outputRows = computed(() => (activeFit.value?.output ?? []).slice(0, OUTPUT_CAP))
const outputCapped = computed(() => (activeFit.value?.output.length ?? 0) > OUTPUT_CAP)

const fmt = (v: number | null | undefined) => (v === null || v === undefined || !Number.isFinite(v) ? '—' : formatNumber(v))
</script>

<template>
  <div class="mtabs" :class="{ 'mtabs--collapsed': collapsed }">
    <!-- 拖拽条 -->
    <div v-if="!collapsed" class="mtabs__drag" title="拖拽调整高度" @mousedown="onDragStart" />

    <!-- Tab 栏 -->
    <div class="mtabs__bar">
      <div class="mtabs__tabs" role="tablist">
        <button
          v-for="t in tabs"
          :key="t.key"
          type="button"
          class="mtabs__tab"
          :class="{ 'mtabs__tab--active': tab === t.key && !collapsed, 'mtabs__tab--disabled': t.disabled }"
          role="tab"
          :aria-selected="tab === t.key && !collapsed"
          :aria-disabled="t.disabled"
          @click="selectTab(t.key)"
        >
          {{ t.label }}
        </button>
      </div>
      <button
        type="button"
        class="mtabs__collapse"
        :title="collapsed ? '展开表格' : '收起表格'"
        :aria-label="collapsed ? '展开表格' : '收起表格'"
        @click="collapsed = !collapsed"
      >
        <IIcon :name="collapsed ? 'chevron-up' : 'chevron-down'" :size="13" />
      </button>
    </div>

    <!-- 内容 -->
    <div v-show="!collapsed" class="mtabs__body" :style="{ height: `${height}px` }">
      <!-- 卡片头：标题 + 组切换 + 放大 + ⋯ -->
      <div class="mtabs__cardhead">
        <span class="mtabs__title is-ellipsis">{{ tab === 'source' ? `${viewName} | Source table` : cardTitle }}</span>
        <ISelect
          v-if="tab !== 'source' && fits.length > 1"
          v-model="groupIdxModel"
          :options="groupOptions"
          size="sm"
          aria-label="选择分组"
          class="mtabs__groupsel"
        />
        <template v-if="tab !== 'source'">
          <IButton size="sm" variant="secondary" icon="expand" aria-label="放大表格" title="放大" @click="expandOpen = true" />
          <IPopover :open="menuOpen" placement="bottom-end" :arrow="false" @update:open="menuOpen = $event">
            <template #anchor>
              <IButton size="sm" variant="secondary" icon="more" aria-label="更多操作" @click="menuOpen = !menuOpen" />
            </template>
            <template #default>
              <div class="mtabs__menu" role="menu">
                <button type="button" role="menuitem" :disabled="tab === 'variables'" @click="exportOutputCsv">导出 CSV</button>
              </div>
            </template>
          </IPopover>
        </template>
      </div>

      <!-- SOURCE TABLE -->
      <div v-if="tab === 'source'" class="mtabs__scroll">
        <table class="mtabs__table">
          <thead>
            <tr>
              <th class="mtabs__idx">#</th>
              <th v-if="flags.length" class="mtabs__flagcol"><IIcon name="flag" :size="11" /></th>
              <th v-for="c in result?.columns ?? []" :key="c.field">
                <IIcon :name="c.dataType === 'number' ? 'type-number' : 'type-text'" :size="11" class="mtabs__colicon" />
                {{ c.title }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, ri) in sourceRows" :key="ri" :class="{ 'mtabs__row--flagged': isFlagged(row) }">
              <td class="mtabs__idx">{{ ri + 1 }}</td>
              <td v-if="flags.length" class="mtabs__flagcol">
                <IIcon v-if="isFlagged(row)" name="flag" :size="11" class="mtabs__flagicon" :title="flagComment(row)" />
              </td>
              <td v-for="c in result?.columns ?? []" :key="c.field">{{ row[c.field] ?? '' }}</td>
            </tr>
          </tbody>
        </table>
        <p v-if="sourceCapped" class="mtabs__cap">仅显示前 {{ SOURCE_CAP }} 行（共 {{ result?.rows.length }} 行）</p>
      </div>

      <!-- MODEL OUTPUT TABLE -->
      <div v-else-if="tab === 'output'" class="mtabs__scroll">
        <table class="mtabs__table">
          <thead>
            <tr>
              <th class="mtabs__idx">#</th>
              <th><IIcon name="type-number" :size="11" class="mtabs__colicon" /> X</th>
              <th><IIcon name="type-number" :size="11" class="mtabs__colicon" /> Y</th>
              <th><IIcon name="type-number" :size="11" class="mtabs__colicon" /> Y pred</th>
              <th><IIcon name="type-number" :size="11" class="mtabs__colicon" /> Residual</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(r, ri) in outputRows" :key="ri" :class="{ 'mtabs__row--flagged': r.flagged }">
              <td class="mtabs__idx">{{ ri + 1 }}</td>
              <td>{{ fmt(r.x) }}</td>
              <td>{{ fmt(r.y) }}</td>
              <td>{{ fmt(r.yPred) }}</td>
              <td>{{ fmt(r.residual) }}</td>
            </tr>
          </tbody>
        </table>
        <p v-if="outputCapped" class="mtabs__cap">仅显示前 {{ OUTPUT_CAP }} 行（共 {{ activeFit?.output.length }} 行）</p>
      </div>

      <!-- MODEL VARIABLES -->
      <div v-else class="mtabs__scroll">
        <table class="mtabs__table mtabs__table--vars">
          <thead>
            <tr>
              <th>参数</th>
              <th>估计值</th>
              <th>CI95 下限</th>
              <th>CI95 上限</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="v in activeFit?.variables ?? []" :key="v.name" :class="{ 'mtabs__row--r2': v.name === 'R²' }">
              <td>{{ v.name }}</td>
              <td>{{ fmt(v.estimate) }}</td>
              <td>{{ fmt(v.ciLow) }}</td>
              <td>{{ fmt(v.ciHigh) }}</td>
            </tr>
          </tbody>
        </table>
        <p v-if="activeFit?.converged === false" class="mtabs__cap mtabs__cap--warn">⚠ 模型未完全收敛，参数为当前最优估计</p>
        <p v-if="activeFit && activeFit.variables.length <= 1" class="mtabs__cap">Point-to-Point 为连接模型，无回归参数</p>
      </div>
    </div>

    <!-- 全屏放大 -->
    <IModal :open="expandOpen" :title="cardTitle" :width="860" @update:open="expandOpen = $event">
      <div class="mtabs__modal">
        <table v-if="tab === 'output'" class="mtabs__table">
          <thead>
            <tr>
              <th class="mtabs__idx">#</th>
              <th>X</th>
              <th>Y</th>
              <th>Y pred</th>
              <th>Residual</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(r, ri) in activeFit?.output ?? []" :key="ri" :class="{ 'mtabs__row--flagged': r.flagged }">
              <td class="mtabs__idx">{{ ri + 1 }}</td>
              <td>{{ fmt(r.x) }}</td>
              <td>{{ fmt(r.y) }}</td>
              <td>{{ fmt(r.yPred) }}</td>
              <td>{{ fmt(r.residual) }}</td>
            </tr>
          </tbody>
        </table>
        <table v-else class="mtabs__table mtabs__table--vars">
          <thead>
            <tr>
              <th>参数</th>
              <th>估计值</th>
              <th>CI95 下限</th>
              <th>CI95 上限</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="v in activeFit?.variables ?? []" :key="v.name">
              <td>{{ v.name }}</td>
              <td>{{ fmt(v.estimate) }}</td>
              <td>{{ fmt(v.ciLow) }}</td>
              <td>{{ fmt(v.ciHigh) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <template #footer>
        <IButton @click="expandOpen = false">关闭</IButton>
        <IButton v-if="tab === 'output'" variant="primary" icon="download" @click="exportOutputCsv">导出 CSV</IButton>
      </template>
    </IModal>
  </div>
</template>

<style scoped>
.mtabs {
  flex-shrink: 0;
  border-top: 1px solid var(--is-border);
  background: var(--is-surface);
  position: relative;
  display: flex;
  flex-direction: column;
}
.mtabs__drag {
  position: absolute;
  top: -3px;
  left: 0;
  right: 0;
  height: 6px;
  cursor: row-resize;
  z-index: 4;
}
.mtabs__drag:hover {
  background: rgba(46, 91, 255, 0.18);
}
.mtabs__bar {
  display: flex;
  align-items: center;
  padding: 0 8px;
  border-bottom: 1px solid var(--is-border);
}
.mtabs__tabs {
  display: flex;
  gap: 2px;
  flex: 1;
  min-width: 0;
}
.mtabs__tab {
  padding: 7px 10px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.03em;
  color: var(--is-text-tertiary);
  border-bottom: 2px solid transparent;
  transition:
    color var(--is-dur-fast) var(--is-ease),
    border-color var(--is-dur-fast) var(--is-ease);
}
.mtabs__tab:hover:not(.mtabs__tab--disabled) {
  color: var(--is-text);
}
.mtabs__tab--active {
  color: var(--is-accent);
  border-bottom-color: var(--is-accent);
}
.mtabs__tab--disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.mtabs__collapse {
  display: inline-flex;
  padding: 5px;
  border-radius: var(--is-radius-sm);
  color: var(--is-text-secondary);
}
.mtabs__collapse:hover {
  background: var(--is-surface-hover);
  color: var(--is-text);
}
.mtabs__body {
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}
.mtabs__cardhead {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
}
.mtabs__title {
  flex: 1;
  min-width: 0;
  font-size: var(--is-text-sm);
  font-weight: 600;
}
.mtabs__groupsel {
  width: 180px;
  flex-shrink: 0;
}
.mtabs__menu {
  display: flex;
  flex-direction: column;
  padding: 4px;
  min-width: 120px;
}
.mtabs__menu button {
  text-align: left;
  padding: 7px 10px;
  border-radius: var(--is-radius-sm);
  font-size: var(--is-text-sm);
}
.mtabs__menu button:hover:not(:disabled) {
  background: var(--is-surface-hover);
}
.mtabs__menu button:disabled {
  opacity: 0.45;
}
.mtabs__scroll {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 0 12px 10px;
}
.mtabs__table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--is-text-xs);
}
.mtabs__table th {
  position: sticky;
  top: 0;
  background: var(--is-surface-hover);
  text-align: left;
  font-weight: 600;
  color: var(--is-text-secondary);
  padding: 6px 10px;
  border-bottom: 1px solid var(--is-border);
  white-space: nowrap;
  z-index: 1;
}
.mtabs__table td {
  padding: 5px 10px;
  border-bottom: 1px solid var(--is-border);
  color: var(--is-text);
  white-space: nowrap;
}
.mtabs__idx {
  width: 36px;
  color: var(--is-text-tertiary);
}
.mtabs__flagcol {
  width: 28px;
}
.mtabs__flagicon {
  color: #d92d20;
}
.mtabs__colicon {
  margin-right: 4px;
  color: var(--is-text-tertiary);
}
.mtabs__row--flagged td {
  background: rgba(217, 45, 32, 0.06);
}
.mtabs__row--r2 td {
  font-weight: 600;
  background: var(--is-surface-hover);
}
.mtabs__table--vars {
  max-width: 640px;
}
.mtabs__cap {
  padding: 8px 4px;
  font-size: var(--is-text-xs);
  color: var(--is-text-tertiary);
}
.mtabs__cap--warn {
  color: var(--is-warning-text);
}
.mtabs__modal {
  max-height: 60vh;
  overflow: auto;
}
</style>
