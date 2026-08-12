<script setup lang="ts">
import { computed, inject } from 'vue'
import { ISelect, ISlider, ITextField, IToggle } from '../../../../ui'
import AxisSection from './AxisSection.vue'
import ColorField from './ColorField.vue'
import SeriesColorsSection from './SeriesColorsSection.vue'
import { CHART_DRAFT_CONTEXT } from '../context'

/** 通用 STYLE 区段：General / 图种专属 / Legend / Axis / Series colors（由 def 驱动）。 */
const ctx = inject(CHART_DRAFT_CONTEXT)!
const def = computed(() => ctx.def.value)
const type = computed(() => def.value.type)
const caps = computed(() => def.value.capabilities)
const style = computed(() => ctx.draft.style)

/* 通用 get/set 助手 */
function makeNum<T extends number | undefined>(get: () => T, set: (v: number | undefined) => void) {
  return computed<string>({
    get: () => (get() === undefined ? '' : String(get())),
    set: (v: string) => {
      const n = Number(v)
      set(v.trim() === '' || !Number.isFinite(n) ? undefined : n)
      ctx.touch()
    },
  })
}

const width = makeNum(() => style.value.width, (v) => (style.value.width = v))
const height = makeNum(() => style.value.height, (v) => (style.value.height = v))
const marginOf = (key: 'top' | 'right' | 'bottom' | 'left') =>
  makeNum(
    () => style.value.margins?.[key],
    (v) => {
      if (!style.value.margins) style.value.margins = { top: 56, right: 32, bottom: 48, left: 64 }
      if (v !== undefined) style.value.margins[key] = v
    },
  )
const marginTop = marginOf('top')
const marginRight = marginOf('right')
const marginBottom = marginOf('bottom')
const marginLeft = marginOf('left')
const opacity = computed({
  get: () => style.value.opacity ?? 1,
  set: (v: number) => {
    style.value.opacity = v
    ctx.touch()
  },
})

/* 图种专属存取器（确保子对象存在） */
const bar = computed(() => (style.value.bar ??= {}))
const line = computed(() => (style.value.line ??= {}))
const scatter = computed(() => (style.value.scatter ??= {}))
const box = computed(() => (style.value.box ??= {}))
const pie = computed(() => (style.value.pie ??= {}))
const heatmap = computed(() => (style.value.heatmap ??= {}))
const bignumber = computed(() => (style.value.bignumber ??= {}))

const SHAPES = [
  { value: 'circle', label: '● Circle' },
  { value: 'triangle', label: '▲ Triangle' },
  { value: 'diamond', label: '◆ Diamond' },
  { value: 'rect', label: '■ Square' },
  { value: 'pin', label: '▼ Pin' },
]

const hasSeries = computed(() => !!ctx.draft.configure.series?.field || !!ctx.draft.configure.color?.field)
const useRightAxis = computed(() => (ctx.draft.configure.values ?? []).some((m) => m.axis?.side === 'right'))

const legendShow = computed({
  get: () => style.value.legend?.show ?? true,
  set: (v: boolean) => {
    if (!style.value.legend) style.value.legend = { show: true, position: 'top' }
    style.value.legend.show = v
    ctx.touch()
  },
})
const legendPos = computed({
  get: () => style.value.legend?.position ?? 'top',
  set: (v: string | number) => {
    if (!style.value.legend) style.value.legend = { show: true, position: 'top' }
    style.value.legend.position = v as 'top' | 'bottom' | 'left' | 'right'
    ctx.touch()
  },
})

/* 轴区可见性 */
const xScaleTypes = ['line', 'scatter']
const yScaleTypes = ['bar', 'line', 'scatter', 'box']
const showXAxis = computed(() => type.value !== 'pie' && type.value !== 'bignumber')
const showYAxis = computed(() => !['pie', 'bignumber'].includes(type.value))

const numOr = (v: number | undefined, d: number) => v ?? d

/* ------------------------------- 参考线编辑 ------------------------------- */
interface RefLineRow {
  axis: 'x' | 'y'
  value?: number
  label?: string
}
const refLines = computed<RefLineRow[]>({
  get: () => (style.value.referenceLines ??= []),
  set: (v) => {
    style.value.referenceLines = v
    ctx.touch()
  },
})
function refLineValueText(line: RefLineRow): string {
  return line.value === undefined ? '' : String(line.value)
}
function setRefLineValue(line: RefLineRow, v: string) {
  const n = Number(v)
  line.value = v.trim() === '' || !Number.isFinite(n) ? undefined : n
  ctx.touch()
}
function addRefLine() {
  refLines.value = [...refLines.value, { axis: 'y' as const }]
}
function removeRefLine(i: number) {
  refLines.value = refLines.value.filter((_, idx) => idx !== i)
}
</script>

