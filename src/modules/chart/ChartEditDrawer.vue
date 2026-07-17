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
          <p v-if="configureMiss.length" class="cfg-miss" role="alert">
            必填槽位未完成：{{ configureMiss.join('、') }}。请按当前图种补齐后再保存。
          </p>
          <el-form label-width="110px" size="small">
            <el-form-item v-if="showXY" :required="true" label="X / Categories">
              <el-select
                v-model="draft.configure.xField"
                clearable
                style="width: 100%"
                aria-label="X 或 Categories 字段"
                :aria-invalid="!draft.configure.xField || undefined"
              >
                <el-option v-for="c in columns" :key="c.field" :label="`${c.title} (${c.dataType})`" :value="c.field" />
              </el-select>
            </el-form-item>
            <el-form-item v-if="showXY" :required="true" label="Y / Measure">
              <el-select
                v-model="draft.configure.yField"
                clearable
                style="width: 100%"
                aria-label="Y 或 Measure 字段"
                :aria-invalid="!draft.configure.yField || undefined"
              >
                <el-option v-for="c in columns" :key="c.field" :label="`${c.title} (${c.dataType})`" :value="c.field" />
              </el-select>
            </el-form-item>
            <el-form-item v-if="showXY" label="Series / Color">
              <el-select v-model="draft.configure.seriesField" clearable style="width: 100%">
                <el-option v-for="c in columns" :key="c.field" :label="c.title" :value="c.field" />
              </el-select>
            </el-form-item>
            <el-form-item v-if="showPie" :required="true" label="Categories(Pie)">
              <el-select
                v-model="draft.configure.categoriesField"
                clearable
                style="width: 100%"
                aria-label="Pie Categories 字段"
                :aria-invalid="!draft.configure.categoriesField || undefined"
              >
                <el-option v-for="c in columns" :key="c.field" :label="c.title" :value="c.field" />
              </el-select>
            </el-form-item>
            <el-form-item v-if="showPie" label="Measure(Pie)">
              <el-select v-model="draft.configure.measureField" clearable style="width: 100%">
                <el-option v-for="c in columns" :key="c.field" :label="c.title" :value="c.field" />
              </el-select>
            </el-form-item>
            <el-form-item v-if="showHeatmap" :required="true" label="Heatmap Row">
              <el-select
                v-model="draft.configure.heatmapRowField"
                clearable
                style="width: 100%"
                aria-label="Heatmap 行字段"
                :aria-invalid="!draft.configure.heatmapRowField || undefined"
              >
                <el-option v-for="c in columns" :key="c.field" :label="c.title" :value="c.field" />
              </el-select>
            </el-form-item>
            <el-form-item v-if="showHeatmap" :required="true" label="Heatmap Col">
              <el-select
                v-model="draft.configure.heatmapColField"
                clearable
                style="width: 100%"
                aria-label="Heatmap 列字段"
                :aria-invalid="!draft.configure.heatmapColField || undefined"
              >
                <el-option v-for="c in columns" :key="c.field" :label="c.title" :value="c.field" />
              </el-select>
            </el-form-item>
            <el-form-item v-if="showHeatmap" :required="true" label="Heatmap Value">
              <el-select
                v-model="draft.configure.heatmapValueField"
                clearable
                style="width: 100%"
                aria-label="Heatmap 值字段"
                :aria-invalid="!draft.configure.heatmapValueField || undefined"
              >
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
              <el-input v-model="draft.configure.xLabel" aria-label="X 轴自定义标签" />
            </el-form-item>
            <el-form-item label="Custom Y label">
              <el-input v-model="draft.configure.yLabel" aria-label="Y 轴自定义标签" />
            </el-form-item>
            <el-form-item v-if="showXY" label="交换 X/Y">
              <el-button
                size="small"
                type="primary"
                plain
                aria-label="交换 X 与 Y 轴映射及轴级设置"
                title="交换字段、标签、Scale 与轴 Range"
                @click="onSwapAxes"
              >
                交换 X ↔ Y
              </el-button>
              <p class="fit-hint" role="note">同时交换字段映射、自定义标签、Scale 与 STYLE 轴 Range。可用键盘激活按钮。</p>
            </el-form-item>
            <el-form-item label="色板">
              <el-select
                v-model="draft.configure.colorPalette"
                style="width: 100%"
                aria-label="颜色色板预设"
              >
                <el-option label="Light" value="light" />
                <el-option label="Dark" value="dark" />
                <el-option label="Alternate" value="alternate" />
              </el-select>
              <div
                class="palette-preview"
                role="img"
                :aria-label="`当前色板预览：${draft.configure.colorPalette || 'light'}`"
              >
                <span
                  v-for="(c, i) in palette"
                  :key="`${c}-${i}`"
                  class="palette-swatch"
                  :style="{ background: c }"
                  :title="c"
                />
              </div>
              <p class="fit-hint" role="note">Light / Dark / Alternate 预设；下方色块为预览（common.md §2.5）。</p>
            </el-form-item>
          </el-form>
        </el-tab-pane>
        <el-tab-pane label="STYLE" name="style">
          <el-form label-width="110px" size="small">
            <h3 class="style-section" id="style-title">Title</h3>
            <el-form-item label="Title">
              <div class="title-row">
                <el-input v-model="draft.style.title" aria-label="图表标题" />
                <el-button
                  size="small"
                  aria-label="刷新标题为默认（视图或表名）"
                  title="刷新恢复默认标题"
                  @click="resetTitle"
                >
                  刷新
                </el-button>
              </div>
            </el-form-item>
            <el-form-item label="Subtitle">
              <el-input v-model="draft.style.subtitle" aria-label="图表副标题" />
            </el-form-item>

            <h3 class="style-section" id="style-layout">Layout</h3>
            <el-form-item label="Width (px)">
              <el-input-number
                v-model="chartWidth"
                :min="120"
                :max="4000"
                :controls="true"
                style="width: 100%"
                aria-label="图表宽度像素"
                placeholder="自适应"
              />
            </el-form-item>
            <el-form-item label="Height (px)">
              <el-input-number
                v-model="chartHeight"
                :min="120"
                :max="4000"
                :controls="true"
                style="width: 100%"
                aria-label="图表高度像素"
                placeholder="自适应"
              />
            </el-form-item>
            <el-form-item label="Margins">
              <div class="margins" role="group" aria-label="图表四边边距像素">
                <label>
                  <span>Top</span>
                  <el-input-number
                    v-model="marginTop"
                    :min="0"
                    :max="400"
                    :controls="false"
                    aria-label="上边距"
                  />
                </label>
                <label>
                  <span>Right</span>
                  <el-input-number
                    v-model="marginRight"
                    :min="0"
                    :max="400"
                    :controls="false"
                    aria-label="右边距"
                  />
                </label>
                <label>
                  <span>Bottom</span>
                  <el-input-number
                    v-model="marginBottom"
                    :min="0"
                    :max="400"
                    :controls="false"
                    aria-label="下边距"
                  />
                </label>
                <label>
                  <span>Left</span>
                  <el-input-number
                    v-model="marginLeft"
                    :min="0"
                    :max="400"
                    :controls="false"
                    aria-label="左边距"
                  />
                </label>
              </div>
            </el-form-item>
            <el-form-item v-if="opacityEnabled" label="Opacity">
              <el-slider v-model="opacity" :min="0.1" :max="1" :step="0.05" aria-label="透明度" />
              <p class="fit-hint" role="note">{{ opacityHintText }}</p>
            </el-form-item>
            <el-form-item v-else label="Opacity">
              <p class="fit-hint" role="note">{{ opacityHintText }}</p>
            </el-form-item>
            <el-form-item label="图例">
              <el-switch v-model="draft.style.legendShow" aria-label="显示图例" />
            </el-form-item>
            <el-form-item label="图例位置">
              <el-select
                v-model="draft.style.legendPosition"
                style="width: 100%"
                aria-label="图例位置"
              >
                <el-option label="Left" value="left" />
                <el-option label="Right" value="right" />
                <el-option label="Top" value="top" />
                <el-option label="Bottom" value="bottom" />
              </el-select>
            </el-form-item>
            <el-form-item label="图例 Label">
              <el-input
                v-model="draft.style.legendLabel"
                clearable
                placeholder="可选自定义前缀"
                aria-label="图例自定义标签"
              />
            </el-form-item>

            <h3 class="style-section" id="style-series">Series</h3>
            <el-form-item v-if="seriesKeys.length" label="系列取色">
              <div class="series-colors" role="group" aria-label="逐系列颜色覆盖">
                <label v-for="(key, i) in seriesKeys" :key="key" class="series-color-row">
                  <span class="series-name">{{ key }}</span>
                  <input
                    type="color"
                    class="series-color-input"
                    :value="seriesColorValue(key, i)"
                    :aria-label="`系列 ${key} 颜色`"
                    @input="onSeriesColorInput(key, ($event.target as HTMLInputElement).value)"
                    @keydown.enter.prevent
                  />
                  <el-button
                    size="small"
                    text
                    :aria-label="`重置系列 ${key} 颜色为色板默认`"
                    @click="clearSeriesColor(key)"
                  >
                    重置
                  </el-button>
                </label>
              </div>
              <p class="fit-hint" role="note">覆盖色板默认分配；Tab 可聚焦色块，重置后恢复当前色板槽位色。</p>
            </el-form-item>
            <el-form-item v-if="pointShapeEnabled" label="点形状">
              <el-select v-model="draft.style.pointShape" style="width: 100%" aria-label="点形状">
                <el-option label="circle" value="circle" />
                <el-option label="rect" value="rect" />
                <el-option label="triangle" value="triangle" />
                <el-option label="diamond" value="diamond" />
              </el-select>
              <p class="fit-hint" role="note">{{ pointShapeHintText }}</p>
            </el-form-item>
            <el-form-item v-else label="点形状">
              <p class="fit-hint" role="note">{{ pointShapeHintText }}</p>
            </el-form-item>

            <h3 class="style-section" id="style-axes">Axes</h3>
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
            <template v-if="showScale">
              <el-form-item v-if="showXScale" label="X Scale">
                <el-select v-model="xScale" style="width: 100%" aria-label="X 轴 Scale">
                  <el-option label="Linear" value="linear" />
                  <el-option label="Log" value="log" />
                </el-select>
              </el-form-item>
              <el-form-item v-if="showYScale" label="Y Scale">
                <el-select v-model="yScale" style="width: 100%" aria-label="Y 轴 Scale">
                  <el-option label="Linear" value="linear" />
                  <el-option label="Log" value="log" />
                </el-select>
              </el-form-item>
              <p class="fit-hint" role="note">对数轴（Log）要求数据全部为正值；否则运行时回退 Linear 并提示。</p>
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
import type { ChartConfig, TableColumn, ViewType } from '@/shared/types/analysis'
import { cloneDeep } from '@/shared/utils/clone'
import { isManualRangeInvalid } from '@/modules/chart/axisRange'
import { supportsAxisScale } from '@/modules/chart/axisScale'
import { swapAxesConfigure, swapAxesStyle } from '@/modules/chart/swapAxes'
import { missingRequiredFields } from '@/modules/chart/guessMapping'
import {
  defaultChartTitle,
  listSeriesKeys,
  opacityAppliesTo,
  opacityHint,
  paletteColors,
  pointShapeAppliesTo,
  pointShapeHint,
  resolveSeriesColor,
} from '@/modules/chart/seriesStyle'
import { toast } from '@/shared/ui/feedback'

