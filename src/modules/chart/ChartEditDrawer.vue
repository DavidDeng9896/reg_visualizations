<template>
  <div
    v-if="modelValue"
    class="drawer-root"
    role="dialog"
    aria-modal="true"
    aria-labelledby="chart-edit-drawer-title"
    @keydown.esc="close"
    @keydown="onTrapKeydown"
  >
    <button
      type="button"
      class="drawer-backdrop"
      tabindex="-1"
      aria-label="关闭图表配置"
      @click="close"
    />
    <aside ref="panelRef" class="drawer-panel" aria-labelledby="chart-edit-drawer-title">
      <header class="drawer-header">
        <h2 id="chart-edit-drawer-title">图表配置</h2>
        <button type="button" class="icon-close" aria-label="关闭" @click="close">×</button>
      </header>
      <p class="fit-hint drawer-a11y" role="note">
        Tab 在面板内循环焦点；Esc 关闭。下拉字段可用方向键与 Enter 选择。
      </p>
      <div
        class="drawer-tablist"
        role="tablist"
        aria-label="图表配置分区"
        @keydown="onTabListKeydown"
      >
        <button
          id="chart-tab-configure-btn"
          type="button"
          class="drawer-tab"
          role="tab"
          :aria-selected="tab === 'configure'"
          aria-controls="chart-tab-configure"
          :tabindex="tab === 'configure' ? 0 : -1"
          @click="tab = 'configure'"
        >
          CONFIGURE
        </button>
        <button
          id="chart-tab-style-btn"
          type="button"
          class="drawer-tab"
          role="tab"
          :aria-selected="tab === 'style'"
          aria-controls="chart-tab-style"
          :tabindex="tab === 'style' ? 0 : -1"
          @click="tab = 'style'"
        >
          STYLE
        </button>
      </div>
      <div class="drawer-body">
        <div
          v-show="tab === 'configure'"
          id="chart-tab-configure"
          class="drawer-tabpanel"
          role="tabpanel"
          aria-labelledby="chart-tab-configure-btn"
        >
          <p
            v-if="configureMiss.length"
            :id="CFG_MISS_ALERT_ID"
            class="cfg-miss"
            role="alert"
            tabindex="-1"
          >
            必填槽位未完成：{{ configureMiss.join('、') }}。请按当前图种补齐后再保存。
          </p>
          <el-form label-width="110px" size="small">
            <el-form-item v-if="showXY" :required="true" label="X / Categories">
              <select
                class="native-field-select"
                :value="toNativeSelectValue(draft.configure.xField)"
                aria-label="X 或 Categories 字段"
                :aria-invalid="!draft.configure.xField || undefined"
                :aria-describedby="cfgMissDescribedBy(configureMiss.includes('X'))"
                @change="onXFieldChange"
              >
                <option value="">（清空）</option>
                <option v-for="c in columns" :key="c.field" :value="c.field">
                  {{ columnSelectLabel(c) }}
                </option>
              </select>
            </el-form-item>
            <el-form-item v-if="showXY" :required="true" label="Y / Measure">
              <select
                class="native-field-select"
                :value="toNativeSelectValue(draft.configure.yField)"
                aria-label="Y 或 Measure 字段"
                :aria-invalid="!draft.configure.yField || undefined"
                :aria-describedby="cfgMissDescribedBy(configureMiss.includes('Y'))"
                @change="onYFieldChange"
              >
                <option value="">（清空）</option>
                <option v-for="c in columns" :key="c.field" :value="c.field">
                  {{ columnSelectLabel(c) }}
                </option>
              </select>
            </el-form-item>
            <el-form-item v-if="showXY" label="Series / Color">
              <select
                class="native-field-select"
                :value="toNativeSelectValue(draft.configure.seriesField)"
                aria-label="Series 或 Color 字段"
                @change="onSeriesFieldChange"
              >
                <option value="">（清空）</option>
                <option v-for="c in columns" :key="c.field" :value="c.field">{{ c.title }}</option>
              </select>
            </el-form-item>
            <el-form-item v-if="showPie" :required="true" label="Categories(Pie)">
              <select
                class="native-field-select"
                :value="toNativeSelectValue(draft.configure.categoriesField)"
                aria-label="Pie Categories 字段"
                :aria-invalid="!draft.configure.categoriesField || undefined"
                :aria-describedby="cfgMissDescribedBy(configureMiss.includes('Categories'))"
                @change="onCategoriesFieldChange"
              >
                <option value="">（清空）</option>
                <option v-for="c in columns" :key="c.field" :value="c.field">{{ c.title }}</option>
              </select>
            </el-form-item>
            <el-form-item v-if="showPie" label="Measure(Pie)">
              <select
                class="native-field-select"
                :value="toNativeSelectValue(draft.configure.measureField)"
                aria-label="Pie Measure 字段"
                @change="onMeasureFieldChange"
              >
                <option value="">（清空）</option>
                <option v-for="c in columns" :key="c.field" :value="c.field">{{ c.title }}</option>
              </select>
            </el-form-item>
            <el-form-item v-if="showHeatmap" :required="true" label="Heatmap Row">
              <select
                class="native-field-select"
                :value="toNativeSelectValue(draft.configure.heatmapRowField)"
                aria-label="Heatmap 行字段"
                :aria-invalid="!draft.configure.heatmapRowField || undefined"
                :aria-describedby="cfgMissDescribedBy(configureMiss.includes('Heatmap Row'))"
                @change="onHeatmapRowChange"
              >
                <option value="">（清空）</option>
                <option v-for="c in columns" :key="c.field" :value="c.field">{{ c.title }}</option>
              </select>
            </el-form-item>
            <el-form-item v-if="showHeatmap" :required="true" label="Heatmap Col">
              <select
                class="native-field-select"
                :value="toNativeSelectValue(draft.configure.heatmapColField)"
                aria-label="Heatmap 列字段"
                :aria-invalid="!draft.configure.heatmapColField || undefined"
                :aria-describedby="cfgMissDescribedBy(configureMiss.includes('Heatmap Col'))"
                @change="onHeatmapColChange"
              >
                <option value="">（清空）</option>
                <option v-for="c in columns" :key="c.field" :value="c.field">{{ c.title }}</option>
              </select>
            </el-form-item>
            <el-form-item v-if="showHeatmap" :required="true" label="Heatmap Value">
              <select
                class="native-field-select"
                :value="toNativeSelectValue(draft.configure.heatmapValueField)"
                aria-label="Heatmap 值字段"
                :aria-invalid="!draft.configure.heatmapValueField || undefined"
                :aria-describedby="cfgMissDescribedBy(configureMiss.includes('Heatmap Value'))"
                @change="onHeatmapValueChange"
              >
                <option value="">（清空）</option>
                <option v-for="c in columns" :key="c.field" :value="c.field">{{ c.title }}</option>
              </select>
            </el-form-item>
            <el-form-item label="聚合">
              <select
                class="native-field-select"
                :value="draft.configure.aggregation || 'count'"
                aria-label="聚合方式"
                @change="onAggregationChange"
              >
                <option v-for="a in aggs" :key="a" :value="a">{{ a }}</option>
              </select>
            </el-form-item>
            <el-form-item v-if="errorBarsEnabled" label="误差棒">
              <select
                class="native-field-select"
                :value="draft.configure.errorBars || 'none'"
                :disabled="!errorBarsAggOk"
                aria-label="误差棒"
                @change="onErrorBarsChange"
              >
                <option value="none">None</option>
                <option value="sd">SD</option>
                <option value="sem">SEM</option>
              </select>
              <p class="fit-hint" role="note">{{ errorBarsHintText }}</p>
            </el-form-item>
            <el-form-item v-else label="误差棒">
              <p class="fit-hint" role="note">{{ errorBarsHintText }}</p>
            </el-form-item>
            <el-form-item label="水平柱">
              <label class="native-switch">
                <input v-model="horiz" type="checkbox" role="switch" aria-label="水平柱" />
                <span class="native-switch-ui" aria-hidden="true" />
              </label>
            </el-form-item>
            <el-form-item label="堆叠">
              <label class="native-switch">
                <input v-model="draft.configure.stacked" type="checkbox" role="switch" aria-label="堆叠" />
                <span class="native-switch-ui" aria-hidden="true" />
              </label>
            </el-form-item>
            <el-form-item label="拟合">
              <select
                class="native-field-select"
                :value="draft.configure.fitModel || 'none'"
                aria-label="拟合模型"
                @change="onFitModelChange"
              >
                <option value="none">None</option>
                <option value="ptp">Point-to-Point</option>
                <option value="linear">Linear</option>
                <option value="quadratic">Quadratic</option>
                <option value="4pl">4PL</option>
              </select>
              <p v-if="draft.configure.fitModel === '4pl'" class="fit-hint" role="note">
                4PL 至少需要 4 个有效点，且 X/Y 均需有变化；可选手动约束上下渐近线（min / max）。
              </p>
            </el-form-item>
            <el-form-item
              v-if="draft.configure.fitModel === 'linear' || draft.configure.fitModel === 'quadratic'"
              label="过原点"
            >
              <label class="native-switch">
                <input
                  v-model="draft.configure.fitThroughOrigin"
                  type="checkbox"
                  role="switch"
                  aria-label="线性或二次拟合强制过原点"
                />
                <span class="native-switch-ui" aria-hidden="true" />
              </label>
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
              <label class="native-switch">
                <input
                  v-model="draft.configure.excludeFlagged"
                  type="checkbox"
                  role="switch"
                  aria-label="Exclude flagged"
                />
                <span class="native-switch-ui" aria-hidden="true" />
              </label>
            </el-form-item>
            <el-form-item label="Custom X label">
              <el-input v-model="draft.configure.xLabel" aria-label="X 轴自定义标签" />
            </el-form-item>
            <el-form-item label="Custom Y label">
              <el-input v-model="draft.configure.yLabel" aria-label="Y 轴自定义标签" />
            </el-form-item>
            <el-form-item v-if="showXY" label="交换 X/Y">
              <button
                type="button"
                class="btn btn-primary-plain"
                aria-label="交换 X 与 Y 轴映射及轴级设置"
                title="交换字段、标签、Scale 与轴 Range"
                @click="onSwapAxes"
              >
                交换 X ↔ Y
              </button>
              <p class="fit-hint" role="note">同时交换字段映射、自定义标签、Scale 与 STYLE 轴 Range。可用键盘激活按钮。</p>
            </el-form-item>
            <el-form-item label="色板">
              <select
                class="native-field-select"
                :value="draft.configure.colorPalette || 'light'"
                aria-label="颜色色板预设"
                @change="onColorPaletteChange"
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="alternate">Alternate</option>
              </select>
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
              <p class="fit-hint" role="note">
                Light / Dark / Alternate 预设；下方色块为默认分配预览。STYLE · Series 取色可覆盖单个系列（common.md §2.5）。
              </p>
            </el-form-item>
          </el-form>
        </div>
        <div
          v-show="tab === 'style'"
          id="chart-tab-style"
          class="drawer-tabpanel"
          role="tabpanel"
          aria-labelledby="chart-tab-style-btn"
        >
          <el-form label-width="110px" size="small">
            <section class="style-block" aria-labelledby="style-title">
            <h3 class="style-section" id="style-title">Title</h3>
            <el-form-item label="Title">
              <div class="title-row">
                <el-input v-model="draft.style.title" aria-label="图表标题" />
                <button
                  type="button"
                  class="btn"
                  aria-label="刷新标题为默认（视图或表名）"
                  title="刷新恢复默认标题"
                  @click="resetTitle"
                >
                  刷新
                </button>
              </div>
            </el-form-item>
            <el-form-item label="Subtitle">
              <el-input v-model="draft.style.subtitle" aria-label="图表副标题" />
            </el-form-item>
            </section>

            <section class="style-block" aria-labelledby="style-layout">
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
              <label class="native-switch">
                <input
                  v-model="draft.style.legendShow"
                  type="checkbox"
                  role="switch"
                  aria-label="显示图例"
                />
                <span class="native-switch-ui" aria-hidden="true" />
              </label>
            </el-form-item>
            <el-form-item label="图例位置">
              <select
                class="native-field-select"
                v-model="draft.style.legendPosition"
                aria-label="图例位置"
              >
                <option value="left">Left</option>
                <option value="right">Right</option>
                <option value="top">Top</option>
                <option value="bottom">Bottom</option>
              </select>
            </el-form-item>
            <el-form-item label="图例 Label">
              <el-input
                v-model="draft.style.legendLabel"
                clearable
                placeholder="可选自定义前缀"
                aria-label="图例自定义标签"
              />
            </el-form-item>
            </section>

            <section class="style-block" aria-labelledby="style-series">
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
                  <button
                    type="button"
                    class="btn btn-text"
                    :aria-label="`重置系列 ${key} 颜色为色板默认`"
                    @click="clearSeriesColor(key)"
                  >
                    重置
                  </button>
                </label>
              </div>
              <p class="fit-hint" role="note">
                覆盖 CONFIGURE 色板默认色；重置后回到上方色板预览对应槽位。Tab 可聚焦色块。
              </p>
            </el-form-item>
            <el-form-item v-if="pointShapeEnabled" label="点形状">
              <select
                class="native-field-select"
                v-model="draft.style.pointShape"
                aria-label="点形状"
              >
                <option value="circle">circle</option>
                <option value="rect">rect</option>
                <option value="triangle">triangle</option>
                <option value="diamond">diamond</option>
              </select>
              <p class="fit-hint" role="note">{{ pointShapeHintText }}</p>
            </el-form-item>
            <el-form-item v-else label="点形状">
              <p class="fit-hint" role="note">{{ pointShapeHintText }}</p>
            </el-form-item>
            </section>

            <section class="style-block" aria-labelledby="style-axes">
            <h3 class="style-section" id="style-axes">Axes</h3>
            <el-form-item label="X Range">
              <select class="native-field-select" v-model="xRangeMode" aria-label="X 轴 Range 模式">
                <option value="auto">Automatic</option>
                <option value="manual">Manual</option>
              </select>
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
              <select class="native-field-select" v-model="yRangeMode" aria-label="Y 轴 Range 模式">
                <option value="auto">Automatic</option>
                <option value="manual">Manual</option>
              </select>
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
                <select class="native-field-select" v-model="xScale" aria-label="X 轴 Scale">
                  <option value="linear">Linear</option>
                  <option value="log">Log</option>
                </select>
              </el-form-item>
              <el-form-item v-if="showYScale" label="Y Scale">
                <select class="native-field-select" v-model="yScale" aria-label="Y 轴 Scale">
                  <option value="linear">Linear</option>
                  <option value="log">Log</option>
                </select>
              </el-form-item>
              <p class="fit-hint" role="note">对数轴（Log）要求数据全部为正值；否则运行时回退 Linear 并提示。</p>
            </template>
            </section>
          </el-form>
        </div>
      </div>
      <div class="footer">
        <button type="button" class="btn" @click="close">Cancel</button>
        <button type="button" class="btn btn-primary" @click="save">Save</button>
      </div>
    </aside>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
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
import {
  errorBarsAppliesTo,
  errorBarsAvailableForAggregation,
  errorBarsHint,
} from '@/modules/chart/errorBars'
import {
  CFG_MISS_ALERT_ID,
  cfgMissDescribedBy,
  columnSelectLabel,
  focusCfgMissAfterBlockedSave,
  fromNativeSelectValue,
  toNativeSelectValue,
} from '@/modules/chart/fieldSelect'
import { nextDrawerTab, type DrawerTab } from '@/modules/chart/drawerA11y'
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

