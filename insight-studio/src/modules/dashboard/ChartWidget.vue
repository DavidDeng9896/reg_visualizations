<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { buildChartOption } from '../charts/registry'
import ChartPanel from '../charts/ChartPanel.vue'
import type { ChartOption } from '../charts/types'
import type { WidgetResolveOk } from './widgetData'

const props = defineProps<{
  source: WidgetResolveOk
}>()

const option = ref<ChartOption | null>(null)
const error = ref('')

const canChart = computed(() => {
  const v = props.source.view
  return !!v && v.type !== 'table' && !!v.chart
})

watch(
  () => props.source,
  (src) => {
    error.value = ''
    option.value = null
    if (!canChart.value || !src.view?.chart) {
      error.value = '该引用不是可渲染的图表视图'
      return
    }
    try {
      const out = buildChartOption(src.result, src.view.chart, src.title, src.view.flags ?? [])
      option.value = out.option
    } catch (e) {
      error.value = e instanceof Error ? e.message : '图表构建失败'
    }
  },
  { immediate: true },
)
</script>

<template>
  <div class="cw">
    <p v-if="error" class="cw__err">{{ error }}</p>
    <ChartPanel v-else-if="option" :option="option" :row-count="source.result.rows.length" />
  </div>
</template>

<style scoped>
.cw {
  height: 100%;
  min-height: 0;
  padding: 4px;
}
.cw__err {
  margin: 0;
  padding: 16px;
  font-size: var(--is-text-sm);
  color: var(--is-danger);
  text-align: center;
}
</style>
