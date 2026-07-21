<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as echarts from 'echarts/core'
import { BarChart, BoxplotChart, CustomChart, HeatmapChart, LineChart, PieChart, ScatterChart } from 'echarts/charts'
import {
  BrushComponent,
  GridComponent,
  LegendComponent,
  MarkLineComponent,
  TitleComponent,
  ToolboxComponent,
  TooltipComponent,
  VisualMapComponent,
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { ChartOption } from './types'

/** ECharts 按需注册（六图种 + custom 误差棒/箱体 + visualMap + brush 套索 + markLine 渐近线）。 */
echarts.use([
  BarChart,
  LineChart,
  ScatterChart,
  BoxplotChart,
  PieChart,
  HeatmapChart,
  CustomChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
  VisualMapComponent,
  BrushComponent,
  ToolboxComponent,
  MarkLineComponent,
  CanvasRenderer,
])

/** 打标模式：off = 普通浏览；flag / clear = 套索圈选。 */
export type FlagMode = 'off' | 'flag' | 'clear'

/**
 * 图表渲染容器：init + ResizeObserver + 平滑 setOption（notMerge:false）。
 * 行数 > 5000 关闭动画。
 * Flag/Clear 模式：激活 brush 套索，禁用 tooltip，圈选结束 emit('lasso', rowIds)。
 */
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

const el = ref<HTMLElement>()
let chart: echarts.ECharts | null = null
let ro: ResizeObserver | null = null

function apply() {
  if (!chart || !props.option) return
  const opt = { ...props.option }
  if (props.rowCount > 5000) {
    opt.animation = false
  }
  if (props.flagMode !== 'off') {
    opt.tooltip = { ...(opt.tooltip ?? {}), show: false }
  }
  chart.setOption(opt, { notMerge: false })
  syncBrush()
  emit('rendered')
}

/* ------------------------------- 套索打标 ------------------------------- */

function syncBrush() {
  if (!chart) return
  if (props.flagMode === 'off') {
    chart.dispatchAction({ type: 'takeGlobalCursor', key: 'brush', brushOption: { brushType: false } })
    chart.dispatchAction({ type: 'brush', areas: [] })
    return
  }
  chart.setOption({
    brush: {
      brushMode: 'single',
      brushType: 'polygon',
      throttleType: 'debounce',
      throttleDelay: 120,
      brushStyle: {
        borderWidth: 1,
        color: props.flagMode === 'flag' ? 'rgba(46, 91, 255, 0.12)' : 'rgba(217, 45, 32, 0.10)',
        borderColor: props.flagMode === 'flag' ? '#2e5bff' : '#d92d20',
      },
      outOfBrush: { colorAlpha: 0.25 },
    },
  })
  chart.dispatchAction({
    type: 'takeGlobalCursor',
    key: 'brush',
    brushOption: { brushType: 'polygon', brushMode: 'single' },
  })
}

/** 射线法：点是否在多边形内（像素坐标）。 */
function pointInPolygon(x: number, y: number, polygon: [number, number][]): boolean {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const [xi, yi] = polygon[i]
    const [xj, yj] = polygon[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

/**
 * brushEnd 结算：直接读取事件携带的套索区域（像素多边形），
 * 用 convertToPixel 自行判定命中点 —— 不依赖被 throttle 的 brushSelected，
 * 避免「brushSelected 晚于 brushEnd 触发」的竞态导致丢选。
 */
function onBrushEnd(params: unknown) {
  if (props.flagMode === 'off' || !chart) return
  const areas = (params as { areas?: { range?: [number, number][] }[] } | undefined)?.areas ?? []
  const polygon = areas[0]?.range
  const allSeries = (props.option?.series as ChartOption[] | undefined) ?? []
  const rowIds = new Set<string>()
  if (polygon && polygon.length >= 3) {
    allSeries.forEach((s, seriesIndex) => {
      const ids = s.__rowIds as string[][] | undefined
      const data = s.data as ({ value: [number, number] } | [number, number])[] | undefined
      if (!ids || !Array.isArray(data)) return
      data.forEach((d, di) => {
        const v = Array.isArray(d) ? d : d?.value
        if (!v) return
        try {
          const px = chart?.convertToPixel({ seriesIndex }, v as number[])
          if (px && pointInPolygon(px[0], px[1], polygon)) {
            for (const id of ids[di] ?? []) rowIds.add(id)
          }
        } catch {
          /* 非直角坐标系列（custom 误差棒等）跳过 */
        }
      })
    })
  }
  // 清除套索区域，等待弹窗结果
  chart.dispatchAction({ type: 'brush', areas: [] })
  if (rowIds.size > 0) emit('lasso', [...rowIds])
}

onMounted(() => {
  if (!el.value) return
  chart = echarts.init(el.value)
  chart.on('brushEnd', onBrushEnd)
  apply()
  ro = new ResizeObserver(() => {
    chart?.resize({ animation: { duration: 200 } })
  })
  ro.observe(el.value)
})

watch(
  () => props.option,
  () => apply(),
  { deep: false },
)

watch(
  () => props.flagMode,
  () => {
    if (!chart) return
    if (props.flagMode === 'off') {
      chart.setOption({ tooltip: { show: true } })
    } else {
      chart.setOption({ tooltip: { show: false } })
    }
    syncBrush()
  },
)

onBeforeUnmount(() => {
  ro?.disconnect()
  chart?.dispose()
  chart = null
})

/** 供导出：白底 PNG dataURL。 */
function getDataURL(): string {
  return chart?.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: '#ffffff' }) ?? ''
}

defineExpose({ getDataURL })
</script>

<template>
  <div
    ref="el"
    class="chart-panel"
    :class="{ 'chart-panel--flagging': flagMode !== 'off' }"
    :style="{
      width: width ? `${width}px` : '100%',
      height: height ? `${height}px` : '100%',
      maxWidth: '100%',
    }"
  />
</template>

<style scoped>
.chart-panel {
  min-height: 0;
  min-width: 0;
  transition: opacity var(--is-dur-fast) var(--is-ease);
}
.chart-panel--flagging {
  cursor: crosshair;
}
</style>
