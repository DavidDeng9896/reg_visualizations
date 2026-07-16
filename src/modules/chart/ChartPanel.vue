<template>
  <div class="chart">
    <div class="toolbar">
      <span v-if="built.sampled" class="sample">已采样显示（全量 {{ built.totalRows }} 行，上限 {{ SAMPLE_LIMIT }}）</span>
      <el-button size="small" @click="downloadFull">下载完整数据 CSV</el-button>
      <el-button size="small" @click="exportPng">导出 PNG</el-button>
      <el-button size="small" @click="exportPdf">导出 PDF</el-button>
    </div>
    <div ref="elRef" class="canvas" />
    <div v-if="built.modelTables?.variables?.length" class="models">
      <h4>MODEL VARIABLES</h4>
      <el-table :data="built.modelTables.variables" size="small" max-height="120">
        <el-table-column v-for="k in varKeys" :key="k" :prop="k" :label="k" />
      </el-table>
      <h4>MODEL OUTPUT</h4>
      <el-table :data="built.modelTables.output.slice(0, 50)" size="small" max-height="140">
        <el-table-column v-for="k in outKeys" :key="k" :prop="k" :label="k" />
      </el-table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import * as echarts from 'echarts'
import { jsPDF } from 'jspdf'
import type { ChartConfig, TableColumn, ViewType } from '@/shared/types/analysis'
import { buildChartOption, SAMPLE_LIMIT } from '@/modules/chart/runtime'
import { useAnalysisStore } from '@/modules/analysis/stores/analysisStore'

const props = defineProps<{
  viewType: ViewType
  columns: TableColumn[]
  rows: Record<string, unknown>[]
  config: ChartConfig
}>()
const emit = defineEmits<{ 'update:config': [ChartConfig] }>()
const store = useAnalysisStore()

const elRef = ref<HTMLDivElement>()
let chart: echarts.ECharts | null = null

const built = computed(() =>
  buildChartOption({
    columns: props.columns,
    rows: props.rows,
    viewType: props.viewType,
    config: props.config,
  }),
)

const varKeys = computed(() =>
  built.value.modelTables?.variables[0] ? Object.keys(built.value.modelTables.variables[0]) : [],
)
const outKeys = computed(() =>
  built.value.modelTables?.output[0] ? Object.keys(built.value.modelTables.output[0]) : [],
)

function render() {
  if (!elRef.value) return
  if (!chart) chart = echarts.init(elRef.value)
  chart.setOption(built.value.option, true)
  chart.off('brushselected')
  chart.on('brushselected', (params: unknown) => {
    const p = params as { batch?: { selected?: { dataIndex?: number[] }[] }[] }
    const indexes = p.batch?.[0]?.selected?.[0]?.dataIndex || []
    // Map first series data indexes to row ids when possible
    const series = (built.value.option.series || []) as { data?: { id?: string }[] }[]
    const data = series[0]?.data || []
    const ids = indexes.map((i) => data[i]?.id).filter(Boolean) as string[]
    if (!ids.length || !store.selectedView) return
    const cfg = structuredClone(props.config)
    cfg.flags = cfg.flags || { pointIds: [], comments: {} }
    for (const id of ids) {
      if (!cfg.flags.pointIds.includes(id)) cfg.flags.pointIds.push(id)
      cfg.flags.comments[id] = cfg.flags.comments[id] || 'flagged'
    }
    emit('update:config', cfg)
  })
}

onMounted(() => {
  render()
  window.addEventListener('resize', resize)
})
onUnmounted(() => {
  window.removeEventListener('resize', resize)
  chart?.dispose()
})
watch(built, () => render(), { deep: true })

function resize() {
  chart?.resize()
}

function downloadFull() {
  const header = props.columns.map((c) => c.field).join(',')
  const lines = props.rows.map((r) => props.columns.map((c) => JSON.stringify(r[c.field] ?? '')).join(','))
  const blob = new Blob([[header, ...lines].join('\n')], { type: 'text/csv' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = 'full-data.csv'
  a.click()
}

function exportPng() {
  if (!chart) return
  const url = chart.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: '#fff' })
  const a = document.createElement('a')
  a.href = url
  a.download = 'chart.png'
  a.click()
}

async function exportPdf() {
  if (!chart) return
  const url = chart.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: '#fff' })
  const pdf = new jsPDF({ orientation: 'landscape' })
  pdf.addImage(url, 'PNG', 10, 10, 280, 150)
  pdf.save('chart.pdf')
}
</script>

<style scoped>
.chart {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 8px;
}
.toolbar {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 6px;
}
.sample {
  color: #e6a23c;
  font-size: 12px;
}
.canvas {
  flex: 1;
  min-height: 280px;
}
.models {
  max-height: 220px;
  overflow: auto;
  border-top: 1px solid var(--ia-border);
  padding-top: 6px;
}
h4 {
  margin: 6px 0;
  font-size: 13px;
}
</style>
