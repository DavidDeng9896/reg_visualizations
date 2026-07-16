<template>
  <div class="list-page">
    <header class="top">
      <div>
        <h1>Insight Analysis</h1>
        <p class="sub">本地数据工作空间 · 导入 · 转换 · 可视化</p>
      </div>
      <div class="top-actions">
        <button type="button" class="btn" :disabled="demoBusy" @click="createDemo">
          {{ demoBusy ? '创建中…' : '一键 Demo（含示例数据）' }}
        </button>
        <button type="button" class="btn btn-primary" @click="showCreate = true">+ 创建 Analysis</button>
      </div>
    </header>

    <div class="toolbar">
      <label class="filter">
        <span class="sr-only">按项目筛选</span>
        <select v-model="projectFilter" aria-label="按项目筛选">
          <option value="">全部项目</option>
          <option v-for="p in MOCK_PROJECTS" :key="p.id" :value="p.id">{{ p.name }}</option>
        </select>
      </label>
    </div>

    <table v-if="filtered.length" class="analysis-table" aria-label="Analysis 列表">
      <thead>
        <tr>
          <th scope="col">名称</th>
          <th scope="col">项目</th>
          <th scope="col">更新时间</th>
          <th scope="col">操作</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="row in filtered"
          :key="row.id"
          tabindex="0"
          @click="open(row)"
          @keydown.enter="open(row)"
        >
          <td>{{ row.name }}</td>
          <td>{{ getProjectName(row.projectId) }}</td>
          <td>{{ formatTime(row.updatedAt) }}</td>
          <td>
            <button type="button" class="link-danger" @click.stop="onRemove(row.id)">删除</button>
          </td>
        </tr>
      </tbody>
    </table>
    <div v-else class="empty-list">
      <p>还没有 Analysis。使用上方「一键 Demo」快速体验，或「+ 创建 Analysis」后导入 CSV。</p>
    </div>

    <CreateAnalysisDialog v-if="showCreate" v-model="showCreate" @create="onCreate" />
  </div>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { confirm, toast } from '@/shared/ui/feedback'
import { useAnalysisStore } from '@/modules/analysis/stores/analysisStore'
import { MOCK_PROJECTS, getProjectName } from '@/shared/mock/projects'
import { createDemoTable } from '@/shared/mock/demoData'

const CreateAnalysisDialog = defineAsyncComponent(
  () => import('@/modules/analysis/views/CreateAnalysisDialog.vue'),
)

const store = useAnalysisStore()
const router = useRouter()
const showCreate = ref(false)
const projectFilter = ref('')
const demoBusy = ref(false)

const filtered = computed(() =>
  store.list.filter((a) => !projectFilter.value || a.projectId === projectFilter.value),
)

onMounted(() => store.loadList())

function formatTime(iso: string) {
  return new Date(iso).toLocaleString()
}

async function onCreate(payload: { name: string; projectId: string }) {
  const a = await store.createAnalysis(payload.name, payload.projectId)
  showCreate.value = false
  toast('success', '已创建')
  router.push(`/analyses/${a.id}`)
}

async function createDemo() {
  if (demoBusy.value) return
  demoBusy.value = true
  try {
    const a = await store.createAnalysis('Demo Dose Response', MOCK_PROJECTS[0].id)
    await store.openAnalysis(a.id)
    const table = createDemoTable()
    store.addTable(table)
    const view = store.addView(table.id, table.id, 'Scatter Dose-Response', 'scatter')
    if (view) {
      store.setChartConfig(view.id, {
        ...store.defaultChartConfig(),
        configure: {
          ...store.defaultChartConfig().configure,
          xField: 'dose',
          yField: 'response',
          seriesField: 'compound',
          fitModel: '4pl',
        },
        style: {
          ...store.defaultChartConfig().style,
          title: 'Dose Response',
          subtitle: 'Demo dataset',
        },
      })
      store.selectNode(view.id, 'workspace')
    }
    await store.flushSave()
    toast('success', '已创建 Demo Analysis')
    await router.push(`/analyses/${a.id}`)
  } catch (err) {
    console.error('[createDemo]', err)
    toast('error', 'Demo 创建失败，请刷新后重试')
  } finally {
    demoBusy.value = false
  }
}

function open(row: { id: string }) {
  router.push(`/analyses/${row.id}`)
}

async function onRemove(id: string) {
  await confirm('确定删除该 Analysis？', '确认')
  await store.removeAnalysis(id)
  toast('success', '已删除')
}
</script>

<style scoped>
.list-page {
  max-width: 960px;
  margin: 0 auto;
  padding: 32px 20px;
}
.top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
  gap: 16px;
}
.top-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}
h1 {
  margin: 0 0 6px;
  font-size: 28px;
}
.sub {
  margin: 0;
  color: #646a73;
}
.toolbar {
  margin-bottom: 12px;
}
.filter select {
  width: 220px;
  max-width: 100%;
  height: 32px;
  padding: 0 10px;
  border: 1px solid var(--ia-border);
  border-radius: 6px;
  background: #fff;
  color: inherit;
}
.btn {
  height: 32px;
  padding: 0 14px;
  border: 1px solid var(--ia-border);
  border-radius: 6px;
  background: #fff;
  color: #1f2329;
  cursor: pointer;
}
.btn:hover {
  border-color: var(--ia-accent);
  color: var(--ia-accent);
}
.btn-primary {
  background: var(--ia-accent);
  border-color: var(--ia-accent);
  color: #fff;
}
.btn-primary:hover {
  filter: brightness(1.05);
  color: #fff;
}
.analysis-table {
  width: 100%;
  border-collapse: collapse;
  background: #fff;
  border: 1px solid var(--ia-border);
  border-radius: 8px;
  overflow: hidden;
}
.analysis-table th,
.analysis-table td {
  padding: 12px 14px;
  text-align: left;
  border-bottom: 1px solid var(--ia-border);
  font-size: 14px;
}
.analysis-table th {
  background: #f7f8fa;
  font-weight: 600;
  color: #646a73;
}
.analysis-table tbody tr {
  cursor: pointer;
}
.analysis-table tbody tr:nth-child(even) {
  background: #fafbfc;
}
.analysis-table tbody tr:hover {
  background: var(--ia-accent-soft);
}
.analysis-table tbody tr:focus-visible {
  outline: 2px solid var(--ia-accent);
  outline-offset: -2px;
}
.link-danger {
  border: none;
  background: none;
  padding: 0;
  color: #c45656;
  cursor: pointer;
  font: inherit;
}
.link-danger:hover {
  text-decoration: underline;
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
.empty-list {
  margin-top: 48px;
  text-align: center;
  color: #646a73;
  padding: 32px 16px;
  background: linear-gradient(180deg, #fff 0%, #f7f8fa 100%);
  border: 1px dashed var(--ia-border);
  border-radius: 8px;
}
.empty-list p {
  margin: 0;
}
@media (max-width: 640px) {
  .top {
    flex-direction: column;
  }
  .top-actions {
    width: 100%;
    flex-wrap: wrap;
  }
}
</style>
