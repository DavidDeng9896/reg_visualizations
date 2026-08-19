<script setup lang="ts">
import PlotlyArtifactPreview from '../steps/panel/PlotlyArtifactPreview.vue'
import type { PythonChartResolveOk } from './widgetData'

defineProps<{
  source: PythonChartResolveOk
}>()
</script>

<template>
  <div class="pcw">
    <PlotlyArtifactPreview :name="source.title" :plotly-json="source.plotlyJson" />
  </div>
</template>

<style scoped>
.pcw {
  height: 100%;
  min-height: 0;
  padding: 4px;
  display: flex;
  flex-direction: column;
}
.pcw :deep(.pap) {
  flex: 1;
  min-height: 0;
}
.pcw :deep(.pap__chart) {
  flex: 1;
  height: auto;
  min-height: 120px;
}
</style>
