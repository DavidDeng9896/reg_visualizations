<template>
  <el-drawer
    :model-value="modelValue"
    title="图表配置"
    size="400px"
    destroy-on-close
    @opened="onOpened"
    @closed="onClosed"
    @close="emit('update:modelValue', false)"
  >
    <div ref="panelRef" class="drawer-panel" @keydown="onTrapKeydown">
      <el-tabs v-model="tab">
        <el-tab-pane label="CONFIGURE" name="configure">
          <el-form label-width="110px" size="small">
            <el-form-item label="X / Categories">
              <el-select v-model="draft.configure.xField" clearable style="width: 100%">
                <el-option v-for="c in columns" :key="c.field" :label="`${c.title} (${c.dataType})`" :value="c.field" />
              </el-select>
            </el-form-item>
            <el-form-item label="Y / Measure">
              <el-select v-model="draft.configure.yField" clearable style="width: 100%">
                <el-option v-for="c in columns" :key="c.field" :label="`${c.title} (${c.dataType})`" :value="c.field" />
              </el-select>
            </el-form-item>
            <el-form-item label="Series / Color">
              <el-select v-model="draft.configure.seriesField" clearable style="width: 100%">
                <el-option v-for="c in columns" :key="c.field" :label="c.title" :value="c.field" />
              </el-select>
            </el-form-item>
            <el-form-item label="Categories(Pie)">
              <el-select v-model="draft.configure.categoriesField" clearable style="width: 100%">
                <el-option v-for="c in columns" :key="c.field" :label="c.title" :value="c.field" />
              </el-select>
            </el-form-item>
            <el-form-item label="Measure(Pie)">
              <el-select v-model="draft.configure.measureField" clearable style="width: 100%">
                <el-option v-for="c in columns" :key="c.field" :label="c.title" :value="c.field" />
              </el-select>
            </el-form-item>
            <el-form-item label="Heatmap Row">
              <el-select v-model="draft.configure.heatmapRowField" clearable style="width: 100%">
                <el-option v-for="c in columns" :key="c.field" :label="c.title" :value="c.field" />
              </el-select>
            </el-form-item>
            <el-form-item label="Heatmap Col">
              <el-select v-model="draft.configure.heatmapColField" clearable style="width: 100%">
                <el-option v-for="c in columns" :key="c.field" :label="c.title" :value="c.field" />
              </el-select>
            </el-form-item>
            <el-form-item label="Heatmap Value">
              <el-select v-model="draft.configure.heatmapValueField" clearable style="width: 100%">
                <el-option v-for="c in columns" :key="c.field" :label="c.title" :value="c.field" />
              </el-select>
            </el-form-item>
            <el-form-item label="聚合">
              <el-select v-model="draft.configure.aggregation" style="width: 100%">
                <el-option v-for="a in aggs" :key="a" :label="a" :value="a" />
              </el-select>
            </el-form-item>
            <el-form-item label="误差棒">
              <el-select v-model="draft.configure.errorBars" style="width: 100%">
                <el-option label="None" value="none" />
                <el-option label="SD" value="sd" />
                <el-option label="SEM" value="sem" />
              </el-select>
            </el-form-item>
            <el-form-item label="水平柱">
              <el-switch v-model="horiz" />
            </el-form-item>
            <el-form-item label="堆叠">
              <el-switch v-model="draft.configure.stacked" />
            </el-form-item>
            <el-form-item label="拟合">
              <el-select v-model="draft.configure.fitModel" style="width: 100%" aria-label="拟合模型">
                <el-option label="None" value="none" />
                <el-option label="Point-to-Point" value="ptp" />
                <el-option label="Linear" value="linear" />
                <el-option label="Quadratic" value="quadratic" />
                <el-option label="4PL" value="4pl" />
              </el-select>
              <p v-if="draft.configure.fitModel === '4pl'" class="fit-hint" role="note">
                4PL 至少需要 4 个有效点，且 X/Y 均需有变化；可选手动约束上下渐近线（min / max）。
              </p>
            </el-form-item>
            <el-form-item
              v-if="draft.configure.fitModel === 'linear' || draft.configure.fitModel === 'quadratic'"
              label="过原点"
            >
              <el-switch
                v-model="draft.configure.fitThroughOrigin"
                aria-label="线性或二次拟合强制过原点"
              />
            </el-form-item>
            <template v-if="draft.configure.fitModel === '4pl'">
              <el-form-item label="4PL min">
                <el-input-number
                  v-model="fitMin"
                  :controls="false"
                  placeholder="自动"
                  style="width: 100%"
                  aria-label="4PL 下渐近线约束"
                />
              </el-form-item>
              <el-form-item label="4PL max">
                <el-input-number
                  v-model="fitMax"
                  :controls="false"
                  placeholder="自动"
                  style="width: 100%"
                  aria-label="4PL 上渐近线约束"
                />
              </el-form-item>
            </template>
            <el-form-item label="Exclude flagged">
              <el-switch v-model="draft.configure.excludeFlagged" />
            </el-form-item>
            <el-form-item label="Custom X label">
              <el-input v-model="draft.configure.xLabel" />
            </el-form-item>
            <el-form-item label="Custom Y label">
              <el-input v-model="draft.configure.yLabel" />
            </el-form-item>
            <el-form-item label="色板">
              <el-select v-model="draft.configure.colorPalette" style="width: 100%">
                <el-option label="Light" value="light" />
                <el-option label="Dark" value="dark" />
                <el-option label="Alternate" value="alternate" />
              </el-select>
            </el-form-item>
          </el-form>
        </el-tab-pane>
        <el-tab-pane label="STYLE" name="style">
          <el-form label-width="110px" size="small">
            <el-form-item label="Title"><el-input v-model="draft.style.title" /></el-form-item>
            <el-form-item label="Subtitle"><el-input v-model="draft.style.subtitle" /></el-form-item>
            <el-form-item label="Opacity">
              <el-slider v-model="opacity" :min="0.1" :max="1" :step="0.05" />
            </el-form-item>
            <el-form-item label="图例">
              <el-switch v-model="draft.style.legendShow" />
            </el-form-item>
            <el-form-item label="图例位置">
              <el-select v-model="draft.style.legendPosition" style="width: 100%">
                <el-option label="Left" value="left" />
                <el-option label="Right" value="right" />
                <el-option label="Top" value="top" />
                <el-option label="Bottom" value="bottom" />
              </el-select>
            </el-form-item>
            <el-form-item label="点形状">
              <el-select v-model="draft.style.pointShape" style="width: 100%">
                <el-option label="circle" value="circle" />
                <el-option label="rect" value="rect" />
                <el-option label="triangle" value="triangle" />
                <el-option label="diamond" value="diamond" />
              </el-select>
            </el-form-item>
            <el-form-item label="X Range">
              <el-select v-model="xRangeMode" style="width: 100%" aria-label="X 轴 Range 模式">
                <el-option label="Automatic" value="auto" />
                <el-option label="Manual" value="manual" />
              </el-select>
            </el-form-item>
            <template v-if="draft.style.xRangeMode === 'manual'">
              <el-form-item label="X Min">
                <el-input-number
                  v-model="xMin"
                  :controls="false"
                  style="width: 100%"
                  aria-label="X 轴最小值"
                  :aria-invalid="xRangeInvalid || undefined"
                />
              </el-form-item>
              <el-form-item label="X Max">
                <el-input-number
                  v-model="xMax"
                  :controls="false"
                  style="width: 100%"
                  aria-label="X 轴最大值"
                  :aria-invalid="xRangeInvalid || undefined"
                />
              </el-form-item>
              <p v-if="xRangeInvalid" class="range-error" role="alert">
                X 轴 Manual 范围无效：最小值必须小于最大值；保存前请修正，否则将回退 Automatic。
              </p>
            </template>
            <el-form-item label="Y Range">
              <el-select v-model="yRangeMode" style="width: 100%" aria-label="Y 轴 Range 模式">
                <el-option label="Automatic" value="auto" />
                <el-option label="Manual" value="manual" />
              </el-select>
            </el-form-item>
            <template v-if="draft.style.yRangeMode === 'manual'">
              <el-form-item label="Y Min">
                <el-input-number
                  v-model="yMin"
                  :controls="false"
                  style="width: 100%"
                  aria-label="Y 轴最小值"
                  :aria-invalid="yRangeInvalid || undefined"
                />
              </el-form-item>
              <el-form-item label="Y Max">
                <el-input-number
                  v-model="yMax"
                  :controls="false"
                  style="width: 100%"
                  aria-label="Y 轴最大值"
                  :aria-invalid="yRangeInvalid || undefined"
                />
              </el-form-item>
              <p v-if="yRangeInvalid" class="range-error" role="alert">
                Y 轴 Manual 范围无效：最小值必须小于最大值；保存前请修正，否则将回退 Automatic。
              </p>
            </template>
          </el-form>
        </el-tab-pane>
      </el-tabs>
      <div class="footer">
        <el-button @click="emit('update:modelValue', false)">Cancel</el-button>
        <el-button type="primary" @click="save">Save</el-button>
      </div>
    </div>
  </el-drawer>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import type { ChartConfig, TableColumn } from '@/shared/types/analysis'