const tab = ref<DrawerTab>('configure')
const draft = ref<ChartConfig>(cloneDeep(props.config))
const panelRef = ref<HTMLElement | null>(null)
const aggs = ['count', 'sum', 'min', 'max', 'mean', 'median'] as const
type Aggregation = (typeof aggs)[number]
let restoreFocus: HTMLElement | null = null

function onXFieldChange(e: Event) {
  draft.value.configure.xField = fromNativeSelectValue((e.target as HTMLSelectElement).value)
}

function onYFieldChange(e: Event) {
  draft.value.configure.yField = fromNativeSelectValue((e.target as HTMLSelectElement).value)
}

function onSeriesFieldChange(e: Event) {
  draft.value.configure.seriesField = fromNativeSelectValue((e.target as HTMLSelectElement).value)
}

function onCategoriesFieldChange(e: Event) {
  draft.value.configure.categoriesField = fromNativeSelectValue((e.target as HTMLSelectElement).value)
}

function onMeasureFieldChange(e: Event) {
  draft.value.configure.measureField = fromNativeSelectValue((e.target as HTMLSelectElement).value)
}

function onHeatmapRowChange(e: Event) {
  draft.value.configure.heatmapRowField = fromNativeSelectValue((e.target as HTMLSelectElement).value)
}

