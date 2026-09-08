<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { runPipeline } from '../../shared/pipeline'
import { findTable, findView } from '../../shared/tree'
import { analysisRepository } from '../../shared/repository'
import { buildChartOption, validateChartMapping } from '../charts/registry'
import { EMPTY_FIGURE } from '../charts/types'
import ChartPanel from '../charts/ChartPanel.vue'
import type { ChartOption } from '../charts/types'
import { useAnalysisStore } from '../../stores/analysisStore'
import type { Analysis } from '../../shared/types'
import type { Artifact } from './types'

/** 产物卡内嵌小图表（view 产物）：按产物所属分析构建；非当前分析时从库读取。 */
const props = defineProps<{
  artifact: Artifact
}>()

const store = useAnalysisStore()
const { current } = storeToRefs(store)

const option = ref<ChartOption | null>(null)
const failed = ref(false)
const failReason = ref('')
let gen = 0

async function rebuild(): Promise<void> {
  const token = ++gen
  failed.value = false
  failReason.value = ''
  option.value = null
  const art = props.artifact
  if (art.kind !== 'view' || !art.analysisId || !art.tableId || !art.viewId) return
  let a: Analysis | null | undefined = current.value?.id === art.analysisId ? current.value : null
  if (!a) a = await analysisRepository.get(art.analysisId)
  if (token !== gen) return
  if (!a) {
    failed.value = true
    failReason.value = '分析不存在'
    return
  }
  const table = findTable(a, art.tableId)
  const view = table ? findView(table.views, art.viewId) : null
  if (!view?.chart) {
    failed.value = true
    failReason.value = '视图无图表配置'
    return
  }
  try {
    const mappingErrors = validateChartMapping(view.chart, table!.columns)
    if (mappingErrors.length) {
      failed.value = true
      failReason.value = mappingErrors.map((e) => e.message).join('；')
      return
    }
    const result = runPipeline(a, art.tableId, art.viewId)
    const built = buildChartOption(result, view.chart, view.name, view.flags ?? [], { hideTitle: true })
    if (token !== gen) return
    // 缺映射时 build 返回 EMPTY_FIGURE（data=[]），视为失败而非空白「成功」
    if (!built.option?.data?.length || built.option === EMPTY_FIGURE) {
      failed.value = true
      failReason.value = built.warnings?.length ? built.warnings.join('；') : '图表数据为空'
      return
    }
    option.value = built.option
  } catch (e) {
    failed.value = true
    failReason.value = e instanceof Error ? e.message : '图表构建失败'
  }
}

watch(
  () => [props.artifact.analysisId, props.artifact.tableId, props.artifact.viewId, current.value?.updatedAt] as const,
  () => void rebuild(),
  { immediate: true },
)

const chartType = computed(() => props.artifact.viewType ?? 'chart')
</script>

<template>
  <div class="acc" data-testid="ai-chart-card">
    <ChartPanel v-if="option" :option="option" class="acc__chart" />
    <div v-else-if="failed" class="acc__fail" :title="failReason">
      {{ failReason || '图表构建失败' }}
    </div>
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
  /* 预览不可交互，点击穿透到 ArtifactCard 打开工作区 */
  pointer-events: none;
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
  padding: 0 12px;
  text-align: center;
  font-size: var(--is-text-xs);
  color: var(--is-text-tertiary);
}
</style>
