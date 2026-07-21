<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useAnalysisStore } from '../../stores/analysisStore'
import { IEmptyState } from '../../ui'
import TableChartWorkspace from '../table/TableChartWorkspace.vue'

/** 工作区主区：选中表/视图 → 表+图一体化工作区（切片 S2 表格）。 */
const store = useAnalysisStore()
const { selected } = storeToRefs(store)
</script>

<template>
  <div class="workspace-main">
    <IEmptyState
      v-if="!selected"
      icon="database"
      title="从左侧选择一张表或视图"
      description="或通过右上角 Add data 导入数据、合并表。"
    />
    <TableChartWorkspace v-else :key="`${selected.tableId}:${selected.viewId ?? ''}`" />
  </div>
</template>

<style scoped>
.workspace-main {
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
</style>
