<script lang="ts">
type PlotlyApi = typeof import('plotly.js-dist-min').default

let plotlyPromise: Promise<PlotlyApi> | null = null
function loadPlotly(): Promise<PlotlyApi> {
  if (!plotlyPromise) {
    plotlyPromise = import('plotly.js-dist-min').then((m) => m.default)
  }
  return plotlyPromise
}

/** 供外层空闲预取，避免首次打开才拉 4MB+ Plotly。 */
export function prefetchPlotly(): Promise<void> {
  return loadPlotly().then(() => undefined)
}
</script>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { ChartOption } from './types'
import { applyLegendClearanceMargin, suggestLegendClearance, type RectLike } from './runtime/legendClearance'
import {
  extractLegendItems,
  layoutForCollapsedLegend,
  legendPosFromLayout,
  shouldCollapseLegend,
  type LegendItem,
  type LegendPos,
} from './runtime/legendItems'
import { useClickOutside, useEscape } from '../../ui/utils'

export type FlagMode = 'off' | 'flag' | 'clear'

const props = withDefaults(
  defineProps<{
    option: ChartOption | null
    rowCount?: number
    width?: number
    height?: number
    flagMode?: FlagMode
  }>(),
  { rowCount: 0, flagMode: 'off' },
)
const emit = defineEmits<{ (e: 'rendered'): void; (e: 'lasso', rowIds: string[]): void }>()
void emit

const wrap = ref<HTMLDivElement>()
const el = ref<HTMLDivElement>()
const chipRoot = ref<HTMLElement>()
let mounted = false
let ro: ResizeObserver | null = null
let Plotly: PlotlyApi | null = null
let applySeq = 0
/** 同一 option 下已做过的 clearance 次数，防止测量/relayout 循环。 */
let clearancePasses = 0

const legendCollapsed = ref(false)
const legendOpen = ref(false)
const legendItems = ref<LegendItem[]>([])
const legendPos = ref<LegendPos>('top')

const legendChipLabel = computed(() => {
  const n = legendItems.value.length
  const hidden = legendItems.value.filter((i) => !i.visible).length
  if (hidden) return `图例 ${n - hidden}/${n}`
  return `图例 · ${n}`
})

function syncCollapseFlag(): void {
  const w = wrap.value?.clientWidth ?? el.value?.clientWidth ?? 0
  const items = extractLegendItems(props.option?.data)
  const wantsLegend = props.option?.layout?.showlegend !== false && items.length > 0
  legendCollapsed.value = Boolean(wantsLegend && shouldCollapseLegend(w, items.length))
  legendItems.value = items.map((it) => ({ ...it }))
  legendPos.value = legendPosFromLayout(props.option?.layout as Record<string, unknown> | undefined)
  if (!legendCollapsed.value) legendOpen.value = false
}

function toRect(r: DOMRect): RectLike {
  return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height }
}

/** 完整宽度：渲染后若图例仍盖住主图，按侵入方向加大对应 margin。 */
async function ensureLegendClearance(): Promise<void> {
  if (!mounted || !el.value || !Plotly) return
  if (!el.value.classList.contains('js-plotly-plot')) return
  if (legendCollapsed.value) return
  if (clearancePasses >= 2) return

  const root = el.value
  const legendNode = root.querySelector('.legend') as SVGGraphicsElement | null
  if (!legendNode) return
  const plotNode =
    (root.querySelector('.bglayer .bg') as SVGGraphicsElement | null) ??
    (root.querySelector('.pielayer') as SVGGraphicsElement | null) ??
    (root.querySelector('.cartesianlayer') as SVGGraphicsElement | null)
  if (!plotNode) return

  const legend = toRect(legendNode.getBoundingClientRect())
  const plot = toRect(plotNode.getBoundingClientRect())
  const clearance = suggestLegendClearance(legend, plot)
  if (!clearance) return

  const gd = root as unknown as { layout?: { margin?: { t?: number; r?: number; b?: number; l?: number } } }
  const cur = gd.layout?.margin ?? {}
  const next = applyLegendClearanceMargin(cur, clearance)
  if (
    next.t === (cur.t ?? 0) &&
    next.r === (cur.r ?? 0) &&
    next.b === (cur.b ?? 0) &&
    next.l === (cur.l ?? 0)
  ) {
    return
  }
  clearancePasses += 1
  await Plotly.relayout(root, { margin: next })
}

