<template>
  <div v-if="store.workspaceResult" class="ws">
    <div class="ws-toolbar">
      <template v-if="store.selectedView">
        <el-input
          v-model="viewName"
          size="small"
          style="width: 200px"
          @change="store.renameNode(store.selectedView.view.id, viewName)"
        />
        <el-select v-model="viewType" size="small" style="width: 140px" @change="onViewType">
          <el-option v-for="t in viewTypes" :key="t" :label="t" :value="t" />
        </el-select>
        <el-select v-model="chartPos" size="small" style="width: 140px" @change="onPos">
          <el-option label="图在下" value="bottom" />
          <el-option label="图在上" value="top" />
          <el-option label="图在左" value="left" />
          <el-option label="图在右" value="right" />
        </el-select>
        <el-button size="small" @click="showTransforms = true">过滤 / 转换</el-button>
        <el-button size="small" @click="showChartEdit = true" :disabled="viewType === 'table'">Edit 图表</el-button>
      </template>
      <template v-else-if="store.selectedTable">
        <strong>{{ store.selectedTable.name }}</strong>
        <el-button size="small" @click="quickView">New view</el-button>
      </template>
      <el-button size="small" @click="exportCsv">导出 CSV</el-button>
    </div>

    <div class="ws-body" :class="layoutClass">
      <div v-if="showChartPane" class="chart-pane">
        <ChartPanel
          :view-type="viewType"
          :columns="store.workspaceResult.columns"
          :rows="store.workspaceResult.rows"
          :config="chartConfig"
          @update:config="onChartSave"
        />
      </div>
      <div class="table-pane">
        <EditableGrid
          :columns="store.workspaceResult.columns"
          :model-value="store.workspaceResult.rows"
          :editable="store.canEditGrid"
          @update:model-value="onRows"
        />
      </div>
    </div>

    <TransformDialog v-model="showTransforms" />
    <ChartEditDrawer v-model="showChartEdit" :config="chartConfig" :columns="store.workspaceResult.columns" @save="onChartSave" />
  </div>
  <div v-else class="empty">从侧栏选择表或视图，或使用 + Add data 导入 CSV</div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useAnalysisStore } from '@/modules/analysis/stores/analysisStore'
import type { ChartConfig, ChartPosition, ViewType } from '@/shared/types/analysis'
import EditableGrid from './EditableGrid.vue'
import ChartPanel from '@/modules/chart/ChartPanel.vue'
import TransformDialog from '@/modules/transform/TransformDialog.vue'
import ChartEditDrawer from '@/modules/chart/ChartEditDrawer.vue'

const store = useAnalysisStore()
const showTransforms = ref(false)
const showChartEdit = ref(false)
const viewTypes: ViewType[] = ['table', 'bar', 'line', 'scatter', 'box', 'pie', 'heatmap']

const viewName = ref('')
const viewType = ref<ViewType>('table')
const chartPos = ref<ChartPosition>('bottom')
const chartConfig = ref<ChartConfig>(store.defaultChartConfig())

watch(
  () => store.selectedView,
  (sv) => {
    if (!sv) return
    viewName.value = sv.view.name
    viewType.value = sv.view.viewType
    chartPos.value = sv.view.chartConfig.chartPosition
    chartConfig.value = structuredClone(sv.view.chartConfig)
  },
  { immediate: true },
)

const showChartPane = computed(() => store.selectedView && viewType.value !== 'table')
const layoutClass = computed(() => {
  if (!showChartPane.value) return 'only-table'
  return `pos-${chartPos.value}`
})

function onViewType(t: ViewType) {
  if (!store.selectedView) return
  store.updateView(store.selectedView.view.id, { viewType: t })
}

function onPos(p: ChartPosition) {
  if (!store.selectedView) return
  store.setChartPosition(store.selectedView.view.id, p)
}

function onChartSave(cfg: ChartConfig) {
  chartConfig.value = cfg
  if (!store.selectedView) return
  store.setChartConfig(store.selectedView.view.id, cfg)
  showChartEdit.value = false
}

function onRows(rows: Record<string, unknown>[]) {
  if (store.selectedTable) {
    store.updateTableRows(store.selectedTable.id, rows)
  } else if (store.selectedView && store.canEditGrid) {
    store.updateTableRows(store.selectedView.table.id, rows)
  }
}

function quickView() {
  if (!store.selectedTable) return
  store.addView(store.selectedTable.id, store.selectedTable.id, 'New view', 'table')
}

function exportCsv() {
  const res = store.workspaceResult
  if (!res) return
  const header = res.columns.map((c) => c.field).join(',')
  const lines = res.rows.map((r) =>
    res.columns.map((c) => JSON.stringify(r[c.field] ?? '')).join(','),
  )
  const blob = new Blob([[header, ...lines].join('\n')], { type: 'text/csv' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = 'export.csv'
  a.click()
}
</script>

<style scoped>
.ws {
  height: 100%;
  display: flex;
  flex-direction: column;
}
.ws-toolbar {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 8px 10px;
  background: #fff;
  border-bottom: 1px solid var(--ia-border);
  flex-wrap: wrap;
}
.ws-body {
  flex: 1;
  min-height: 0;
  display: flex;
}
.ws-body.only-table .table-pane {
  flex: 1;
}
.ws-body.pos-bottom {
  flex-direction: column;
}
.ws-body.pos-top {
  flex-direction: column-reverse;
}
.ws-body.pos-right {
  flex-direction: row;
}
.ws-body.pos-left {
  flex-direction: row-reverse;
}
.chart-pane {
  flex: 1;
  min-height: 280px;
  min-width: 320px;
  background: #fff;
  border-bottom: 1px solid var(--ia-border);
}
.pos-left .chart-pane,
.pos-right .chart-pane {
  border-bottom: none;
  border-left: 1px solid var(--ia-border);
}
.table-pane {
  flex: 1;
  min-height: 200px;
  min-width: 280px;
}
.empty {
  padding: 40px;
  color: #909399;
  text-align: center;
}
</style>
