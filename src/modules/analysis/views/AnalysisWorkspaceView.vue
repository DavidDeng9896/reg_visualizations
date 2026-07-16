<template>
  <div v-if="store.current" class="workspace">
    <a class="skip-link" href="#workspace-main">跳到主内容</a>
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

    <!--
      DOM 顺序：主区 → 分隔条 → 侧栏；CSS order 保持侧栏在左。
      键盘 Tab 优先进入工具栏/表图，再回侧栏导航（a11y）。
    -->
    <div class="body">
      <main id="workspace-main" class="main" tabindex="-1">
        <FlowchartCanvas v-if="store.mainMode === 'flowchart'" :focus-id="focusId" />
        <TableChartWorkspace v-else />
      </main>
      <div
        class="sidebar-splitter"
        role="separator"
        aria-orientation="vertical"
        aria-label="拖拽调整侧栏宽度"
        :aria-valuenow="sidebarWidth"
        :aria-valuemin="MIN_SIDEBAR_WIDTH"
        :aria-valuemax="MAX_SIDEBAR_WIDTH"
        :aria-valuetext="`侧栏宽度 ${sidebarWidth} 像素`"
        tabindex="0"
        @pointerdown="onSidebarDown"
        @keydown="onSidebarKey"
      />
      <div class="sidebar-slot" :style="{ width: `${sidebarWidth}px` }">
        <AnalysisSidebar :width="sidebarWidth" @add-data="onAddData" @jump-flowchart="onJump" />
      </div>
    </div>

    <CsvImportDialog v-model="showCsv" />
    <CombineTablesDialog v-model="showCombine" />
  </div>
  <div v-else class="loading">加载中…</div>
</template>

<script setup lang="ts">
import { defineAsyncComponent, getCurrentInstance, onMounted, onUnmounted, ref } from 'vue'
import { useAnalysisStore } from '@/modules/analysis/stores/analysisStore'
import { getProjectName } from '@/shared/mock/projects'
import AnalysisSidebar from '@/modules/sidebar/AnalysisSidebar.vue'
import FlowchartCanvas from '@/modules/flowchart/FlowchartCanvas.vue'
import TableChartWorkspace from '@/modules/table/TableChartWorkspace.vue'
import { setupVxe } from '@/modules/plugins/vxe'
import { toast } from '@/shared/ui/feedback'
import {
  clampSidebarWidth,
  loadSidebarWidth,
  saveSidebarWidth,
  MIN_SIDEBAR_WIDTH,
  MAX_SIDEBAR_WIDTH,
} from '@/modules/sidebar/sidebarPrefs'

const app = getCurrentInstance()?.appContext.app
if (app) setupVxe(app)

const CsvImportDialog = defineAsyncComponent(() => import('@/modules/table/CsvImportDialog.vue'))
const CombineTablesDialog = defineAsyncComponent(() => import('@/modules/table/CombineTablesDialog.vue'))

const props = defineProps<{ analysisId: string }>()
const store = useAnalysisStore()
const showCsv = ref(false)
const showCombine = ref(false)
const focusId = ref<string | null>(null)
const sidebarWidth = ref(loadSidebarWidth())
const draggingSidebar = ref(false)

onMounted(async () => {
  // Preserve in-memory selection when navigating right after local mutations
  const preferred = store.current?.id === props.analysisId ? store.selectedNodeId : null
  await store.openAnalysis(props.analysisId, { selectNodeId: preferred })
  if (!store.current) toast('error', 'Analysis 不存在')
})

onUnmounted(() => {
  window.removeEventListener('pointermove', onSidebarMove)
  window.removeEventListener('pointerup', onSidebarUp)
})

function stub(name: string) {
  toast('info', `${name}：后续版本`)
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

function persistSidebar(width: number) {
  sidebarWidth.value = clampSidebarWidth(width)
  saveSidebarWidth(sidebarWidth.value)
}

function onSidebarDown(e: PointerEvent) {
  e.preventDefault()
  draggingSidebar.value = true
  ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
  window.addEventListener('pointermove', onSidebarMove)
  window.addEventListener('pointerup', onSidebarUp)
}

function onSidebarMove(e: PointerEvent) {
  if (!draggingSidebar.value) return
  sidebarWidth.value = clampSidebarWidth(e.clientX)
}

function onSidebarUp() {
  if (!draggingSidebar.value) return
  draggingSidebar.value = false
  window.removeEventListener('pointermove', onSidebarMove)
  window.removeEventListener('pointerup', onSidebarUp)
  persistSidebar(sidebarWidth.value)
}

function onSidebarKey(e: KeyboardEvent) {
  const step = e.shiftKey ? 24 : 12
  if (e.key === 'ArrowLeft') {
    e.preventDefault()
    persistSidebar(sidebarWidth.value - step)
  } else if (e.key === 'ArrowRight') {
    e.preventDefault()
    persistSidebar(sidebarWidth.value + step)
  } else if (e.key === 'Home') {
    e.preventDefault()
    persistSidebar(MIN_SIDEBAR_WIDTH)
  } else if (e.key === 'End') {
    e.preventDefault()
    persistSidebar(MAX_SIDEBAR_WIDTH)
  }
}
</script>

<style scoped>
.workspace {
  height: 100%;
  display: flex;
  flex-direction: column;
  position: relative;
}
.skip-link {
  position: absolute;
  left: -9999px;
  top: 0;
  z-index: 30;
  padding: 8px 12px;
  background: var(--ia-accent);
  color: #fff;
  font-size: 13px;
  text-decoration: none;
  border-radius: 0 0 4px 0;
}
.skip-link:focus {
  left: 0;
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
.sidebar-slot {
  order: 0;
  flex: 0 0 auto;
  min-width: 0;
  display: flex;
}
.sidebar-slot :deep(.sidebar) {
  width: 100% !important;
}
.sidebar-splitter {
  flex: 0 0 5px;
  order: 1;
  cursor: col-resize;
  background: var(--ia-border);
  transition: background 0.15s ease;
  z-index: 2;
}
.sidebar-splitter:hover,
.sidebar-splitter:focus-visible {
  background: var(--ia-accent);
  outline: none;
}
.main {
  flex: 1;
  order: 2;
  min-width: 0;
  background: #f0f2f5;
}
.loading {
  padding: 40px;
  text-align: center;
}
</style>