function buildLayout(): Record<string, unknown> {
  const figure = props.option ?? { data: [], layout: {} }
  const base = { ...(figure.layout ?? {}), autosize: true }
  if (legendCollapsed.value) return layoutForCollapsedLegend(base)
  return base
}

async function apply(initial = false): Promise<void> {
  const seq = ++applySeq
  clearancePasses = 0
  if (!mounted || !el.value) return
  syncCollapseFlag()
  Plotly ??= await loadPlotly()
  if (!mounted || !el.value || seq !== applySeq) return
  const figure = props.option ?? { data: [], layout: {} }
  const layout = buildLayout()
  const config = {
    displaylogo: false,
    ...figure.config,
    displayModeBar: false,
  }
  if (initial) await Plotly.newPlot(el.value, figure.data as Plotly.Data[], layout as Partial<Plotly.Layout>, config as Partial<Plotly.Config>)
  else await Plotly.react(el.value, figure.data as Plotly.Data[], layout as Partial<Plotly.Layout>, config as Partial<Plotly.Config>)
  if (seq !== applySeq) return
  await ensureLegendClearance()
  if (seq !== applySeq) return
  // 从 plot 同步可见性（用户可能点过内嵌图例）
  syncVisibilityFromPlot()
  emit('rendered')
}

function syncVisibilityFromPlot(): void {
  if (!el.value || !legendItems.value.length) return
  const gd = el.value as unknown as { data?: Array<{ visible?: boolean | 'legendonly' }> }
  const data = gd.data
  if (!data) return
  legendItems.value = legendItems.value.map((it) => {
    const v = data[it.traceIndex]?.visible
    return { ...it, visible: v !== false && v !== 'legendonly' }
  })
}

async function toggleLegendItem(item: LegendItem): Promise<void> {
  if (!el.value || !Plotly) return
  const nextVisible = !item.visible
  await Plotly.restyle(el.value, { visible: nextVisible ? true : 'legendonly' }, [item.traceIndex])
  item.visible = nextVisible
}

function toggleFloat(): void {
  legendOpen.value = !legendOpen.value
}

useClickOutside([chipRoot], () => {
  if (legendOpen.value) legendOpen.value = false
})
useEscape(
  () => {
    legendOpen.value = false
  },
  () => legendOpen.value,
)

/* resize 节流（100ms trailing） */
let resizeTimer: ReturnType<typeof setTimeout> | null = null
function scheduleResize(): void {
  if (typeof document !== 'undefined' && document.body.classList.contains('is-board-dragging')) return
  if (resizeTimer) return
  resizeTimer = setTimeout(() => {
    resizeTimer = null
    const div = el.value
    if (!Plotly || !div || !div.isConnected || div.clientWidth <= 0 || div.clientHeight <= 0) return
    const prev = legendCollapsed.value
    syncCollapseFlag()
    if (prev !== legendCollapsed.value) {
      // 跨阈值：重建 layout（显隐内嵌图例）
      void apply(false)
      return
    }
    clearancePasses = 0
    Plotly.Plots.resize(div)
    void ensureLegendClearance()
  }, 100)
}

async function relayout(patch: Record<string, unknown>): Promise<void> {
  if (!mounted || !el.value) return
  Plotly ??= await loadPlotly()
  if (!mounted || !el.value || !el.value.classList.contains('js-plotly-plot')) return
  await Plotly.relayout(el.value, patch)
  clearancePasses = 0
  await ensureLegendClearance()
}

onMounted(() => {
  mounted = true
  if (props.option || Plotly) void apply(true)
  ro = new ResizeObserver(scheduleResize)
  if (wrap.value) ro.observe(wrap.value)
})

watch(
  () => props.option,
  () => {
    legendOpen.value = false
    void apply()
  },
  { deep: false },
)

onBeforeUnmount(() => {
  mounted = false
  if (resizeTimer) {
    clearTimeout(resizeTimer)
    resizeTimer = null
  }
  ro?.disconnect()
  if (Plotly && el.value) Plotly.purge(el.value)
})

async function getDataURL(): Promise<string> {
  if (!el.value) return ''
  Plotly ??= await loadPlotly()
  if (!el.value) return ''
  // 导出前临时展开内嵌图例更完整；此处保持当前视图
  return Plotly.toImage(el.value, { format: 'png', scale: 2, width: el.value.clientWidth, height: el.value.clientHeight })
}