const props = defineProps<{
  modelValue: boolean
  config: ChartConfig
  columns: TableColumn[]
  viewType: ViewType
  /** 视图/表名，用于 Title 刷新默认 */
  defaultTitle?: string
  /** 当前表行，用于列出系列取色键 */
  rows?: Record<string, unknown>[]
}>()
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

const showXY = computed(
  () =>
    props.viewType === 'bar' ||
    props.viewType === 'box' ||
    props.viewType === 'line' ||
    props.viewType === 'scatter',
)
const showPie = computed(() => props.viewType === 'pie')
const showHeatmap = computed(() => props.viewType === 'heatmap')
const configureMiss = computed(() => missingRequiredFields(props.viewType, draft.value.configure))
const showScale = computed(() => supportsAxisScale(props.viewType))
const showXScale = computed(
  () =>
    props.viewType === 'line' ||
    props.viewType === 'scatter' ||
    (props.viewType === 'bar' && draft.value.configure.orientation === 'horizontal'),
)
const showYScale = computed(
  () =>
    props.viewType === 'line' ||
    props.viewType === 'scatter' ||
    props.viewType === 'box' ||
    (props.viewType === 'bar' && draft.value.configure.orientation !== 'horizontal'),
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

const opacityEnabled = computed(() => opacityAppliesTo(props.viewType))
const opacityHintText = computed(() => opacityHint(props.viewType))
const pointShapeEnabled = computed(() => pointShapeAppliesTo(props.viewType))
const pointShapeHintText = computed(() => pointShapeHint(props.viewType))

const seriesKeys = computed(() =>
  listSeriesKeys(props.viewType, props.rows || [], draft.value.configure),
)

const palette = computed(() => paletteColors(draft.value.configure.colorPalette))

function seriesColorValue(key: string, index: number): string {
  return resolveSeriesColor(draft.value.style.seriesColors, key, palette.value, index)
}

function onSeriesColorInput(key: string, value: string) {
  const next = { ...(draft.value.style.seriesColors || {}) }
  next[key] = value
  draft.value.style.seriesColors = next
}

function clearSeriesColor(key: string) {
  const next = { ...(draft.value.style.seriesColors || {}) }
  delete next[key]
  draft.value.style.seriesColors = Object.keys(next).length ? next : undefined
}

function resetTitle() {
  draft.value.style.title = defaultChartTitle(props.defaultTitle)
  toast('success', '已恢复默认标题')
}

function marginProp(key: 'marginTop' | 'marginRight' | 'marginBottom' | 'marginLeft', fallback: number) {
  return computed({
    get: () => draft.value.style[key] ?? fallback,
    set: (v: number | undefined | null) => {
      draft.value.style[key] = v == null || !Number.isFinite(v) ? undefined : v
    },
  })
}

const marginTop = marginProp('marginTop', 60)
const marginRight = marginProp('marginRight', 40)
const marginBottom = marginProp('marginBottom', 50)
const marginLeft = marginProp('marginLeft', 60)

const chartWidth = computed({
  get: () => draft.value.style.width,
  set: (v: number | undefined | null) => {
    draft.value.style.width = v == null || !Number.isFinite(v) ? undefined : v
  },
})

const chartHeight = computed({
  get: () => draft.value.style.height,
  set: (v: number | undefined | null) => {
    draft.value.style.height = v == null || !Number.isFinite(v) ? undefined : v
  },
})

function onSwapAxes() {
  draft.value.configure = swapAxesConfigure(draft.value.configure)
  draft.value.style = swapAxesStyle(draft.value.style)
  toast('success', '已交换 X/Y 映射与轴级设置')
}

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

const xScale = computed({
  get: () => draft.value.configure.xScale || 'linear',
  set: (v: 'linear' | 'log') => {
    draft.value.configure.xScale = v
  },
})

const yScale = computed({
  get: () => draft.value.configure.yScale || 'linear',
  set: (v: 'linear' | 'log') => {
    draft.value.configure.yScale = v
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
  // Prefer previously focused Edit trigger; fall back to workspace toolbar.
  const target =
    restoreFocus && document.contains(restoreFocus)
      ? restoreFocus
      : (document.querySelector('#ws-toolbar button, #ws-toolbar [tabindex]') as HTMLElement | null)
  target?.focus?.()
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
  if (configureMiss.value.length) {
    toast('warning', `请先完成必填槽位：${configureMiss.value.join('、')}`)
    tab.value = 'configure'
    return
  }
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
.cfg-miss {
  margin: 0 0 12px;
  padding: 8px 10px;
  font-size: 12px;
  line-height: 1.4;
  color: #c45656;
  background: #fef0f0;
  border-radius: 4px;
}
.range-error {
  margin: 0 0 12px 110px;
  font-size: 12px;
  line-height: 1.4;
  color: #c45656;
}
.margins {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  width: 100%;
}
.margins label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
  color: #646a73;
}
.margins :deep(.el-input-number) {
  width: 100%;
}
.title-row {
  display: flex;
  gap: 8px;
  width: 100%;
  align-items: center;
}
.title-row .el-input {
  flex: 1;
}
.series-colors {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}
.series-color-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.series-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  color: #646a73;
}
.series-color-input {
  width: 36px;
  height: 28px;
  padding: 0;
  border: 1px solid #d0d3d6;
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
}
.series-color-input:focus-visible {
  outline: 2px solid var(--ia-accent, #2f6fed);
  outline-offset: 2px;
}
.style-section {
  margin: 16px 0 10px;
  padding-bottom: 4px;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: #646a73;
  border-bottom: 1px solid #ebeef5;
}
.style-section:first-child {
  margin-top: 0;
}
.palette-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 8px;
}
.palette-swatch {
  width: 18px;
  height: 18px;
  border-radius: 3px;
  border: 1px solid rgba(0, 0, 0, 0.12);
  flex-shrink: 0;
}
</style>
