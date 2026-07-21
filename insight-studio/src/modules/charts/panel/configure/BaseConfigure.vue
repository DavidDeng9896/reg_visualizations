<script setup lang="ts">
import { computed, inject } from 'vue'
import type { RegressionModel } from '../../../../shared/types'
import { IButton, IIcon, ISelect, ITextField, IToggle, ITooltip } from '../../../../ui'
import MappingSlot from '../MappingSlot.vue'
import PalettePicker from '../PalettePicker.vue'
import { CHART_DRAFT_CONTEXT } from '../context'

/** 通用 CONFIGURE 区段：槽位 + 图种专属控件（由 def.capabilities 驱动）。 */
const ctx = inject(CHART_DRAFT_CONTEXT)!
const def = computed(() => ctx.def.value)
const caps = computed(() => def.value.capabilities)

/* X⇄Y 交换（含轴级设置） */
function swapXY() {
  const cfg = ctx.draft.configure
  const style = ctx.draft.style
  if (cfg.values?.length) {
    const x = cfg.x
    cfg.x = cfg.values[0] ? { ...cfg.values[0] } : undefined
    cfg.values = x ? [x] : []
  } else {
    const x = cfg.x
    cfg.x = cfg.y
    cfg.y = x
  }
  const xa = style.xAxis
  style.xAxis = style.yAxis
  style.yAxis = xa
  ctx.touch()
}

/* Bar：方向 / 堆叠（3B） */
const direction = computed({
  get: () => ctx.draft.style.bar?.direction ?? 'vertical',
  set: (v: string | number) => {
    if (!ctx.draft.style.bar) ctx.draft.style.bar = {}
    ctx.draft.style.bar.direction = v === 'horizontal' ? 'horizontal' : 'vertical'
    ctx.touch()
  },
})
const mode = computed({
  get: () => ctx.draft.style.bar?.mode ?? 'grouped',
  set: (v: string | number) => {
    if (!ctx.draft.style.bar) ctx.draft.style.bar = {}
    ctx.draft.style.bar.mode = v === 'stacked' ? 'stacked' : 'grouped'
    ctx.touch()
  },
})

/* 误差棒（1A：仅 mean 聚合可用） */
const meanActive = computed(() => {
  const cfg = ctx.draft.configure
  const ms = cfg.values?.length ? cfg.values : cfg.y ? [cfg.y] : []
  return ms.some((m) => m.aggregation === 'mean')
})
const errorBars = computed({
  get: () => ctx.draft.configure.errorBars ?? 'none',
  set: (v: string | number) => {
    ctx.draft.configure.errorBars = v as 'none' | 'sd' | 'sem'
    ctx.touch()
  },
})

const palette = computed({
  get: () => ctx.draft.configure.palette ?? (def.value.type === 'heatmap' ? 'blues' : 'light'),
  set: (v: string) => {
    ctx.draft.configure.palette = v
    ctx.touch()
  },
})

/* ------------------------------- REGRESSION（6B） ------------------------------- */

const regressionModels = [
  { value: 'none', label: 'None' },
  { value: 'point-to-point', label: 'Point-to-Point' },
  { value: 'linear', label: 'Linear' },
  { value: 'quadratic', label: 'Quadratic' },
  { value: '4pl', label: '4PL' },
]

function ensureRegression() {
  if (!ctx.draft.configure.regression) {
    ctx.draft.configure.regression = { model: 'none', excludeFlagged: false, showAsymptotes: false }
  }
  return ctx.draft.configure.regression
}

const regModel = computed({
  get: () => ctx.draft.configure.regression?.model ?? 'none',
  set: (v: string | number) => {
    ensureRegression().model = v as RegressionModel
    ctx.touch()
  },
})

const numericColumns = computed(() => ctx.columns.value.filter((c) => c.dataType === 'number'))
const weightOptions = computed(() => [
  { value: '', label: 'None（等权）' },
  ...numericColumns.value.map((c) => ({ value: c.field, label: c.title || c.field })),
])
const regWeights = computed({
  get: () => ctx.draft.configure.regression?.weightsField ?? '',
  set: (v: string | number) => {
    const reg = ensureRegression()
    const f = String(v)
    if (f) reg.weightsField = f
    else delete reg.weightsField
    ctx.touch()
  },
})

const regExclude = computed({
  get: () => ctx.draft.configure.regression?.excludeFlagged ?? false,
  set: (v: boolean) => {
    ensureRegression().excludeFlagged = v
    ctx.touch()
  },
})

const regAsymptotes = computed({
  get: () => ctx.draft.configure.regression?.showAsymptotes ?? false,
  set: (v: boolean) => {
    ensureRegression().showAsymptotes = v
    ctx.touch()
  },
})

const constraintMin = computed({
  get: () => {
    const v = ctx.draft.configure.regression?.constraints?.min
    return v === undefined ? '' : String(v)
  },
  set: (v: string) => {
    const reg = ensureRegression()
    const n = v.trim() === '' ? Number.NaN : Number(v)
    if (!reg.constraints) reg.constraints = {}
    if (Number.isFinite(n)) reg.constraints.min = n
    else delete reg.constraints.min
    if (reg.constraints.min === undefined && reg.constraints.max === undefined) delete reg.constraints
    ctx.touch()
  },
})
const constraintMax = computed({
  get: () => {
    const v = ctx.draft.configure.regression?.constraints?.max
    return v === undefined ? '' : String(v)
  },
  set: (v: string) => {
    const reg = ensureRegression()
    const n = v.trim() === '' ? Number.NaN : Number(v)
    if (!reg.constraints) reg.constraints = {}
    if (Number.isFinite(n)) reg.constraints.max = n
    else delete reg.constraints.max
    if (reg.constraints.min === undefined && reg.constraints.max === undefined) delete reg.constraints
    ctx.touch()
  },
})
</script>