import { cloneDeep } from '@/shared/utils/clone'
import { isManualRangeInvalid } from '@/modules/chart/axisRange'
import { toast } from '@/shared/ui/feedback'

const props = defineProps<{ modelValue: boolean; config: ChartConfig; columns: TableColumn[] }>()
const emit = defineEmits<{ 'update:modelValue': [boolean]; save: [ChartConfig] }>()

const tab = ref('configure')
const draft = ref<ChartConfig>(cloneDeep(props.config))
const panelRef = ref<HTMLElement | null>(null)
const aggs = ['count', 'sum', 'min', 'max', 'mean', 'median'] as const
let restoreFocus: HTMLElement | null = null

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'

watch(
  () => props.config,
  (c) => {
    draft.value = cloneDeep(c)
  },
)

const horiz = computed({
  get: () => draft.value.configure.orientation === 'horizontal',
  set: (v: boolean) => {
    draft.value.configure.orientation = v ? 'horizontal' : 'vertical'
  },
})

const opacity = computed({
  get: () => draft.value.style.opacity ?? 0.85,
  set: (v: number) => {
    draft.value.style.opacity = v
  },
})

const fitMin = computed({
  get: () => draft.value.configure.fitConstraints?.min ?? undefined,
  set: (v: number | undefined | null) => {
    const next = { ...(draft.value.configure.fitConstraints || {}) }
    if (v == null || !Number.isFinite(v)) delete next.min
    else next.min = v
    draft.value.configure.fitConstraints =
      next.min != null || next.max != null ? next : undefined
  },
})

