<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useAnalysisStore } from '../../stores/analysisStore'
import { IEmptyState } from '../../ui'
import TableChartWorkspace from '../table/TableChartWorkspace.vue'

/** 工作区主区：选中表/视图 → 表+图一体化工作区（切片 S2 表格）。 */
const store = useAnalysisStore()
const { current, selected, loading } = storeToRefs(store)
</script>

<template>
  <div class="workspace-main">
    <!-- 加载中不展示「请选择」空态，避免与顶层 loading 叠出误导 -->
    <div v-if="loading || !current" class="workspace-main__pending" role="status" aria-label="加载中" />
    <IEmptyState
      v-else-if="!selected"
      icon="database"
      title="从左侧选择一张表或视图"
      description="或通过左侧 + 导入数据、合并表。"
    />
    <TableChartWorkspace
      v-else
      :key="`${current?.id ?? ''}:${selected.tableId}:${selected.viewId ?? ''}`"
    />
  </div>
</template>

<style scoped>
.workspace-main {
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.workspace-main__pending {
  flex: 1;
  min-height: 0;
  background: var(--is-bg);
}
</style>
