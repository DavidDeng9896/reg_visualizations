<template>
  <div v-if="store.current" class="workspace">
    <header class="header">
      <div class="crumbs">
        <router-link to="/">Analyses</router-link>
        <span>/</span>
        <span>{{ getProjectName(store.current.projectId) }}</span>
        <span>/</span>
        <strong>{{ store.current.name }}</strong>
        <el-tag v-if="store.saving" size="small" type="info" style="margin-left: 8px">保存中…</el-tag>
      </div>
      <div class="actions">
        <el-button :type="store.mainMode === 'flowchart' ? 'primary' : 'default'" @click="store.mainMode = 'flowchart'">
          Flowchart
        </el-button>
        <el-button @click="stub('Send output')">Send output</el-button>
        <el-dropdown trigger="click" @command="onAddData">
          <el-button type="primary">+ Add data</el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="csv">From CSV</el-dropdown-item>
              <el-dropdown-item command="combine">By combining tables</el-dropdown-item>
              <el-dropdown-item command="registry" disabled>From Registry（暂未实现）</el-dropdown-item>
              <el-dropdown-item command="plate" disabled>From Plate（暂未实现）</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </header>

    <div class="body">
      <AnalysisSidebar @add-data="onAddData" @jump-flowchart="onJump" />
      <main class="main">
        <FlowchartCanvas v-if="store.mainMode === 'flowchart'" :focus-id="focusId" />
        <TableChartWorkspace v-else />
      </main>
    </div>

    <CsvImportDialog v-model="showCsv" />
    <CombineTablesDialog v-model="showCombine" />
  </div>
  <div v-else class="loading">加载中…</div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useAnalysisStore } from '@/modules/analysis/stores/analysisStore'
import { getProjectName } from '@/shared/mock/projects'
import AnalysisSidebar from '@/modules/sidebar/AnalysisSidebar.vue'
import FlowchartCanvas from '@/modules/flowchart/FlowchartCanvas.vue'
import TableChartWorkspace from '@/modules/table/TableChartWorkspace.vue'
import CsvImportDialog from '@/modules/table/CsvImportDialog.vue'
import CombineTablesDialog from '@/modules/table/CombineTablesDialog.vue'

const props = defineProps<{ analysisId: string }>()
const store = useAnalysisStore()
const showCsv = ref(false)
const showCombine = ref(false)
const focusId = ref<string | null>(null)

onMounted(async () => {
  await store.openAnalysis(props.analysisId)
  if (!store.current) ElMessage.error('Analysis 不存在')
})

function stub(name: string) {
  ElMessage.info(`${name}：后续版本`)
}

function onAddData(cmd: string) {
  if (cmd === 'csv') showCsv.value = true
  else if (cmd === 'combine') showCombine.value = true
  else if (cmd === 'registry' || cmd === 'plate') stub(cmd)
}

function onJump(id: string) {
  focusId.value = id
  store.mainMode = 'flowchart'
}
</script>

<style scoped>
.workspace {
  height: 100%;
  display: flex;
  flex-direction: column;
}
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 16px;
  background: #fff;
  border-bottom: 1px solid var(--ia-border);
}
.crumbs {
  display: flex;
  gap: 8px;
  align-items: center;
  color: #646a73;
}
.crumbs a {
  color: var(--ia-accent);
  text-decoration: none;
}
.actions {
  display: flex;
  gap: 8px;
}
.body {
  flex: 1;
  display: flex;
  min-height: 0;
}
.main {
  flex: 1;
  min-width: 0;
  background: #f0f2f5;
}
.loading {
  padding: 40px;
  text-align: center;
}
</style>