<template>
  <div class="cfg">
    <!-- 映射槽位 -->
    <MappingSlot v-for="slot in def.mappingSlots" :key="slot.key" :slot="slot" />

    <!-- X⇄Y 交换 -->
    <div v-if="caps.swapXY" class="cfg__row">
      <IButton size="sm" variant="ghost" icon="swap" @click="swapXY">交换 X / Y</IButton>
    </div>

    <!-- Bar：方向 / 堆叠 -->
    <div v-if="caps.horizontal" class="cfg__row">
      <span class="cfg__label">方向</span>
      <ISelect
        v-model="direction"
        :options="[
          { value: 'vertical', label: '竖直' },
          { value: 'horizontal', label: '水平' },
        ]"
        size="sm"
        aria-label="柱方向"
      />
    </div>
    <div v-if="caps.stack" class="cfg__row">
      <span class="cfg__label">分组模式</span>
      <ISelect
        v-model="mode"
        :options="[
          { value: 'grouped', label: '并排 (Grouped)' },
          { value: 'stacked', label: '堆叠 (Stacked)' },
        ]"
        size="sm"
        aria-label="分组模式"
      />
    </div>

    <!-- 误差棒 -->
    <div v-if="caps.errorBars" class="cfg__row">
      <span class="cfg__label">Error bars</span>
      <ITooltip :content="meanActive ? '' : '仅在聚合为 Average (Mean) 时可用'" placement="bottom">
        <ISelect
          v-model="errorBars"
          :disabled="!meanActive"
          :options="[
            { value: 'none', label: 'None' },
            { value: 'sd', label: 'Standard Deviation' },
            { value: 'sem', label: 'Standard Error of the Mean' },
          ]"
          size="sm"
          aria-label="误差棒"
        />
      </ITooltip>
    </div>

    <!-- 色板 -->
    <div class="cfg__row">
      <span class="cfg__label">Color palette</span>
      <PalettePicker v-model="palette" :continuous="def.type === 'heatmap'" class="cfg__palette" />
    </div>

    <!-- REGRESSION（6B：Line/Scatter 拟合套件） -->
    <section v-if="caps.regression" class="cfg__section">
      <h4 class="cfg__section-title">REGRESSION</h4>
      <div class="cfg__row">
        <span class="cfg__label">Regression model</span>
        <ISelect v-model="regModel" :options="regressionModels" placeholder="Select a regression type" size="sm" aria-label="回归模型" />
      </div>
      <div class="cfg__row">
        <span class="cfg__label cfg__label--icon">
          Weights
          <ITooltip content="选择数值列作为加权最小二乘的权重（权重越大的点对拟合影响越大）；默认 None = 等权" placement="bottom">
            <IIcon name="info" :size="12" class="cfg__help" />
          </ITooltip>
        </span>
        <ISelect v-model="regWeights" :options="weightOptions" size="sm" aria-label="权重列" />
      </div>
      <div class="cfg__row">
        <span class="cfg__label cfg__label--icon">
          Exclude flagged
          <ITooltip content="开启后，打标（×）的点不参与拟合，但仍显示在图表上" placement="bottom">
            <IIcon name="info" :size="12" class="cfg__help" />
          </ITooltip>
        </span>
        <IToggle v-model="regExclude" aria-label="Exclude flagged" />
      </div>
      <template v-if="regModel === '4pl'">
        <div class="cfg__row">
          <span class="cfg__label cfg__label--icon">
            Constraints
            <ITooltip content="固定 4PL 的 Min / Max 参数（留空则由算法自动估计）" placement="bottom">
              <IIcon name="info" :size="12" class="cfg__help" />
            </ITooltip>
          </span>
          <ITextField v-model="constraintMin" type="number" placeholder="Min（可选）" size="sm" aria-label="4PL Min 约束" class="cfg__constraint" />
          <ITextField v-model="constraintMax" type="number" placeholder="Max（可选）" size="sm" aria-label="4PL Max 约束" class="cfg__constraint" />
        </div>
        <div class="cfg__row">
          <span class="cfg__label">Show asymptotes</span>
          <IToggle v-model="regAsymptotes" aria-label="显示渐近线" />
        </div>
      </template>
    </section>
  </div>
</template>

<style scoped>
.cfg {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.cfg__row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 8px;
}
.cfg__row--disabled {
  opacity: 0.55;
}
.cfg__label {
  flex-shrink: 0;
  width: 92px;
  font-size: var(--is-text-xs);
  font-weight: 600;
  color: var(--is-text-secondary);
}
.cfg__row :deep(.is-select) {
  flex: 1;
}
.cfg__palette {
  flex: 1;
  min-width: 0;
}
.cfg__section {
  margin-top: 8px;
  padding: 10px 8px 4px;
  border-top: 1px solid var(--is-border);
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.cfg__section-title {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.05em;
  color: var(--is-text-tertiary);
}
.cfg__label--icon {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.cfg__help {
  color: var(--is-text-tertiary);
  cursor: help;
}
.cfg__constraint {
  flex: 1;
  min-width: 0;
}
</style>
