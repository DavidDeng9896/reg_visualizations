<script setup lang="ts">
/**
 * Custom Code 等步骤产出的独立 Plotly figure 预览（非 bar/line ViewNode.chart）。
 */
import { computed, defineAsyncComponent } from 'vue'
import type { ChartOption } from '../../charts/types'

const ChartPanel = defineAsyncComponent(() => import('../../charts/ChartPanel.vue'))

const props = defineProps<{
  plotlyJson: Record<string, unknown>
  name?: string
}>()

const option = computed<ChartOption | null>(() => {
  const raw = props.plotlyJson
  if (!raw || typeof raw !== 'object') return null
  const data = Array.isArray(raw.data) ? (raw.data as ChartOption['data']) : []
  const layout =
    raw.layout && typeof raw.layout === 'object'
      ? ({ ...(raw.layout as Record<string, unknown>) } as ChartOption['layout'])
      : {}
  // 预览区收紧边距，避免标题过大挤占高度
  if (!layout.margin) {
    layout.margin = { t: 36, r: 16, b: 40, l: 48 }
  }
  if (layout.showlegend === undefined) layout.showlegend = true
  const config =
    raw.config && typeof raw.config === 'object'
      ? (raw.config as ChartOption['config'])
      : undefined
  return { data, layout, config }
})
</script>

<template>
  <div class="pap" data-testid="plotly-artifact-preview">
    <div v-if="name" class="pap__name" :title="name">{{ name }}</div>
    <div class="pap__chart">
      <ChartPanel v-if="option" :option="option" />
      <div v-else class="pap__empty">无效的 Plotly figure</div>
    </div>
  </div>
</template>

<style scoped>
.pap {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
  flex: 1;
  min-height: 0;
}
.pap__name {
  font-size: var(--is-text-xs);
  font-weight: 600;
  color: var(--is-text-secondary, var(--is-text));
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex-shrink: 0;
}
.pap__chart {
  flex: 1;
  min-height: 220px;
  height: 100%;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--is-border);
  border-radius: var(--is-radius-sm);
  overflow: hidden;
  background: #fff;
}
.pap__chart :deep(.chart-panel-wrap),
.pap__chart :deep(.chart-panel) {
  flex: 1;
  height: 100%;
  min-height: 0;
}
.pap__empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  font-size: var(--is-text-xs);
  color: var(--is-text-tertiary);
}
</style>
