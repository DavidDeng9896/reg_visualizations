<template>
  <div class="chart">
    <div class="toolbar">
      <div v-if="missing.length" class="need-block" role="status">
        <span class="need">缺少字段：{{ missing.join('、') }}</span>
        <el-button size="small" type="primary" @click="emit('open-edit')">打开 Edit 配置</el-button>
      </div>
      <span v-if="built.sampled" class="sample">
        已采样显示（全量 {{ built.totalRows }} 行，上限 {{ SAMPLE_LIMIT }}）
      </span>
      <div v-if="built.fitWarnings?.length" class="fit-warn" role="status">
        <strong>拟合提示：</strong>
        <span v-for="(w, i) in built.fitWarnings" :key="i">{{ w }}</span>
      </div>
      <div v-if="built.axisWarnings?.length" class="fit-warn" role="status">
        <strong>轴 Scale：</strong>
        <span v-for="(w, i) in built.axisWarnings" :key="i">{{ w }}</span>
      </div>
      <el-button size="small" :loading="engineLoading" @click="downloadFull">下载完整数据 CSV</el-button>
      <el-button size="small" :loading="engineLoading" :disabled="!chartReady" @click="exportPng">
        导出 PNG
      </el-button>
      <el-button size="small" :loading="engineLoading" :disabled="!chartReady" @click="exportPdf">
        导出 PDF
      </el-button>
    </div>
    <div v-if="engineError" class="engine-error" role="alert">{{ engineError }}</div>
    <div v-if="missing.length" class="config-empty" role="status">
      <p>图表字段未配置完整，无法绘制有意义图形。</p>
      <el-button type="primary" @click="emit('open-edit')">Edit 图表字段</el-button>
    </div>
    <div
      ref="elRef"
      class="canvas"
      :class="{ dimmed: missing.length }"
      :style="canvasStyle"
    />
    <el-collapse v-if="showModelTables" v-model="modelCollapse" class="models">
      <el-collapse-item title="MODEL TABLES（拟合结果）" name="models">
        <template v-if="hasModelRows">
          <h4>MODEL VARIABLES</h4>
          <div class="model-table-wrap" role="region" aria-label="MODEL VARIABLES">
            <table class="model-table">
              <thead>
                <tr>
                  <th v-for="k in varKeys" :key="k" scope="col">{{ k }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, ri) in built.modelTables!.variables" :key="ri">
                  <td v-for="k in varKeys" :key="k">{{ formatCell(row[k]) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <h4>MODEL OUTPUT</h4>
          <div class="model-table-wrap" role="region" aria-label="MODEL OUTPUT">
            <table class="model-table">
              <thead>
                <tr>
                  <th v-for="k in outKeys" :key="k" scope="col">{{ k }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, ri) in built.modelTables!.output.slice(0, 50)" :key="ri">
                  <td v-for="k in outKeys" :key="k">{{ formatCell(row[k]) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </template>
        <p v-else class="model-empty" role="status">
          拟合未成功，暂无 MODEL VARIABLES / OUTPUT。请查看上方拟合提示，调整数据或 4PL 约束后重试。
        </p>
      </el-collapse-item>
    </el-collapse>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import type { ChartConfig, TableColumn, ViewType } from '@/shared/types/analysis'
import { buildChartOption, SAMPLE_LIMIT } from '@/modules/chart/runtime'
import { missingRequiredFields } from '@/modules/chart/guessMapping'
import { useAnalysisStore } from '@/modules/analysis/stores/analysisStore'
import { cloneDeep } from '@/shared/utils/clone'
import { debounce } from '@/shared/utils/debounce'

/** 表筛选/编辑后重绘防抖（需求 §5.3） */
const CHART_REFRESH_DEBOUNCE_MS = 160

const props = defineProps<{
  viewType: ViewType
  columns: TableColumn[]
  rows: Record<string, unknown>[]
  config: ChartConfig
}>()
const emit = defineEmits<{ 'update:config': [ChartConfig]; 'open-edit': [] }>()
const store = useAnalysisStore()

const elRef = ref<HTMLDivElement>()
const engineLoading = ref(true)
const engineError = ref('')
const chartReady = ref(false)
let chart: import('echarts').ECharts | null = null
let echartsApi: typeof import('echarts') | null = null
let resizeObserver: ResizeObserver | null = null
let renderQueued = false

const missing = computed(() => missingRequiredFields(props.viewType, props.config.configure))

const canvasStyle = computed(() => {
  const s = props.config.style
  const style: Record<string, string> = {}
  if (s.width && Number.isFinite(s.width)) style.width = `${s.width}px`
  if (s.height && Number.isFinite(s.height)) {
    style.height = `${s.height}px`
    style.minHeight = `${s.height}px`
  }
  return style
})

const built = computed(() =>
  buildChartOption({
    columns: props.columns,
    rows: props.rows,
    viewType: props.viewType,
    config: props.config,
  }),
)

const hasModelRows = computed(() => (built.value.modelTables?.variables?.length ?? 0) > 0)
const showModelTables = computed(() => {
  const cfg = props.config.configure
  const fitting = !!cfg.fitModel && cfg.fitModel !== 'none'
  if (!fitting) return false
  return hasModelRows.value || (built.value.fitWarnings?.length ?? 0) > 0
})
/** 拟合失败时自动展开 MODEL TABLES，成功时保持用户折叠偏好 */
const modelCollapse = ref<string[]>([])
watch(
  () => built.value.fitWarnings,
  (warnings) => {
    if (warnings?.length) modelCollapse.value = ['models']
  },
  { immediate: true },
)
const varKeys = computed(() =>
  built.value.modelTables?.variables[0] ? Object.keys(built.value.modelTables.variables[0]) : [],
)
const outKeys = computed(() =>
  built.value.modelTables?.output[0] ? Object.keys(built.value.modelTables.output[0]) : [],
)

function formatCell(v: unknown): string {
  if (v == null) return ''
  if (typeof v === 'number') return Number.isFinite(v) ? String(Math.round(v * 1e6) / 1e6) : String(v)
  return String(v)
}

async function ensureEngine() {
  if (echartsApi) return echartsApi
  engineLoading.value = true
  engineError.value = ''
  try {
    echartsApi = await import('echarts')
    return echartsApi
  } catch (err) {
    engineError.value = `图表引擎加载失败：${String(err)}`
    throw err
  } finally {
    engineLoading.value = false
  }
}

async function render() {
  if (!elRef.value) return
  if (renderQueued) return
  renderQueued = true
  try {
    const echarts = await ensureEngine()
    if (!elRef.value) return
    if (!chart) chart = echarts.init(elRef.value)
    chart.setOption(built.value.option, true)
    chart.resize()
    chartReady.value = true
    chart.off('brushselected')
    chart.on('brushselected', (params: unknown) => {
      const p = params as { batch?: { selected?: { dataIndex?: number[] }[] }[] }
      const indexes = p.batch?.[0]?.selected?.[0]?.dataIndex || []
      const series = (built.value.option.series || []) as { data?: { id?: string }[] }[]
      const data = series[0]?.data || []
      const ids = indexes.map((i) => data[i]?.id).filter(Boolean) as string[]
      if (!ids.length || !store.selectedView) return
      const cfg = cloneDeep(props.config)
      cfg.flags = cfg.flags || { pointIds: [], comments: {} }
      for (const id of ids) {
        if (!cfg.flags.pointIds.includes(id)) cfg.flags.pointIds.push(id)
        cfg.flags.comments[id] = cfg.flags.comments[id] || 'flagged'
      }
      emit('update:config', cfg)
    })
  } finally {
    renderQueued = false
  }
}

function resize() {
  chart?.resize()
}

const scheduleRender = debounce(() => {
  void render()
}, CHART_REFRESH_DEBOUNCE_MS)

onMounted(() => {
  void render()
  if (elRef.value && typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => resize())
    resizeObserver.observe(elRef.value)
  }
  window.addEventListener('resize', resize, { passive: true })
})

onUnmounted(() => {
  scheduleRender.cancel()
  window.removeEventListener('resize', resize)
  resizeObserver?.disconnect()
  resizeObserver = null
  chart?.dispose()
  chart = null
})

watch(built, () => {
  scheduleRender()
})

function downloadFull() {
  const header = props.columns.map((c) => c.field).join(',')
  const lines = props.rows.map((r) => props.columns.map((c) => JSON.stringify(r[c.field] ?? '')).join(','))
  const blob = new Blob([[header, ...lines].join('\n')], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'full-data.csv'
  a.click()
  URL.revokeObjectURL(url)
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
  const { jsPDF } = await import('jspdf')
  const pdf = new jsPDF({ orientation: 'landscape' })
  pdf.addImage(url, 'PNG', 10, 10, 280, 150)
  pdf.save('chart.pdf')
}
</script>

<style scoped>
.chart {
  position: relative;
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 8px;
  min-height: 0;
}
.toolbar {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 6px;
  flex-wrap: wrap;
}
.sample {
  color: #e6a23c;
  font-size: 12px;
}
.fit-warn {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: baseline;
  color: #b88230;
  background: #fdf6ec;
  border: 1px solid #faecd8;
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 12px;
  max-width: 100%;
}
.fit-warn strong {
  color: #a06c1f;
}
.need-block {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-right: auto;
}
.need {
  color: #c45656;
  font-size: 12px;
  font-weight: 600;
}
.config-empty {
  position: absolute;
  z-index: 3;
  left: 50%;
  top: 46%;
  transform: translate(-50%, -50%);
  text-align: center;
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid var(--ia-border);
  border-radius: 8px;
  padding: 16px 20px;
  box-shadow: 0 4px 16px rgba(31, 35, 41, 0.08);
  max-width: 320px;
}
.config-empty p {
  margin: 0 0 10px;
  font-size: 13px;
  color: #646a73;
}
.engine-error {
  color: #c45656;
  font-size: 12px;
  margin-bottom: 6px;
}
.canvas {
  flex: 1;
  min-height: 200px;
}
.canvas.dimmed {
  opacity: 0.35;
  pointer-events: none;
}
.models {
  border-top: 1px solid var(--ia-border);
  margin-top: 4px;
}
.model-empty {
  margin: 8px 0 4px;
  font-size: 12px;
  line-height: 1.45;
  color: #8a6d3b;
  background: #fdf6ec;
  border: 1px solid #faecd8;
  border-radius: 4px;
  padding: 8px 10px;
}
h4 {
  margin: 6px 0;
  font-size: 13px;
}
.model-table-wrap {
  max-height: 140px;
  overflow: auto;
  border: 1px solid var(--ia-border);
  border-radius: 4px;
}
.model-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}
.model-table th,
.model-table td {
  padding: 4px 8px;
  border-bottom: 1px solid var(--ia-border);
  text-align: left;
  white-space: nowrap;
}
.model-table th {
  position: sticky;
  top: 0;
  background: #f5f6f7;
  font-weight: 600;
}
.model-table tbody tr:last-child td {
  border-bottom: none;
}
</style>