<template>
  <div class="sty">
    <!-- General -->
    <section class="sty__sec">
      <h4 class="sty__sec-title">General</h4>
      <div class="sty__row">
        <span class="sty__label">Width (px)</span>
        <ITextField v-model="width" size="sm" placeholder="自适应" />
      </div>
      <div class="sty__row">
        <span class="sty__label">Height (px)</span>
        <ITextField v-model="height" size="sm" placeholder="自适应" />
      </div>
      <div class="sty__row sty__row--margins">
        <span class="sty__label">Margins</span>
        <div class="sty__margins">
          <ITextField v-model="marginTop" size="sm" placeholder="Top" aria-label="上边距" />
          <ITextField v-model="marginRight" size="sm" placeholder="Right" aria-label="右边距" />
          <ITextField v-model="marginBottom" size="sm" placeholder="Bottom" aria-label="下边距" />
          <ITextField v-model="marginLeft" size="sm" placeholder="Left" aria-label="左边距" />
        </div>
      </div>
      <div class="sty__row">
        <span class="sty__label">Opacity</span>
        <ISlider v-model="opacity" :min="0" :max="1" :step="0.05" :format="(v: number) => v.toFixed(2)" aria-label="透明度" />
      </div>
    </section>

    <!-- Bar 专属 -->
    <section v-if="type === 'bar'" class="sty__sec">
      <h4 class="sty__sec-title">Bar</h4>
      <div class="sty__row">
        <span class="sty__label">Mode</span>
        <ISelect
          :model-value="bar.mode ?? 'grouped'"
          :options="[
            { value: 'grouped', label: '并排' },
            { value: 'stacked', label: '堆叠' },
            { value: 'percent', label: '100% 堆叠' },
          ]"
          size="sm"
          aria-label="柱形模式"
          @update:model-value="bar.mode = $event as 'grouped' | 'stacked' | 'percent'; ctx.touch()"
        />
      </div>
      <div class="sty__row sty__row--switch">
        <span class="sty__label">数据标签</span>
        <IToggle :model-value="!!bar.showValues" aria-label="显示柱值" @update:model-value="bar.showValues = $event; ctx.touch()" />
      </div>
      <div class="sty__row">
        <span class="sty__label">Line Width</span>
        <ISlider :model-value="numOr(bar.lineWidth, 0)" :min="0" :max="4" :step="0.5" aria-label="柱描边线宽" @update:model-value="bar.lineWidth = $event; ctx.touch()" />
      </div>
      <ColorField :model-value="bar.lineColor ?? '#1d2939'" label="Line Color" @update:model-value="bar.lineColor = $event; ctx.touch()" />
    </section>

    <!-- Line 专属（5B：无线宽/点大小） -->
    <section v-if="type === 'line'" class="sty__sec">
      <h4 class="sty__sec-title">Line</h4>
      <div class="sty__row">
        <span class="sty__label">Point Shape</span>
        <ISelect :model-value="line.pointShape ?? 'circle'" :options="SHAPES" size="sm" aria-label="点形状" @update:model-value="line.pointShape = String($event); ctx.touch()" />
      </div>
      <ColorField v-if="!hasSeries" :model-value="line.defaultColor ?? '#2e5bff'" label="Default Color" @update:model-value="line.defaultColor = $event; ctx.touch()" />
      <div class="sty__row">
        <span class="sty__label">Charts</span>
        <ISelect
          :model-value="line.facet ?? 'one'"
          :options="[
            { value: 'one', label: 'One Chart' },
            { value: 'per-measure', label: 'One Per Measure' },
          ]"
          size="sm"
          aria-label="分面"
          @update:model-value="line.facet = $event as 'one' | 'per-measure'; ctx.touch()"
        />
      </div>
    </section>

    <!-- Scatter 专属 -->
    <section v-if="type === 'scatter'" class="sty__sec">
      <h4 class="sty__sec-title">Scatter</h4>
      <div class="sty__row">
        <span class="sty__label">Point Size</span>
        <ISlider :model-value="numOr(scatter.pointSize, 8)" :min="2" :max="24" aria-label="点大小" @update:model-value="scatter.pointSize = $event; ctx.touch()" />
      </div>
      <div class="sty__row">
        <span class="sty__label">Point Shape</span>
        <ISelect :model-value="scatter.pointShape ?? 'circle'" :options="SHAPES" size="sm" aria-label="点形状" @update:model-value="scatter.pointShape = String($event); ctx.touch()" />
      </div>
      <div class="sty__row sty__row--switch">
        <span class="sty__label">Jitter</span>
        <IToggle :model-value="!!scatter.jitter" aria-label="Jitter Points" @update:model-value="scatter.jitter = $event; ctx.touch()" />
      </div>
      <div v-if="scatter.jitter" class="sty__row">
        <span class="sty__label">强度</span>
        <ISlider :model-value="numOr(scatter.jitterStrength, 0.4)" :min="0" :max="1" :step="0.05" :format="(v: number) => v.toFixed(2)" aria-label="Jitter 强度" @update:model-value="scatter.jitterStrength = $event; ctx.touch()" />
      </div>
      <div class="sty__row">
        <span class="sty__label">Charts</span>
        <ISelect
          :model-value="scatter.facet ?? 'one'"
          :options="[
            { value: 'one', label: 'One Chart' },
            { value: 'per-measure', label: 'One Per Measure' },
          ]"
          size="sm"
          aria-label="分面"
          @update:model-value="scatter.facet = $event as 'one' | 'per-measure'; ctx.touch()"
        />
      </div>
    </section>

    <!-- Box 专属（4B：无 Jitter） -->
    <section v-if="type === 'box'" class="sty__sec">
      <h4 class="sty__sec-title">Box</h4>
      <div class="sty__row">
        <span class="sty__label">形态</span>
        <ISelect
          :model-value="box.mode ?? 'box'"
          :options="[
            { value: 'box', label: '箱线图' },
            { value: 'violin', label: '小提琴图' },
          ]"
          size="sm"
          aria-label="形态"
          @update:model-value="box.mode = $event as 'box' | 'violin'; ctx.touch()"
        />
      </div>
      <div class="sty__row">
        <span class="sty__label">Show Points</span>
        <ISelect
          :model-value="box.showPoints ?? 'outliers'"
          :options="[
            { value: 'all', label: '全部点' },
            { value: 'outliers', label: '仅离群点' },
            { value: 'none', label: '不显示' },
          ]"
          size="sm"
          aria-label="显示点"
          @update:model-value="box.showPoints = $event as 'all' | 'outliers' | 'none'; ctx.touch()"
        />
      </div>
      <div class="sty__row">
        <span class="sty__label">Point Size</span>
        <ISlider :model-value="numOr(box.pointSize, 5)" :min="2" :max="14" aria-label="点大小" @update:model-value="box.pointSize = $event; ctx.touch()" />
      </div>
      <div class="sty__row">
        <span class="sty__label">Point Shape</span>
        <ISelect :model-value="box.pointShape ?? 'circle'" :options="SHAPES" size="sm" aria-label="点形状" @update:model-value="box.pointShape = String($event); ctx.touch()" />
      </div>
      <div class="sty__row">
        <span class="sty__label">Line Width</span>
        <ISlider :model-value="numOr(box.lineWidth, 1.5)" :min="0.5" :max="4" :step="0.5" aria-label="箱线线宽" @update:model-value="box.lineWidth = $event; ctx.touch()" />
      </div>
      <ColorField :model-value="box.lineColor ?? '#1d2939'" label="Line Color" @update:model-value="box.lineColor = $event; ctx.touch()" />
      <ColorField :model-value="box.fillColor ?? '#2e5bff'" label="Fill Color" @update:model-value="box.fillColor = $event; ctx.touch()" />
    </section>

    <!-- Pie 专属 -->
    <section v-if="type === 'pie'" class="sty__sec">
      <h4 class="sty__sec-title">Pie</h4>
      <div class="sty__row">
        <span class="sty__label">Inner %</span>
        <ISlider :model-value="numOr(pie.innerRadiusPct, 0)" :min="0" :max="90" aria-label="内径百分比" @update:model-value="pie.innerRadiusPct = $event; ctx.touch()" />
      </div>
      <div class="sty__row">
        <span class="sty__label">Outer %</span>
        <ISlider :model-value="numOr(pie.outerRadiusPct, 72)" :min="10" :max="100" aria-label="外径百分比" @update:model-value="pie.outerRadiusPct = $event; ctx.touch()" />
      </div>
      <div class="sty__row sty__row--switch">
        <span class="sty__label">百分比</span>
        <IToggle :model-value="pie.showPercent ?? true" aria-label="Show Percentages" @update:model-value="pie.showPercent = $event; ctx.touch()" />
      </div>
      <div v-if="pie.showPercent !== false" class="sty__row">
        <span class="sty__label">Hide % &lt;</span>
        <ISlider :model-value="numOr(pie.hideBelowPct, 5)" :min="0" :max="30" aria-label="小于该百分比隐藏标注" @update:model-value="pie.hideBelowPct = $event; ctx.touch()" />
      </div>
      <ColorField v-if="pie.showPercent !== false" :model-value="pie.percentColor ?? '#ffffff'" label="% Text Color" @update:model-value="pie.percentColor = $event; ctx.touch()" />
    </section>

    <!-- Heatmap 专属 -->
    <section v-if="type === 'heatmap'" class="sty__sec">
      <h4 class="sty__sec-title">Heatmap</h4>
      <div class="sty__row sty__row--switch">
        <span class="sty__label">格内标注</span>
        <IToggle :model-value="!!heatmap.showCellValues" aria-label="显示数值" @update:model-value="heatmap.showCellValues = $event; ctx.touch()" />
      </div>
      <div class="sty__row">
        <span class="sty__label">行排序</span>
        <ISelect
          :model-value="heatmap.rowSort ?? 'label'"
          :options="[
            { value: 'label', label: '按标签' },
            { value: 'mean', label: '按行均值' },
          ]"
          size="sm"
          aria-label="行排序"
          @update:model-value="heatmap.rowSort = $event as 'label' | 'mean'; ctx.touch()"
        />
      </div>
      <div class="sty__row">
        <span class="sty__label">列排序</span>
        <ISelect
          :model-value="heatmap.colSort ?? 'label'"
          :options="[
            { value: 'label', label: '按标签' },
            { value: 'mean', label: '按列均值' },
          ]"
          size="sm"
          aria-label="列排序"
          @update:model-value="heatmap.colSort = $event as 'label' | 'mean'; ctx.touch()"
        />
      </div>
      <div class="sty__row sty__row--switch">
        <span class="sty__label">聚类</span>
        <div class="sty__inline">
          <IToggle :model-value="!!heatmap.clusterRows" @update:model-value="heatmap.clusterRows = $event; ctx.touch()">行</IToggle>
          <IToggle :model-value="!!heatmap.clusterCols" @update:model-value="heatmap.clusterCols = $event; ctx.touch()">列</IToggle>
        </div>
      </div>
    </section>

    <!-- Big number 专属 -->
    <section v-if="type === 'bignumber'" class="sty__sec">
      <h4 class="sty__sec-title">Big number</h4>
      <div class="sty__row">
        <span class="sty__label">Layout</span>
        <ISelect
          :model-value="bignumber.layout ?? 'row'"
          :options="[
            { value: 'row', label: '横排' },
            { value: 'grid', label: '网格' },
          ]"
          size="sm"
          aria-label="指标排布"
          @update:model-value="bignumber.layout = $event as 'row' | 'grid'; ctx.touch()"
        />
      </div>
      <div class="sty__row">
        <span class="sty__label">数字字号</span>
        <ISlider :model-value="numOr(bignumber.valueFontSize, 42)" :min="24" :max="72" aria-label="数字字号" @update:model-value="bignumber.valueFontSize = $event; ctx.touch()" />
      </div>
      <div class="sty__row">
        <span class="sty__label">标签字号</span>
        <ISlider :model-value="numOr(bignumber.labelFontSize, 13)" :min="10" :max="24" aria-label="标签字号" @update:model-value="bignumber.labelFontSize = $event; ctx.touch()" />
      </div>
      <div class="sty__row sty__row--switch">
        <span class="sty__label">显示标签</span>
        <IToggle :model-value="bignumber.showLabel !== false" aria-label="显示标签" @update:model-value="bignumber.showLabel = $event; ctx.touch()" />
      </div>
      <div class="sty__row sty__row--switch">
        <span class="sty__label">紧凑数字</span>
        <IToggle :model-value="!!bignumber.compact" aria-label="SI 缩写" @update:model-value="bignumber.compact = $event; ctx.touch()" />
      </div>
    </section>

    <!-- 拟合线（Line/Scatter 回归拟合） -->
    <section v-if="caps.regression" class="sty__sec">
      <h4 class="sty__sec-title">拟合线</h4>
      <div class="sty__row">
        <span class="sty__label">线型</span>
        <ISelect
          :model-value="style.fitLineStyle ?? 'solid'"
          :options="[
            { value: 'solid', label: '实线' },
            { value: 'dash', label: '虚线' },
          ]"
          size="sm"
          aria-label="拟合线型"
          @update:model-value="style.fitLineStyle = $event as 'solid' | 'dash'; ctx.touch()"
        />
      </div>
      <div class="sty__row sty__row--switch">
        <span class="sty__label">拟合注释</span>
        <IToggle :model-value="style.fitAnnotation !== false" aria-label="显示方程与 R²" @update:model-value="style.fitAnnotation = $event; ctx.touch()" />
      </div>
    </section>

    <!-- 参考线（Pie / Big number 无轴不适用） -->
    <section v-if="type !== 'pie' && type !== 'bignumber'" class="sty__sec">
      <h4 class="sty__sec-title">参考线</h4>
      <div v-for="(line, i) in refLines" :key="i" class="sty__refline">
        <ISelect
          :model-value="line.axis"
          :options="[
            { value: 'y', label: 'Y 轴' },
            { value: 'x', label: 'X 轴' },
          ]"
          size="sm"
          aria-label="参考线轴向"
          class="sty__refline-axis"
          @update:model-value="line.axis = $event as 'x' | 'y'; ctx.touch()"
        />
        <ITextField
          :model-value="refLineValueText(line)"
          size="sm"
          placeholder="数值"
          aria-label="参考线数值"
          class="sty__refline-value"
          @update:model-value="setRefLineValue(line, $event)"
        />
        <ITextField
          v-model="line.label"
          size="sm"
          placeholder="标签（可选）"
          aria-label="参考线标签"
          class="sty__refline-label"
          @update:model-value="ctx.touch()"
        />
        <button type="button" class="sty__refline-del" title="删除参考线" aria-label="删除参考线" @click="removeRefLine(i)">×</button>
      </div>
      <IButton variant="ghost" size="sm" icon="plus" @click="addRefLine">添加参考线</IButton>
    </section>

    <!-- Legend -->
    <section class="sty__sec">
      <h4 class="sty__sec-title">Legend</h4>
      <div class="sty__row sty__row--switch">
        <span class="sty__label">显示图例</span>
        <IToggle v-model="legendShow" aria-label="显示图例" />
      </div>
      <div v-if="legendShow" class="sty__row">
        <span class="sty__label">Position</span>
        <ISelect
          v-model="legendPos"
          :options="[
            { value: 'top', label: 'Top' },
            { value: 'bottom', label: 'Bottom' },
            { value: 'left', label: 'Left' },
            { value: 'right', label: 'Right' },
          ]"
          size="sm"
          aria-label="图例位置"
        />
      </div>
    </section>

    <!-- Axis -->
    <AxisSection v-if="showXAxis" title="X-Axis" axis-key="xAxis" :with-scale="xScaleTypes.includes(type)" />
    <AxisSection v-if="showYAxis" :title="caps.secondY && useRightAxis ? 'Y-Axis (Left)' : 'Y-Axis'" axis-key="yAxis" :with-scale="yScaleTypes.includes(type)" />
    <AxisSection v-if="caps.secondY && useRightAxis" title="Y-Axis (Right)" axis-key="yAxisRight" :with-scale="true" />

    <!-- Series colors -->
    <SeriesColorsSection />
  </div>
