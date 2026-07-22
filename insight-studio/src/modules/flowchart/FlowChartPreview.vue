<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import type { ChartConfig, ChartType } from '../../shared/types'
import { PipelineError, runPipeline } from '../../shared/pipeline'
import { findTable, findView } from '../../shared/tree'
import { useAnalysisStore } from '../../stores/analysisStore'
import { IButton, IEmptyState, IIcon } from '../../ui'
import ChartPanel from '../charts/ChartPanel.vue'
import { buildChartOption, getChartDef, validateChartMapping } from '../charts/registry'
import type { ChartOption } from '../charts/types'

/**
 * 流程图侧边预览：只读渲染已保存的图表配置（不走 ChartView / 配置抽屉）。
 */
const props = defineProps<{
  tableId: string
  viewId: string
}>()

const emit = defineEmits<{ (e: 'open'): void }>()

const store = useAnalysisStore()
const { current } = storeToRefs(store)

const option = ref<ChartOption | null>(null)
const rowCount = ref(0)
const error = ref('')
const mappingIncomplete = ref(false)
const chartType = ref<ChartType>('bar')

const defIcon = computed(() => getChartDef(chartType.value).icon)

function rebuild() {
  option.value = null
  error.value = ''
  mappingIncomplete.value = false
  rowCount.value = 0

  const analysis = current.value
  if (!analysis) {
    error.value = '未找到分析'
    return
  }
  const table = findTable(analysis, props.tableId)
  const view = table ? findView(table.views, props.viewId) : null
  if (!view?.chart) {
    error.value = '该节点没有图表配置'
    return
  }

  chartType.value = view.chart.chartType
  let result
  try {
    result = runPipeline(analysis, props.tableId, props.viewId)
  } catch (e) {
    error.value = e instanceof PipelineError ? e.message : e instanceof Error ? e.message : '数据计算失败'
    return
  }

  const cfg: ChartConfig = view.chart
  const missing = validateChartMapping(cfg, result.columns).filter((m) => m.kind === 'required')
  if (missing.length) {
    mappingIncomplete.value = true
    return
  }

  const out = buildChartOption(result, cfg, view.name, view.flags)
  option.value = out.option
  rowCount.value = result.rows.length
}

watch(
  () => [props.tableId, props.viewId, current.value] as const,
  () => rebuild(),
  { immediate: true, deep: false },
)
</script>

<template>
  <div class="flow-chart-preview" data-testid="flow-chart-preview">
    <div v-if="error" class="flow-chart-preview__state">
      <IIcon name="warning" :size="16" />
      <span>{{ error }}</span>
    </div>

    <IEmptyState
      v-else-if="mappingIncomplete"
      :icon="defIcon"
      title="尚未配置图表"
      description="打开工作区绑定坐标轴后，这里会显示预览"
    >
      <IButton variant="primary" size="sm" icon="external" @click="emit('open')">在工作区打开</IButton>
    </IEmptyState>

    <div v-else-if="option" class="flow-chart-preview__stage">
      <ChartPanel
        :option="option"
        :row-count="rowCount"
        class="flow-chart-preview__chart"
        data-testid="flow-chart-canvas"
      />
    </div>

    <div v-else class="flow-chart-preview__state flow-chart-preview__state--muted">加载中…</div>
  </div>
</template>

<style scoped>
.flow-chart-preview {
  min-height: 240px;
  display: flex;
  flex-direction: column;
}
.flow-chart-preview__stage {
  height: 320px;
  min-height: 260px;
  border: 1px solid var(--is-border);
  border-radius: var(--is-radius-sm);
  background: #fff;
  overflow: hidden;
}
.flow-chart-preview__chart {
  width: 100%;
  height: 100%;
}
.flow-chart-preview__state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 180px;
  padding: 16px;
  border: 1px dashed var(--is-border);
  border-radius: var(--is-radius-sm);
  font-size: var(--is-text-sm);
  color: var(--is-warning-text);
  background: var(--is-warning-bg);
  text-align: center;
}
.flow-chart-preview__state--muted {
  color: var(--is-text-tertiary);
  background: var(--is-surface-hover);
  border-style: solid;
}
.flow-chart-preview :deep(.is-empty) {
  padding: 20px 12px;
  min-height: 180px;
}
</style>