const fitMax = computed({
  get: () => draft.value.configure.fitConstraints?.max ?? undefined,
  set: (v: number | undefined | null) => {
    const next = { ...(draft.value.configure.fitConstraints || {}) }
    if (v == null || !Number.isFinite(v)) delete next.max
    else next.max = v
    draft.value.configure.fitConstraints =
      next.min != null || next.max != null ? next : undefined
  },
})

const xRangeMode = computed({
  get: () => draft.value.style.xRangeMode || 'auto',
  set: (v: 'auto' | 'manual') => {
    draft.value.style.xRangeMode = v
  },
})

const yRangeMode = computed({
  get: () => draft.value.style.yRangeMode || 'auto',
  set: (v: 'auto' | 'manual') => {
    draft.value.style.yRangeMode = v
  },
})

const xMin = computed({
  get: () => draft.value.style.xMin,
  set: (v: number | undefined | null) => {
    draft.value.style.xMin = v == null || !Number.isFinite(v) ? undefined : v
  },
})

const xMax = computed({
  get: () => draft.value.style.xMax,
  set: (v: number | undefined | null) => {
    draft.value.style.xMax = v == null || !Number.isFinite(v) ? undefined : v
  },
})

const yMin = computed({
  get: () => draft.value.style.yMin,
  set: (v: number | undefined | null) => {
    draft.value.style.yMin = v == null || !Number.isFinite(v) ? undefined : v
  },
})

const yMax = computed({
  get: () => draft.value.style.yMax,
  set: (v: number | undefined | null) => {
    draft.value.style.yMax = v == null || !Number.isFinite(v) ? undefined : v
  },
})

const xRangeInvalid = computed(() =>
  isManualRangeInvalid({
    mode: draft.value.style.xRangeMode,
    min: draft.value.style.xMin,
    max: draft.value.style.xMax,
  }),
)

const yRangeInvalid = computed(() =>
  isManualRangeInvalid({
    mode: draft.value.style.yRangeMode,
    min: draft.value.style.yMin,
    max: draft.value.style.yMax,
  }),
)

function focusables(): HTMLElement[] {
  const root = panelRef.value?.closest('.el-drawer') || panelRef.value
  if (!root) return []
  return [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
    (el) => !el.hasAttribute('disabled') && el.offsetParent !== null,
  )
}

function onOpened() {
  restoreFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
  void nextTick(() => {
    const list = focusables()
    const closeBtn = list.find((el) => el.classList.contains('el-drawer__close-btn'))
    ;(closeBtn || list[0])?.focus()
  })
}

function onClosed() {
  restoreFocus?.focus?.()
  restoreFocus = null
}

function onTrapKeydown(e: KeyboardEvent) {
  if (e.key !== 'Tab') return
  const list = focusables()
  if (list.length < 2) return
  const first = list[0]
  const last = list[list.length - 1]
  const active = document.activeElement as HTMLElement | null
  if (e.shiftKey) {
    if (active === first || !list.includes(active as HTMLElement)) {
      e.preventDefault()
      last.focus()
    }
  } else if (active === last) {
    e.preventDefault()
    first.focus()
  }
}

function save() {
  if (xRangeInvalid.value || yRangeInvalid.value) {
    toast('warning', '轴 Manual 范围无效：最小值须小于最大值')
    tab.value = 'style'
    return
  }
  emit('save', cloneDeep(draft.value))
}
</script>

<style scoped>
.drawer-panel {
  display: flex;
  flex-direction: column;
  min-height: 100%;
}
.footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 16px;
}
.fit-hint {
  margin: 6px 0 0;
  font-size: 12px;
  line-height: 1.4;
  color: #8f959e;
}
.range-error {
  margin: 0 0 12px 110px;
  font-size: 12px;
  line-height: 1.4;
  color: #c45656;
}
</style>
