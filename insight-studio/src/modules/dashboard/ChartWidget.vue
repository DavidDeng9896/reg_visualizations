<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { buildChartOption } from '../charts/registry'
import ChartPanel from '../charts/ChartPanel.vue'
import { samplingNotice } from '../charts/runtime/sampling'
import { IIcon } from '../../ui'
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

/** 采样提示（与工作区图表一致的黄色警告条）。 */
const sampling = computed(() => samplingNotice(props.source.result))

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
    <div v-if="sampling.sampled" class="cw__notice" role="note">
      <IIcon name="warning" :size="13" />
      <span>{{ sampling.message }}</span>
    </div>
    <p v-if="error" class="cw__err">{{ error }}</p>
    <ChartPanel v-else-if="option" :option="option" :row-count="source.result.rows.length" />
  </div>
</template>

<style scoped>
.cw {
  height: 100%;
  min-height: 0;
  padding: 4px;
  display: flex;
  flex-direction: column;
}
.cw__notice {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0 4px 4px;
  padding: 5px 10px;
  border-radius: var(--is-radius-sm);
  background: var(--is-warning-bg);
  color: var(--is-warning-text);
  font-size: var(--is-text-xs);
  flex-shrink: 0;
}
.cw__err {
  margin: 0;
  padding: 16px;
  font-size: var(--is-text-sm);
  color: var(--is-danger);
  text-align: center;
}
</style>
