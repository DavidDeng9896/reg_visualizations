<script setup lang="ts">
/**
 * 报告内嵌图表：按 tableId/viewId 走 pipeline + ChartPanel，供实况预览与导出截图。
 */
import { computed, ref, watch } from 'vue'
import type { Analysis } from '../../../shared/types'
import { runPipeline, PipelineError } from '../../../shared/pipeline'
import { findTable, findView } from '../../../shared/tree'
import { buildChartOption, validateChartMapping } from '../../charts/registry'
import ChartPanel from '../../charts/ChartPanel.vue'
import type { ChartOption } from '../../charts/types'

const props = defineProps<{
  analysis: Analysis | null
  tableId?: string
  viewId?: string
}>()

const panelRef = ref<InstanceType<typeof ChartPanel> | null>(null)
const option = ref<ChartOption | null>(null)
const rowCount = ref(0)
const error = ref('')

const revision = computed(() => props.analysis?.revision ?? 0)

function rebuild() {
  option.value = null
  error.value = ''
  rowCount.value = 0
  const a = props.analysis
  if (!a || !props.tableId || !props.viewId) {
    error.value = '未指定图表视图'
    return
  }
  const table = findTable(a, props.tableId)
  const view = table ? findView(table.views, props.viewId) : null
  if (!view?.chart) {
    error.value = '该视图没有图表配置'
    return
  }
  let result
  try {
    result = runPipeline(a, props.tableId, props.viewId)
  } catch (e) {
    error.value = e instanceof PipelineError ? e.message : e instanceof Error ? e.message : '数据计算失败'
    return
  }
  const missing = validateChartMapping(view.chart, result.columns).filter((m) => m.kind === 'required')
  if (missing.length) {
    error.value = '图表映射尚未配置完整'
    return
  }
  try {
    option.value = buildChartOption(result, view.chart, view.name, view.flags ?? [], { hideTitle: true }).option
    rowCount.value = result.rows.length
  } catch (e) {
    error.value = e instanceof Error ? e.message : '图表构建失败'
  }
}

watch(
  () => [props.tableId, props.viewId, revision.value] as const,
  () => rebuild(),
  { immediate: true },
)

async function getDataURL(): Promise<string> {
  if (!panelRef.value) return ''
  try {
    return (await panelRef.value.getDataURL()) || ''
  } catch {
    return ''
  }
}

defineExpose({ getDataURL })
</script>

<template>
  <div class="rec">
    <p v-if="error" class="rec__err">{{ error }}</p>
    <div v-else-if="option" class="rec__chart">
      <ChartPanel ref="panelRef" :option="option" :row-count="rowCount" />
    </div>
    <p v-else class="rec__err">图表加载中…</p>
  </div>
</template>

<style scoped>
.rec {
  min-height: 220px;
  background: #fff;
  border: 1px solid var(--rp-line, #d8dde3);
}
.rec__chart {
  height: 280px;
  min-height: 220px;
}
.rec__err {
  margin: 0;
  padding: 24px 12px;
  font-size: 12px;
  color: var(--rp-muted, #5c6570);
  text-align: center;
}
</style>
