<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { analysisRepository } from '../../shared/repository'
import { createEmptyAnalysis } from '../../shared/factories'
import { PROJECTS, DEPARTMENTS } from '../../shared/org'
import { createDemoAnalysis } from '../../shared/seed'
import { createProjectDemoAnalyses, LEGACY_DEMO_IDS } from '../../shared/demoProjects'
import { IButton, IEmptyState, IModal, ISelect, ITextField, toast } from '../../ui'

/** 分析首页（/）：空态引导页。分析列表在左侧二级侧栏。 */
const router = useRouter()

/* 新建 */
const createOpen = ref(false)
const createName = ref('')
const createProject = ref(PROJECTS[0].code)
const createDepartment = ref(DEPARTMENTS[0].id)
const creating = ref(false)

function openCreate() {
  createName.value = ''
  createProject.value = PROJECTS[0].code
  createDepartment.value = DEPARTMENTS[0].id
  createOpen.value = true
}

async function submitCreate() {
  const name = createName.value.trim()
  if (!name || !createProject.value || !createDepartment.value || creating.value) return
  creating.value = true
  try {
    const analysis = createEmptyAnalysis(name, { project: createProject.value, department: createDepartment.value })
    await analysisRepository.put(analysis)
    createOpen.value = false
    router.push(`/analysis/${analysis.id}`)
  } finally {
    creating.value = false
  }
}

/* 一键 Demo */
const demoLoading = ref(false)
async function createDemo() {
  if (demoLoading.value) return
  demoLoading.value = true
  try {
    const demo = createDemoAnalysis()
    await analysisRepository.put(demo)
    toast.success('Demo 分析已创建')
    router.push(`/analysis/${demo.id}`)
  } finally {
    demoLoading.value = false
  }
}

/* 生成项目示例数据（5 个项目各一个分析） */
const projectsLoading = ref(false)
async function createProjectDemos() {
  if (projectsLoading.value) return
  projectsLoading.value = true
  try {
    const list = createProjectDemoAnalyses()
    for (const a of list) await analysisRepository.put(a)
    // 清理旧版 5 项演示数据（如有；先查后删，避免 404 噪音）
    const existing = new Set((await analysisRepository.list()).map((a) => a.id))
    for (const id of LEGACY_DEMO_IDS) {
      if (existing.has(id)) await analysisRepository.delete(id).catch(() => undefined)
    }
    toast.success(`已生成 ${list.length} 个抗体业务示例分析`)
    router.push(`/analysis/${list[0].id}`)
  } finally {
    projectsLoading.value = false
  }
}
</script>

<template>
  <div class="home">
    <IEmptyState
      icon="database"
      title="选择或新建分析"
      description="从左侧列表选择一个分析进入数据流，或新建空白分析开始探索。"
    >
      <IButton variant="primary" icon="plus" @click="openCreate">New analysis</IButton>
      <IButton icon="database" :loading="demoLoading" @click="createDemo">一键 Demo</IButton>
      <IButton icon="grid" :loading="projectsLoading" @click="createProjectDemos">生成项目示例数据</IButton>
    </IEmptyState>

    <!-- 新建 -->
    <IModal :open="createOpen" title="新建 Analysis" :width="420" @update:open="createOpen = $event">
      <label class="form-row">
        <span class="form-row__label">名称</span>
        <ITextField v-model="createName" placeholder="例如：Binding assay analysis" autofocus @enter="submitCreate" />
      </label>
      <label class="form-row">
        <span class="form-row__label">项目</span>
        <ISelect v-model="createProject" :options="PROJECTS.map((p) => ({ value: p.code, label: `${p.code} · ${p.name}` }))" aria-label="所属项目" />
      </label>
      <label class="form-row">
        <span class="form-row__label">部门</span>
        <ISelect v-model="createDepartment" :options="DEPARTMENTS.map((d) => ({ value: d.id, label: d.name }))" aria-label="所属部门" />
      </label>
      <template #footer>
        <IButton @click="createOpen = false">取消</IButton>
        <IButton variant="primary" :disabled="!createName.trim()" :loading="creating" @click="submitCreate">创建</IButton>
      </template>
    </IModal>
  </div>
</template>

<style scoped>
.home {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--is-bg);
}
.form-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.form-row + .form-row {
  margin-top: 12px;
}
.form-row__label {
  font-size: var(--is-text-xs);
  font-weight: 600;
  color: var(--is-text-secondary);
}
</style>