function onHeatmapColChange(e: Event) {
  draft.value.configure.heatmapColField = fromNativeSelectValue((e.target as HTMLSelectElement).value)
}

function onHeatmapValueChange(e: Event) {
  draft.value.configure.heatmapValueField = fromNativeSelectValue((e.target as HTMLSelectElement).value)
}

function onAggregationChange(e: Event) {
  const v = (e.target as HTMLSelectElement).value as Aggregation
  draft.value.configure.aggregation = aggs.includes(v) ? v : 'count'
}

function onErrorBarsChange(e: Event) {
  const v = (e.target as HTMLSelectElement).value
  draft.value.configure.errorBars =
    v === 'sd' || v === 'sem' || v === 'none' ? v : 'none'
}

function onFitModelChange(e: Event) {
  const v = (e.target as HTMLSelectElement).value
  const allowed = ['none', 'ptp', 'linear', 'quadratic', '4pl'] as const
  draft.value.configure.fitModel = (allowed as readonly string[]).includes(v)
    ? (v as (typeof allowed)[number])
    : 'none'
}

function onColorPaletteChange(e: Event) {
  const v = (e.target as HTMLSelectElement).value
  draft.value.configure.colorPalette =
    v === 'dark' || v === 'alternate' || v === 'light' ? v : 'light'
}

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
const errorBarsEnabled = computed(() => errorBarsAppliesTo(props.viewType))
const errorBarsAggOk = computed(() =>
  errorBarsAvailableForAggregation(draft.value.configure.aggregation),
)
const errorBarsHintText = computed(() =>
  errorBarsHint(props.viewType, draft.value.configure.aggregation),
)

