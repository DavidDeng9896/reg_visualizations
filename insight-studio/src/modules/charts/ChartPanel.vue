<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import Plotly from 'plotly.js-dist-min'
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

async function apply(initial = false): Promise<void> {
  if (!mounted || !el.value) return
  const figure = props.option ?? { data: [], layout: {} }
  const layout = { ...figure.layout, autosize: true }
  const config = { responsive: true, displaylogo: false, ...figure.config }
  if (initial) await Plotly.newPlot(el.value, figure.data as Plotly.Data[], layout as Partial<Plotly.Layout>, config as Partial<Plotly.Config>)
  else await Plotly.react(el.value, figure.data as Plotly.Data[], layout as Partial<Plotly.Layout>, config as Partial<Plotly.Config>)
  emit('rendered')
}

onMounted(() => {
  mounted = true
  void apply(true)
  ro = new ResizeObserver(() => {
    if (el.value) void Plotly.Plots.resize(el.value)
  })
  if (el.value) ro.observe(el.value)
})

watch(
  () => props.option,
  () => void apply(),
  { deep: false },
)

onBeforeUnmount(() => {
  mounted = false
  ro?.disconnect()
  if (el.value) Plotly.purge(el.value)
})

async function getDataURL(): Promise<string> {
  if (!el.value) return ''
  return Plotly.toImage(el.value, { format: 'png', scale: 2, width: el.value.clientWidth, height: el.value.clientHeight })
}

defineExpose({ getDataURL })
</script>

<template>
  <div
    ref="el"
    class="chart-panel"
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
</style>