</template>

<style scoped>
.sty {
  display: flex;
  flex-direction: column;
}
.sty__sec {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  border-top: 1px solid var(--is-border);
}
.sty__sec:first-child {
  border-top: none;
}
.sty__sec-title {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.05em;
  color: var(--is-text-tertiary);
  text-transform: uppercase;
}
.sty__row {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 6px;
}
.sty__label {
  flex-shrink: 0;
  font-size: var(--is-text-xs);
  font-weight: 500;
  color: var(--is-text-secondary);
}
.sty__row--switch > .sty__label {
  font-weight: 600;
  color: var(--is-text);
}
.sty__row :deep(.is-field),
.sty__row :deep(.is-select),
.sty__row :deep(.is-slider) {
  flex: 1;
  min-width: 0;
}
.sty__margins {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.sty__inline {
  display: flex;
  align-items: center;
  gap: 8px;
}
.sty__row--switch {
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  min-height: 32px;
}
.sty__inline :deep(.is-field) {
  flex: 1;
  min-width: 0;
}
.sty__refline {
  display: grid;
  grid-template-columns: 72px 72px 1fr 24px;
  align-items: center;
  gap: 6px;
}
.sty__refline-del {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border: none;
  border-radius: var(--is-radius-sm);
  background: transparent;
  color: var(--is-text-tertiary);
  font-size: 14px;
  cursor: pointer;
}
.sty__refline-del:hover {
  background: var(--is-surface-hover);
  color: var(--is-danger);
}
</style>