watch(
  () => [props.viewType, draft.value.configure.aggregation] as const,
  () => {
    if (!errorBarsAppliesTo(props.viewType) || !errorBarsAvailableForAggregation(draft.value.configure.aggregation)) {
      if (draft.value.configure.errorBars && draft.value.configure.errorBars !== 'none') {
        draft.value.configure.errorBars = 'none'
      }
    }
  },
)

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
  const root = panelRef.value
  if (!root) return []
  return [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
    (el) =>
      !el.hasAttribute('disabled') &&
      el.getAttribute('aria-hidden') !== 'true' &&
      el.offsetParent !== null,
  )
}

function close() {
  emit('update:modelValue', false)
}

function restoreFocusToTrigger() {
  const target =
    restoreFocus && document.contains(restoreFocus)
      ? restoreFocus
      : (document.querySelector('#ws-toolbar button, #ws-toolbar [tabindex]') as HTMLElement | null)
  target?.focus?.()
  restoreFocus = null
}

function openDrawer() {
  restoreFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
  document.body.style.overflow = 'hidden'
  void nextTick(() => {
    const list = focusables()
    const closeBtn = list.find((el) => el.classList.contains('icon-close'))
    ;(closeBtn || list[0])?.focus()
  })
}

function closeDrawer() {
  document.body.style.overflow = ''
  restoreFocusToTrigger()
}

