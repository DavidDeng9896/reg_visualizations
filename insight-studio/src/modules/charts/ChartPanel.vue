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
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { ChartOption } from './types'

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

const el = ref<HTMLDivElement>()
let mounted = false
let ro: ResizeObserver | null = null
let Plotly: PlotlyApi | null = null
let applySeq = 0

async function apply(initial = false): Promise<void> {
  const seq = ++applySeq
  if (!mounted || !el.value) return
  Plotly ??= await loadPlotly()
  if (!mounted || !el.value || seq !== applySeq) return
  const figure = props.option ?? { data: [], layout: {} }
  const layout = { ...figure.layout, autosize: true }
  // 关闭 Plotly 自带 modebar：应用已有导出浮层，避免与右上角工具条叠在一起。
  // 不开 responsive：ResizeObserver 单通道驱动 resize，避免每个图各挂一个 window 监听
  const config = {
    displaylogo: false,
    ...figure.config,
    displayModeBar: false,
  }
  if (initial) await Plotly.newPlot(el.value, figure.data as Plotly.Data[], layout as Partial<Plotly.Layout>, config as Partial<Plotly.Config>)
  else await Plotly.react(el.value, figure.data as Plotly.Data[], layout as Partial<Plotly.Layout>, config as Partial<Plotly.Config>)
  emit('rendered')
}

/* resize 节流（100ms trailing）：看板拖拽/分栏拖动期间不再逐帧 Plots.resize */
let resizeTimer: ReturnType<typeof setTimeout> | null = null
function scheduleResize(): void {
  // 看板拖拽期间挂起：松手后最终尺寸变化会再次触发 RO，一次性 resize
  if (typeof document !== 'undefined' && document.body.classList.contains('is-board-dragging')) return
  if (resizeTimer) return
  resizeTimer = setTimeout(() => {
    resizeTimer = null
    const div = el.value
    // 隐藏/未挂载的 plot div 上调用 resize 会抛错（如切到流程图模式后工作区图表被 KeepAlive 隐藏）
    if (Plotly && div && div.isConnected && div.clientWidth > 0 && div.clientHeight > 0) {
      void Plotly.Plots.resize(div)
    }
  }, 100)
}

/** layout-only 快路径：纯布局补丁（标题/边距等），跳过数据重建。 */
async function relayout(patch: Record<string, unknown>): Promise<void> {
  if (!mounted || !el.value) return
  Plotly ??= await loadPlotly()
  // div 尚未 newPlot（如 KeepAlive 隐藏后首次渲染前）时 relayout 会抛 _redrawFromAutoMarginCount，跳过等全量 react
  if (!mounted || !el.value || !el.value.classList.contains('js-plotly-plot')) return
  await Plotly.relayout(el.value, patch)
}

onMounted(() => {
  mounted = true
  // Plotly 未加载且暂无可渲染数据时，先空着；数据到了再 newPlot，避免空图闪一下
  if (props.option || Plotly) void apply(true)
  ro = new ResizeObserver(scheduleResize)
  if (el.value) ro.observe(el.value)
})

watch(
  () => props.option,
  () => void apply(),
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
  return Plotly.toImage(el.value, { format: 'png', scale: 2, width: el.value.clientWidth, height: el.value.clientHeight })
}

defineExpose({ getDataURL, relayout })
</script>

<template>
  <div
    ref="el"
    class="chart-panel"
    :style="{
      width: width ? `${width}px` : '100%',
      height: height ? `${height}px` : '100%',
    }"
  />
</template>

<style scoped>
.chart-panel {
  min-height: 0;
  min-width: 0;
}
</style>
