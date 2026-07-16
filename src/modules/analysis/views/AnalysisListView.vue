<template>
  <div class="list-page">
    <header class="top">
      <div>
        <h1>Insight Analysis</h1>
        <p class="sub">本地数据工作空间 · 导入 · 转换 · 可视化</p>
      </div>
      <div class="top-actions">
        <el-button @click="createDemo">一键 Demo（含示例数据）</el-button>
        <el-button type="primary" @click="showCreate = true">+ 创建 Analysis</el-button>
      </div>
    </header>

    <div class="toolbar">
      <el-select v-model="projectFilter" clearable placeholder="按项目筛选" style="width: 220px">
        <el-option v-for="p in MOCK_PROJECTS" :key="p.id" :label="p.name" :value="p.id" />
      </el-select>
    </div>

    <el-table
      v-if="filtered.length"
      :data="filtered"
      stripe
      style="width: 100%"
      empty-text="暂无 Analysis"
      @row-click="open"
    >
      <el-table-column prop="name" label="名称" />
      <el-table-column label="项目">
        <template #default="{ row }">{{ getProjectName(row.projectId) }}</template>
      </el-table-column>
      <el-table-column prop="updatedAt" label="更新时间" width="200">
        <template #default="{ row }">{{ formatTime(row.updatedAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="120">
        <template #default="{ row }">
          <el-button link type="danger" @click.stop="onRemove(row.id)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
    <div v-else class="empty-list">
      <p>还没有 Analysis。使用上方「一键 Demo」快速体验，或「+ 创建 Analysis」后导入 CSV。</p>
    </div>

    <el-dialog v-model="showCreate" title="创建 Analysis" width="420px">
      <el-form label-width="80px">
        <el-form-item label="名称" required>
          <el-input v-model="form.name" placeholder="例如 Dose Response" />
        </el-form-item>
        <el-form-item label="项目" required>
          <el-select v-model="form.projectId" style="width: 100%">
            <el-option v-for="p in MOCK_PROJECTS" :key="p.id" :label="p.name" :value="p.id" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreate = false">取消</el-button>
        <el-button type="primary" :disabled="!form.name || !form.projectId" @click="create">创建</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useAnalysisStore } from '@/modules/analysis/stores/analysisStore'
import { MOCK_PROJECTS, getProjectName } from '@/shared/mock/projects'
import { createDemoTable } from '@/shared/mock/demoData'

const store = useAnalysisStore()
const router = useRouter()
const showCreate = ref(false)
const projectFilter = ref<string>()
const form = reactive({ name: '', projectId: MOCK_PROJECTS[0].id })

const filtered = computed(() =>
  store.list.filter((a) => !projectFilter.value || a.projectId === projectFilter.value),
)

onMounted(() => store.loadList())

function formatTime(iso: string) {
  return new Date(iso).toLocaleString()
}

async function create() {
  const a = await store.createAnalysis(form.name.trim(), form.projectId)
  showCreate.value = false
  form.name = ''
  ElMessage.success('已创建')
  router.push(`/analyses/${a.id}`)
}

async function createDemo() {
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
  ElMessage.success('已创建 Demo Analysis')
  router.push(`/analyses/${a.id}`)
}

function open(row: { id: string }) {
  router.push(`/analyses/${row.id}`)
}

async function onRemove(id: string) {
  await ElMessageBox.confirm('确定删除该 Analysis？', '确认', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  })
  await store.removeAnalysis(id)
  ElMessage.success('已删除')
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
}
.top-actions {
  display: flex;
  gap: 8px;
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
</style>