watch(
  () => props.modelValue,
  (open) => {
    if (open) openDrawer()
    else closeDrawer()
  },
)

onMounted(() => {
  if (props.modelValue) openDrawer()
})

onUnmounted(() => {
  document.body.style.overflow = ''
  if (restoreFocus && document.contains(restoreFocus)) restoreFocus.focus()
})

function onTabListKeydown(e: KeyboardEvent) {
  if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft' && e.key !== 'Home' && e.key !== 'End') return
  e.preventDefault()
  tab.value = nextDrawerTab(tab.value, e.key)
  void nextTick(() => {
    const id = tab.value === 'configure' ? 'chart-tab-configure-btn' : 'chart-tab-style-btn'
    document.getElementById(id)?.focus()
  })
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
  } else if (active === last || !list.includes(active as HTMLElement)) {
    e.preventDefault()
    first.focus()
  }
}

function save() {
  if (configureMiss.value.length) {
    toast('warning', `请先完成必填槽位：${configureMiss.value.join('、')}`)
    tab.value = 'configure'
    void nextTick(() => focusCfgMissAfterBlockedSave(panelRef.value))
    return
  }
  if (xRangeInvalid.value || yRangeInvalid.value) {
    toast('warning', '轴 Manual 范围无效：最小值须小于最大值')
    tab.value = 'style'
    return
  }
  emit('save', cloneDeep(draft.value))
  close()
}
</script>

