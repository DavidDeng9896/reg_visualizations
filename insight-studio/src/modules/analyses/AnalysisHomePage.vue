<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref } from 'vue'
import { useRouter } from 'vue-router'
import type { Analysis } from '../../shared/types'
import { analysisRepository } from '../../shared/repository'
import { createEmptyAnalysis } from '../../shared/factories'
import { PROJECTS, DEPARTMENTS, projectLabel, departmentLabel } from '../../shared/org'
import { createDemoAnalysis } from '../../shared/seed'
import { createProjectDemoAnalyses } from '../../shared/demoProjects'
import { onAnalysesPossiblyChanged, seedProjectDemos } from '../../shared/ensureProjectDemoSeed'
import { countAnalysisViews } from '../../shared/tree'
import { formatRelative } from '../../shared/datetime'
import { IButton, IEmptyState, IIcon, IModal, ISelect, ITextField, toast } from '../../ui'

/** 分析首页（/）：无数据时缺省引导；有数据时主区网格展示分析卡片。 */
const router = useRouter()

const listLoading = ref(true)
const analyses = ref<Analysis[]>([])
const query = ref('')
const isEmpty = computed(() => !listLoading.value && analyses.value.length === 0)

const visible = computed(() => {
  const q = query.value.trim().toLowerCase()
  return analyses.value
    .slice()
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .filter((a) => !q || a.name.toLowerCase().includes(q))
})

function stats(a: Analysis): { tables: number; views: number } {
  return { tables: a.tables.length, views: countAnalysisViews(a) }
}

async function refreshList() {
  listLoading.value = true
  try {
    analyses.value = await analysisRepository.list()
  } finally {
    listLoading.value = false
  }
}

onMounted(() => {
  void refreshList()
})
const stopSeedWatch = onAnalysesPossiblyChanged(() => {
  void refreshList()
})
onBeforeUnmount(stopSeedWatch)

function openAnalysis(id: string) {
  void router.push(`/analysis/${id}`)
}

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

/* 生成项目示例数据（覆盖写入；与启动 ensure 共用写入路径） */
const projectsLoading = ref(false)
async function createProjectDemos() {
  if (projectsLoading.value) return
  projectsLoading.value = true
  try {
    const result = await seedProjectDemos({ force: true })
    const count = result.count ?? 0
    toast.success(`已生成 ${count} 个抗体业务示例分析`)
    const firstId = createProjectDemoAnalyses()[0]?.id
    if (firstId) router.push(`/analysis/${firstId}`)
  } finally {
    projectsLoading.value = false
  }
}
</script>

<template>
  <div class="home">
    <IEmptyState
      v-if="isEmpty"
      icon="database"
      title="选择或新建分析"
      description="从左侧列表选择一个分析进入数据流，或新建空白分析开始探索。"
    >
      <IButton variant="primary" icon="plus" @click="openCreate">New analysis</IButton>
      <IButton icon="database" :loading="demoLoading" @click="createDemo">一键 Demo</IButton>
      <IButton icon="grid" :loading="projectsLoading" @click="createProjectDemos">生成项目示例数据</IButton>
    </IEmptyState>

    <div v-else class="home__filled">
      <header class="home__bar">
        <div class="home__bar-title">
          <h2 class="home__heading">分析</h2>
          <span class="home__count">{{ listLoading ? '…' : `${analyses.length} 个` }}</span>
        </div>
        <div class="home__bar-actions">
          <ITextField v-model="query" placeholder="搜索分析…" prefix-icon="search" clearable size="sm" />
          <IButton variant="primary" icon="plus" @click="openCreate">New analysis</IButton>
        </div>
      </header>

      <div v-if="listLoading && !analyses.length" class="home__loading" role="status">加载中…</div>
      <p v-else-if="!visible.length" class="home__none">没有匹配的分析</p>
      <div v-else class="home__grid">
        <article
          v-for="a in visible"
          :key="a.id"
          class="home-card"
          tabindex="0"
          role="link"
          data-testid="analysis-home-card"
          :aria-label="`打开分析 ${a.name}`"
          @click="openAnalysis(a.id)"
          @keydown.enter="openAnalysis(a.id)"
        >
          <div class="home-card__head">
            <h3 class="home-card__name" :title="a.name">{{ a.name }}</h3>
            <IButton size="sm" variant="secondary" @click.stop="openAnalysis(a.id)">打开</IButton>
          </div>
          <p class="home-card__meta">{{ projectLabel(a.project) }}</p>
          <p class="home-card__meta">{{ departmentLabel(a.department) }}</p>
          <p class="home-card__stats">
            <span><IIcon name="table" :size="13" /> {{ stats(a).tables }} 张表</span>
            <span><IIcon name="bar" :size="13" /> {{ stats(a).views }} 个视图</span>
            <span :title="a.updatedAt">{{ formatRelative(a.updatedAt) }}</span>
          </p>
        </article>
      </div>
    </div>

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
  flex-direction: column;
  min-height: 0;
  background: var(--is-bg);
}
.home__filled {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.home__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 24px 12px;
  flex-shrink: 0;
}
.home__bar-title {
  display: flex;
  align-items: baseline;
  gap: 10px;
  min-width: 0;
}
.home__heading {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}
.home__count {
  font-size: var(--is-text-sm);
  color: var(--is-text-tertiary);
}
.home__bar-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
.home__bar-actions :deep(.is-field) {
  width: 220px;
}
.home__loading,
.home__none {
  margin: 48px 24px;
  text-align: center;
  color: var(--is-text-secondary);
  font-size: var(--is-text-sm);
}
.home__grid {
  flex: 1;
  min-height: 0;
  overflow: auto;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 12px;
  align-content: start;
  padding: 4px 24px 32px;
}
.home-card {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 14px 16px;
  background: var(--is-surface);
  border: 1px solid var(--is-border);
  border-radius: var(--is-radius);
  cursor: pointer;
  transition:
    border-color var(--is-dur-fast) var(--is-ease),
    box-shadow var(--is-dur-fast) var(--is-ease);
}
.home-card:hover,
.home-card:focus-visible {
  border-color: var(--is-accent);
  box-shadow: var(--is-shadow-sm);
  outline: none;
}
.home-card__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}
.home-card__name {
  margin: 0;
  font-size: var(--is-text-md);
  font-weight: 600;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.home-card__meta {
  margin: 0;
  font-size: var(--is-text-xs);
  color: var(--is-text-secondary);
}
.home-card__stats {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 14px;
  margin: 8px 0 0;
  font-size: var(--is-text-xs);
  color: var(--is-text-tertiary);
}
.home-card__stats span {
  display: inline-flex;
  align-items: center;
  gap: 4px;
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
