<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { runPipeline } from '../../shared/pipeline'
import { findTable, findView } from '../../shared/tree'
import { buildChartOption } from '../charts/registry'
import ChartPanel from '../charts/ChartPanel.vue'
import type { ChartOption } from '../charts/types'
import { useAnalysisStore } from '../../stores/analysisStore'
import type { Artifact } from './types'

/** 产物卡内嵌小图表（view 产物）：按当前分析实时构建。 */
const props = defineProps<{
  artifact: Artifact
}>()

const store = useAnalysisStore()
const { current } = storeToRefs(store)

const option = ref<ChartOption | null>(null)
const failed = ref(false)

function rebuild(): void {
  failed.value = false
  option.value = null
  const a = current.value
  const art = props.artifact
  if (!a || art.kind !== 'view' || !art.tableId || !art.viewId) return
  const table = findTable(a, art.tableId)
  const view = table ? findView(table.views, art.viewId) : null
  if (!view?.chart) {
    failed.value = true
    return
  }
  try {
    const result = runPipeline(a, art.tableId, art.viewId)
    option.value = buildChartOption(result, view.chart, view.name, view.flags ?? [], { hideTitle: true }).option
  } catch {
    failed.value = true
  }
}

watch(() => [props.artifact.tableId, props.artifact.viewId, current.value?.updatedAt] as const, rebuild, { immediate: true })

const chartType = computed(() => props.artifact.viewType ?? 'chart')
</script>

<template>
  <div class="acc" data-testid="ai-chart-card">
    <ChartPanel v-if="option" :option="option" class="acc__chart" />
    <div v-else-if="failed" class="acc__fail">图表构建失败</div>
    <div v-else class="acc__loading">{{ chartType }} 加载中…</div>
  </div>
</template>

<style scoped>
.acc {
  height: 180px;
  min-height: 0;
  border-radius: var(--is-radius-sm);
  overflow: hidden;
  background: #fff;
}
.acc__chart {
  width: 100%;
  height: 100%;
}
.acc__fail,
.acc__loading {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--is-text-xs);
  color: var(--is-text-tertiary);
}
</style>