<style scoped>
.drawer-root {
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: flex;
  justify-content: flex-end;
}
.drawer-backdrop {
  position: absolute;
  inset: 0;
  border: none;
  padding: 0;
  margin: 0;
  background: rgba(15, 23, 42, 0.45);
  cursor: pointer;
}
.drawer-panel {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  width: min(400px, 100vw);
  height: 100%;
  background: #fff;
  border-left: 1px solid #dee0e3;
  box-shadow: -8px 0 28px rgba(15, 23, 42, 0.12);
  padding: 0 16px 16px;
  box-sizing: border-box;
}
.drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 0 8px;
  flex-shrink: 0;
}
.drawer-header h2 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #1f2329;
}
.icon-close {
  border: none;
  background: transparent;
  font-size: 22px;
  line-height: 1;
  color: #8f959e;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
}
.icon-close:hover {
  color: #1f2329;
  background: #f2f3f5;
}
.icon-close:focus-visible {
  outline: 2px solid var(--ia-accent, #3370ff);
  outline-offset: 1px;
}
.drawer-a11y {
  margin: 0 0 10px;
}
.drawer-tablist {
  display: flex;
  gap: 4px;
  margin: 0 0 12px;
  padding: 3px;
  border-radius: 8px;
  background: #f2f3f5;
  flex-shrink: 0;
}
.drawer-tab {
  flex: 1;
  height: 30px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: #646a73;
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.02em;
  cursor: pointer;
}
.drawer-tab[aria-selected='true'] {
  background: #fff;
  color: #1f2329;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.08);
}
.drawer-tab:focus-visible {
  outline: 2px solid var(--ia-accent, #3370ff);
  outline-offset: 1px;
}
.drawer-body {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding-right: 2px;
}
.drawer-tabpanel {
  min-height: 0;
}
.native-switch {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}
.native-switch input {
  position: absolute;
  opacity: 0;
  width: 1px;
  height: 1px;
  margin: 0;
  pointer-events: none;
}
.native-switch-ui {
  position: relative;
  width: 36px;
  height: 20px;
  border-radius: 999px;
  background: #c9cdd4;
  transition: background 0.15s ease;
  flex-shrink: 0;
}
.native-switch-ui::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.2);
  transition: transform 0.15s ease;
}
.native-switch input:checked + .native-switch-ui {
  background: var(--ia-accent, #3370ff);
}
.native-switch input:checked + .native-switch-ui::after {
  transform: translateX(16px);
}
.native-switch input:focus-visible + .native-switch-ui {
  outline: 2px solid var(--ia-accent, #3370ff);
  outline-offset: 2px;
}
.footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 16px;
  flex-shrink: 0;
  padding-top: 8px;
  border-top: 1px solid #ebeef5;
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
.cfg-miss:focus-visible {
  outline: 2px solid #c45656;
  outline-offset: 2px;
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
.native-field-select {
  display: block;
  width: 100%;
  height: 28px;
  padding: 0 8px;
  border: 1px solid var(--ia-border, #d0d3d6);
  border-radius: 6px;
  background: #fff;
  color: #1f2329;
  font: inherit;
  font-size: 12px;
  box-sizing: border-box;
}
.native-field-select:focus-visible {
  outline: 2px solid var(--ia-accent, #3370ff);
  outline-offset: 1px;
  border-color: var(--ia-accent, #3370ff);
}
.native-field-select[aria-invalid='true'] {
  border-color: #c45656;
}
.btn {
  height: 28px;
  padding: 0 10px;
  border: 1px solid var(--ia-border, #d0d3d6);
  border-radius: 6px;
  background: #fff;
  color: #1f2329;
  font: inherit;
  font-size: 12px;
  cursor: pointer;
}
.btn:hover {
  border-color: var(--ia-accent, #3370ff);
  color: var(--ia-accent, #3370ff);
}
.btn:focus-visible {
  outline: 2px solid var(--ia-accent, #3370ff);
  outline-offset: 1px;
}
.btn-primary {
  background: var(--ia-accent, #3370ff);
  border-color: var(--ia-accent, #3370ff);
  color: #fff;
}
.btn-primary:hover {
  filter: brightness(1.05);
  color: #fff;
}
.btn-primary-plain {
  color: var(--ia-accent, #3370ff);
  border-color: color-mix(in srgb, var(--ia-accent, #3370ff) 45%, #fff);
  background: color-mix(in srgb, var(--ia-accent, #3370ff) 8%, #fff);
}
.btn-text {
  height: auto;
  padding: 2px 6px;
  border: none;
  background: transparent;
  color: var(--ia-accent, #3370ff);
}
.btn-text:hover {
  background: color-mix(in srgb, var(--ia-accent, #3370ff) 8%, #fff);
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
.style-block {
  display: block;
}
.style-block:first-child .style-section {
  margin-top: 0;
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