defineExpose({ getDataURL, relayout })
</script>

<template>
  <div
    ref="wrap"
    class="chart-panel-wrap"
    :class="[`chart-panel-wrap--leg-${legendPos}`, { 'chart-panel-wrap--collapsed': legendCollapsed }]"
  >
    <div
      ref="el"
      class="chart-panel"
      :style="{
        width: width ? `${width}px` : '100%',
        height: height ? `${height}px` : '100%',
      }"
    />

    <!-- 窄屏：收起内嵌图例，芯片 + 浮动列表面板 -->
    <div
      v-if="legendCollapsed && legendItems.length"
      ref="chipRoot"
      class="chart-leg"
      :class="`chart-leg--${legendPos}`"
    >
      <button
        type="button"
        class="chart-leg__chip"
        :aria-expanded="legendOpen"
        aria-haspopup="dialog"
        @click="toggleFloat"
      >
        <span class="chart-leg__swatches" aria-hidden="true">
          <i
            v-for="it in legendItems.slice(0, 3)"
            :key="it.traceIndex"
            class="chart-leg__dot"
            :style="{ background: it.color }"
          />
        </span>
        <span class="chart-leg__label">{{ legendChipLabel }}</span>
        <span class="chart-leg__caret" aria-hidden="true">{{ legendOpen ? '▴' : '▾' }}</span>
      </button>

      <div
        v-if="legendOpen"
        class="chart-leg__float"
        role="dialog"
        aria-label="图例"
      >
        <button
          v-for="it in legendItems"
          :key="it.traceIndex"
          type="button"
          class="chart-leg__item"
          :class="{ 'chart-leg__item--off': !it.visible }"
          @click="toggleLegendItem(it)"
        >
          <span class="chart-leg__swatch" :style="{ background: it.color }" />
          <span class="chart-leg__name is-ellipsis">{{ it.name }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.chart-panel-wrap {
  position: relative;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
}
.chart-panel {
  width: 100%;
  height: 100%;
  min-height: 0;
  min-width: 0;
}

.chart-leg {
  position: absolute;
  z-index: 4;
  max-width: min(280px, calc(100% - 16px));
}
.chart-leg--top {
  top: 8px;
  left: 8px;
}
.chart-leg--bottom {
  bottom: 8px;
  left: 8px;
}
.chart-leg--left {
  top: 8px;
  left: 8px;
}
.chart-leg--right {
  top: 8px;
  right: 8px;
}

.chart-leg__chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  max-width: 100%;
  padding: 4px 8px 4px 6px;
  border: 1px solid var(--is-border, #e4e7ec);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 1px 2px rgba(16, 24, 40, 0.06);
  color: var(--is-text-secondary, #475467);
  font-size: 12px;
  font-weight: 500;
  line-height: 1.2;
  cursor: pointer;
}
.chart-leg__chip:hover {
  border-color: var(--is-border-strong, #d0d5dd);
  color: var(--is-text, #101828);
}
.chart-leg__swatches {
  display: inline-flex;
  align-items: center;
}
.chart-leg__dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: -2px;
  border: 1px solid #fff;
}
.chart-leg__label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.chart-leg__caret {
  flex-shrink: 0;
  font-size: 10px;
  opacity: 0.7;
}

.chart-leg__float {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  min-width: 160px;
  max-width: min(280px, 70vw);
  max-height: min(240px, 50vh);
  overflow: auto;
  padding: 6px;
  border: 1px solid var(--is-border, #e4e7ec);
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 8px 24px rgba(16, 24, 40, 0.12);
}
.chart-leg--right .chart-leg__float {
  left: auto;
  right: 0;
}
.chart-leg--bottom .chart-leg__float {
  top: auto;
  bottom: calc(100% + 4px);
}

.chart-leg__item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 6px 8px;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: var(--is-text, #101828);
  font-size: 12px;
  text-align: left;
  cursor: pointer;
}
.chart-leg__item:hover {
  background: var(--is-surface-muted, #f2f4f7);
}
.chart-leg__item--off {
  opacity: 0.45;
  text-decoration: line-through;
}
.chart-leg__swatch {
  flex-shrink: 0;
  width: 10px;
  height: 10px;
  border-radius: 2px;
}
.chart-leg__name {
  min-width: 0;
}
</style>
