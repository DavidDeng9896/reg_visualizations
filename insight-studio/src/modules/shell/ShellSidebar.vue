<script setup lang="ts">
import { computed, defineAsyncComponent, onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import type { Analysis, Dashboard } from '../../shared/types'
import { analysisRepository } from '../../shared/repository'
import { dashboardRepository } from '../../shared/dashboardRepository'
import { createEmptyAnalysis } from '../../shared/factories'
import { onAnalysesPossiblyChanged } from '../../shared/ensureProjectDemoSeed'
import { PROJECTS, DEPARTMENTS, projectLabel, departmentLabel } from '../../shared/org'
import { useDashboardStore } from '../../stores/dashboardStore'
import { useAnalysisStore } from '../../stores/analysisStore'
import { IButton, IEmptyState, IIcon, IModal, IPopover, ISelect, ITextField, toast } from '../../ui'
import AddDataMenu from '../workspace/AddDataMenu.vue'
import { useAddData } from './useAddData'

// 重依赖（xlsx/alasql/CodeMirror/papaparse）不进首屏 entry，按需异步加载
const SidebarTree = defineAsyncComponent(() => import('../workspace/SidebarTree.vue'))
const CsvImportDialog = defineAsyncComponent(() => import('../table/CsvImportDialog.vue'))
const ExcelImportDialog = defineAsyncComponent(() => import('../table/ExcelImportDialog.vue'))
const SqlImportDialog = defineAsyncComponent(() => import('../table/SqlImportDialog.vue'))
const CombineTablesDialog = defineAsyncComponent(() => import('../table/CombineTablesDialog.vue'))

/**
 * 二级侧栏（明度风格，宽 220px）。
 * - 顶部「看板 / 分析」分段切换；
 * - 看板：搜索 + 新建 + 看板卡片列表（点击切换看板）；
 * - 分析：搜索 + 新建 + 分析卡片列表（点击进入下一级）；
 * - 进入分析后：面包屑「< 分析 / 名称」+ 搜索 + Add data + 数据流节点树。
 */
const route = useRoute()
const router = useRouter()
const dashStore = useDashboardStore()
const analysisStore = useAnalysisStore()
const { sortedItems, currentId } = storeToRefs(dashStore)
const { current: currentAnalysis } = storeToRefs(analysisStore)
const { open: addDataOpen, closeMenu: closeAddData } = useAddData()

/* ------------------------------- 模式 ------------------------------- */
type Pane = 'dashboard' | 'analysis-list' | 'analysis-detail'
const pane = computed<Pane>(() => {
  if (route.path.startsWith('/dashboards')) return 'dashboard'
  if (route.path.startsWith('/analysis/')) return 'analysis-detail'
  return 'analysis-list'
})
const seg = computed<'dashboard' | 'analysis'>(() => (pane.value === 'dashboard' ? 'dashboard' : 'analysis'))

function goDashboards() {
  const id = dashStore.lastId() ?? sortedItems.value[0]?.id
  void router.push(id ? `/dashboards/${id}` : '/dashboards')
}
function goAnalyses() {
  void router.push('/')
}

/* ------------------------------- 搜索 ------------------------------- */
const query = ref('')

/* ------------------------------- 项目/部门筛选 ------------------------------- */
/** '' = 全部；'__none__' = 未分配；其余为项目代码/部门 id。 */
const UNASSIGNED = '__none__'
const selProject = ref('')
const selDepartment = ref('')

const projectOptions = [
  { value: '', label: '全部项目' },
  { value: UNASSIGNED, label: '未分配' },
  ...PROJECTS.map((p) => ({ value: p.code, label: `${p.code} · ${p.name}` })),
]
const departmentOptions = [
  { value: '', label: '全部部门' },
  { value: UNASSIGNED, label: '未分配' },
  ...DEPARTMENTS.map((d) => ({ value: d.id, label: d.name })),
]

function matchOrg(item: { project?: string; department?: string }): boolean {
  const p = selProject.value
  const d = selDepartment.value
  if (p && (p === UNASSIGNED ? !!item.project : item.project !== p)) return false
  if (d && (d === UNASSIGNED ? !!item.department : item.department !== d)) return false
  return true
}

/* ------------------------------- 看板列表 ------------------------------- */
const visibleDashboards = computed(() => {
  const q = query.value.trim().toLowerCase()
  return sortedItems.value.filter((d) => matchOrg(d) && (!q || d.name.toLowerCase().includes(q)))
})

function selectDashboard(id: string) {
  void router.push(`/dashboards/${id}`)
}

/* ------------------------------- 分析列表 ------------------------------- */
const analyses = ref<Analysis[]>([])
const analysesLoading = ref(true)

async function refreshAnalyses() {
  analysesLoading.value = true
  try {
    analyses.value = await analysisRepository.list()
  } finally {
    analysesLoading.value = false
  }
}
onMounted(() => {
  void refreshAnalyses()
})
// AppShell seed 完成后刷新，避免与首次 list 竞态仍显示空
const stopSeedWatch = onAnalysesPossiblyChanged(() => {
  void refreshAnalyses()
})
onBeforeUnmount(stopSeedWatch)
// 路由变化时刷新（新建/删除/重命名后回到列表能保持最新）
watch(() => route.fullPath, () => {
  if (pane.value !== 'analysis-detail') void refreshAnalyses()
})

const sortedAnalyses = computed(() =>
  analyses.value.slice().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
)
const visibleAnalyses = computed(() => {
  const q = query.value.trim().toLowerCase()
  return sortedAnalyses.value.filter((a) => matchOrg(a) && (!q || a.name.toLowerCase().includes(q)))
})

function openAnalysis(id: string) {
  void router.push(`/analysis/${id}`)
}

/* ------------------------------- 新建 ------------------------------- */
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
    const org = { project: createProject.value, department: createDepartment.value }
    if (pane.value === 'dashboard') {
      const d = await dashStore.create(name, org)
      createOpen.value = false
      void router.push(`/dashboards/${d.id}`)
    } else {
      const a = createEmptyAnalysis(name, org)
      await analysisRepository.put(a)
      createOpen.value = false
      void router.push(`/analysis/${a.id}`)
    }
  } finally {
    creating.value = false
  }
}

/* ------------------------------- 重命名 ------------------------------- */
const renameOpen = ref(false)
const renameKind = ref<'dashboard' | 'analysis'>('analysis')
const renameId = ref('')
const renameName = ref('')

function openRenameDashboard(d: Dashboard) {
  renameKind.value = 'dashboard'
  renameId.value = d.id
  renameName.value = d.name
  renameOpen.value = true
}
function openRenameAnalysis(a: Analysis) {
  renameKind.value = 'analysis'
  renameId.value = a.id
  renameName.value = a.name
  renameOpen.value = true
}

async function submitRename() {
  const name = renameName.value.trim()
  if (!name) return
  if (renameKind.value === 'dashboard') {
    if (currentId.value === renameId.value) {
      await dashStore.rename(name)
    } else {
      const d = await dashboardRepository.get(renameId.value)
      if (d) {
        d.name = name
        d.updatedAt = new Date().toISOString()
        await dashboardRepository.put(d)
        await dashStore.loadList()
      }
    }
  } else if (currentAnalysis.value?.id === renameId.value) {
    analysisStore.rename(name)
  } else {
    const a = await analysisRepository.get(renameId.value)
    if (a) {
      a.name = name
      a.updatedAt = new Date().toISOString()
      await analysisRepository.put(a)
    }
  }
  renameOpen.value = false
  toast.success('已重命名')
  await refreshAnalyses()
}

/* ------------------------------- 删除 ------------------------------- */
const deleteOpen = ref(false)
const deleteKind = ref<'dashboard' | 'analysis'>('analysis')
const deleteId = ref('')
const deleteName = ref('')

function openDeleteDashboard(d: Dashboard) {
  deleteKind.value = 'dashboard'
  deleteId.value = d.id
  deleteName.value = d.name
  deleteOpen.value = true
}
function openDeleteAnalysis(a: Analysis) {
  deleteKind.value = 'analysis'
  deleteId.value = a.id
  deleteName.value = a.name
  deleteOpen.value = true
}

async function confirmDelete() {
  if (deleteKind.value === 'dashboard') {
    const wasCurrent = currentId.value === deleteId.value
    const next = await dashStore.remove(deleteId.value)
    if (wasCurrent) void router.push(next ? `/dashboards/${next}` : '/dashboards')
  } else {
    await analysisRepository.delete(deleteId.value)
    if (currentAnalysis.value?.id === deleteId.value) void router.replace('/')
    await refreshAnalyses()
  }
  deleteOpen.value = false
  toast.success(`已删除「${deleteName.value}」`)
}

/* 卡片 ⋯ 菜单 */
const menuFor = ref<string | null>(null)
function toggleMenu(id: string) {
  menuFor.value = menuFor.value === id ? null : id
}

/* ------------------------------- Add data（分析详情模式） ------------------------------- */
const csvImportOpen = ref(false)
const excelImportOpen = ref(false)
const sqlImportOpen = ref(false)
const combineOpen = ref(false)

function openCsvImport() {
  closeAddData()
  csvImportOpen.value = true
}
function openExcelImport() {
  closeAddData()
  excelImportOpen.value = true
}
function openSqlImport() {
  closeAddData()
  sqlImportOpen.value = true
}
function openCombine() {
  closeAddData()
  combineOpen.value = true
}
</script>

<template>
  <aside class="side" aria-label="二级侧栏">
    <!-- 看板 / 分析 分段切换 -->
    <div class="side__seg" role="tablist" aria-label="看板与分析切换">
      <button
        type="button"
        role="tab"
        class="side__seg-item"
        :class="{ 'side__seg-item--on': seg === 'dashboard' }"
        :aria-selected="seg === 'dashboard'"
        @click="goDashboards"
      >
        <IIcon name="grid" :size="15" />
        <span>看板</span>
      </button>
      <button
        type="button"
        role="tab"
        class="side__seg-item"
        :class="{ 'side__seg-item--on': seg === 'analysis' }"
        :aria-selected="seg === 'analysis'"
        @click="goAnalyses"
      >
        <IIcon name="database" :size="15" />
        <span>分析</span>
      </button>
    </div>

    <!-- 分析详情模式：面包屑 -->
    <button v-if="pane === 'analysis-detail'" type="button" class="side__crumb" @click="goAnalyses">
      <IIcon name="chevron-left" :size="14" class="side__crumb-back" />
      <span class="side__crumb-parent">分析</span>
      <span class="side__crumb-sep">/</span>
      <span class="side__crumb-current is-ellipsis">{{ currentAnalysis?.name ?? '…' }}</span>
    </button>

    <!-- 搜索 + 「+」 -->
    <div class="side__tools">
      <div class="side__search">
        <input
          v-model="query"
          type="search"
          class="side__search-input"
          placeholder="快速搜索"
          aria-label="快速搜索"
        />
        <IIcon name="search" :size="14" class="side__search-icon" />
      </div>

      <IPopover
        v-if="pane === 'analysis-detail'"
        :open="addDataOpen"
        placement="bottom-start"
        :arrow="true"
        @update:open="addDataOpen = $event"
      >
        <template #anchor>
          <button type="button" class="side__add" aria-label="Add data" title="Add data" @click="addDataOpen = !addDataOpen">
            <IIcon name="plus" :size="15" />
          </button>
        </template>
        <template #default>
          <AddDataMenu
            @import-csv="openCsvImport"
            @import-excel="openExcelImport"
            @import-sql="openSqlImport"
            @combine="openCombine"
          />
        </template>
      </IPopover>
      <button
        v-else
        type="button"
        class="side__add"
        :aria-label="pane === 'dashboard' ? '新建看板' : '新建分析'"
        :title="pane === 'dashboard' ? '新建看板' : '新建分析'"
        @click="openCreate"
      >
        <IIcon name="plus" :size="15" />
      </button>
    </div>

    <!-- 列表模式：项目/部门筛选 -->
    <div v-if="pane !== 'analysis-detail'" class="side__filters">
      <ISelect v-model="selProject" :options="projectOptions" aria-label="按项目筛选" class="side__filter" />
      <ISelect v-model="selDepartment" :options="departmentOptions" aria-label="按部门筛选" class="side__filter" />
    </div>

    <!-- 看板卡片列表 -->
    <div v-if="pane === 'dashboard'" class="side__list">
      <IEmptyState
        v-if="!visibleDashboards.length"
        icon="grid"
        :title="query ? '没有匹配的看板' : '还没有看板'"
        description="点击上方 + 新建看板。"
        class="side__empty"
      />
      <article
        v-for="d in visibleDashboards"
        :key="d.id"
        class="card"
        :class="{ 'card--on': d.id === currentId }"
        tabindex="0"
        role="link"
        data-testid="dashboard-card"
        :aria-label="`打开看板 ${d.name}`"
        @click="selectDashboard(d.id)"
        @keydown.enter="selectDashboard(d.id)"
      >
        <div class="card__head">
          <h3 class="card__name" :title="d.name">{{ d.name }}</h3>
          <IPopover :open="menuFor === d.id" placement="bottom-end" :arrow="false" @update:open="menuFor = $event ? d.id : null">
            <template #anchor>
              <button type="button" class="card__menu" aria-label="更多操作" @click.stop="toggleMenu(d.id)">
                <IIcon name="more" :size="15" />
              </button>
            </template>
            <template #default="{ close }">
              <div class="menu" role="menu">
                <button type="button" class="menu__item" role="menuitem" @click.stop="close(); openRenameDashboard(d)">
                  <IIcon name="edit" :size="13" /> 重命名
                </button>
                <button type="button" class="menu__item menu__item--danger" role="menuitem" @click.stop="close(); openDeleteDashboard(d)">
                  <IIcon name="trash" :size="13" /> 删除
                </button>
              </div>
            </template>
          </IPopover>
        </div>
        <p class="card__meta">{{ projectLabel(d.project) }}</p>
        <p class="card__meta">{{ departmentLabel(d.department) }}</p>
      </article>
    </div>

    <!-- 分析卡片列表 -->
    <div v-else-if="pane === 'analysis-list'" class="side__list">
      <IEmptyState
        v-if="!analysesLoading && !visibleAnalyses.length"
        icon="database"
        :title="query ? '没有匹配的分析' : '还没有分析'"
        description="点击上方 + 新建分析。"
        class="side__empty"
      />
      <article
        v-for="a in visibleAnalyses"
        :key="a.id"
        class="card"
        tabindex="0"
        role="link"
        data-testid="analysis-card"
        :aria-label="`打开分析 ${a.name}`"
        @click="openAnalysis(a.id)"
        @keydown.enter="openAnalysis(a.id)"
      >
        <div class="card__head">
          <h3 class="card__name" :title="a.name">{{ a.name }}</h3>
          <IPopover :open="menuFor === a.id" placement="bottom-end" :arrow="false" @update:open="menuFor = $event ? a.id : null">
            <template #anchor>
              <button type="button" class="card__menu" aria-label="更多操作" @click.stop="toggleMenu(a.id)">
                <IIcon name="more" :size="15" />
              </button>
            </template>
            <template #default="{ close }">
              <div class="menu" role="menu">
                <button type="button" class="menu__item" role="menuitem" @click.stop="close(); openRenameAnalysis(a)">
                  <IIcon name="edit" :size="13" /> 重命名
                </button>
                <button type="button" class="menu__item menu__item--danger" role="menuitem" @click.stop="close(); openDeleteAnalysis(a)">
                  <IIcon name="trash" :size="13" /> 删除
                </button>
              </div>
            </template>
          </IPopover>
        </div>
        <p class="card__meta">{{ projectLabel(a.project) }}</p>
        <p class="card__meta">{{ departmentLabel(a.department) }}</p>
      </article>
    </div>

    <!-- 分析详情模式：数据流节点树 -->
    <SidebarTree v-else :search="query" />

    <!-- 新建 -->
    <IModal
      :open="createOpen"
      :title="pane === 'dashboard' ? '新建看板' : '新建分析'"
      :width="420"
      @update:open="createOpen = $event"
    >
      <label class="form-row">
        <span class="form-row__label">名称</span>
        <ITextField
          v-model="createName"
          :placeholder="pane === 'dashboard' ? '例如：细胞培养总览' : '例如：Binding assay analysis'"
          autofocus
          @enter="submitCreate"
        />
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

    <!-- 重命名 -->
    <IModal :open="renameOpen" title="重命名" :width="420" @update:open="renameOpen = $event">
      <ITextField v-model="renameName" autofocus @enter="submitRename" />
      <template #footer>
        <IButton @click="renameOpen = false">取消</IButton>
        <IButton variant="primary" :disabled="!renameName.trim()" @click="submitRename">保存</IButton>
      </template>
    </IModal>

    <!-- 删除确认 -->
    <IModal
      :open="deleteOpen"
      :title="deleteKind === 'dashboard' ? '删除看板' : '删除分析'"
      :width="420"
      @update:open="deleteOpen = $event"
    >
      <p class="confirm-text">确定删除「{{ deleteName }}」吗？此操作不可撤销。</p>
      <template #footer>
        <IButton @click="deleteOpen = false">取消</IButton>
        <IButton variant="danger" @click="confirmDelete">删除</IButton>
      </template>
    </IModal>

    <!-- 数据导入 / 表合并（分析详情模式） -->
    <template v-if="pane === 'analysis-detail'">
      <CsvImportDialog :open="csvImportOpen" @update:open="csvImportOpen = $event" />
      <ExcelImportDialog :open="excelImportOpen" @update:open="excelImportOpen = $event" />
      <SqlImportDialog :open="sqlImportOpen" @update:open="sqlImportOpen = $event" />
      <CombineTablesDialog :open="combineOpen" @update:open="combineOpen = $event" />
    </template>
  </aside>
</template>

<style scoped>
.side {
  width: 220px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: var(--is-surface);
  border-right: 1px solid var(--is-border);
}

/* ---- 看板/分析 分段 ---- */
.side__seg {
  display: flex;
  gap: 2px;
  margin: 12px 12px 0;
  padding: 3px;
  border-radius: var(--is-radius);
  background: #eaecf0;
  flex-shrink: 0;
}
.side__seg-item {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 30px;
  border: none;
  border-radius: var(--is-radius-sm);
  background: transparent;
  color: var(--is-text-secondary);
  font-size: var(--is-text-sm);
  cursor: pointer;
  transition:
    background var(--is-dur-fast) var(--is-ease),
    color var(--is-dur-fast) var(--is-ease),
    box-shadow var(--is-dur-fast) var(--is-ease);
}
.side__seg-item:hover {
  color: var(--is-text);
}
.side__seg-item--on {
  background: var(--is-surface);
  color: var(--is-text);
  font-weight: 500;
  box-shadow: var(--is-shadow-sm);
}

/* ---- 面包屑（分析详情） ---- */
.side__crumb {
  display: flex;
  align-items: center;
  gap: 4px;
  margin: 10px 12px 0;
  padding: 4px 2px;
  border: none;
  background: transparent;
  font-size: var(--is-text-sm);
  text-align: left;
  cursor: pointer;
  flex-shrink: 0;
  min-width: 0;
}
.side__crumb-back {
  color: var(--is-text-secondary);
  flex-shrink: 0;
}
.side__crumb-parent {
  color: var(--is-text-secondary);
  flex-shrink: 0;
}
.side__crumb:hover .side__crumb-parent,
.side__crumb:hover .side__crumb-back {
  color: var(--is-accent);
}
.side__crumb-sep {
  color: var(--is-text-tertiary);
  flex-shrink: 0;
}
.side__crumb-current {
  font-weight: 600;
  color: var(--is-text);
  min-width: 0;
}

/* ---- 搜索 + 「+」 ---- */
.side__tools {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 10px 12px 0;
  flex-shrink: 0;
}
.side__search {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 10px;
  border-radius: var(--is-radius-sm);
  background: #f5f6f8;
}
.side__search:focus-within {
  box-shadow: var(--is-ring-sm);
}
.side__search-input {
  flex: 1;
  min-width: 0;
  border: none;
  background: transparent;
  font-size: var(--is-text-sm);
  color: var(--is-text);
  outline: none;
}
.side__search-input::placeholder {
  color: var(--is-text-tertiary);
}
.side__search-icon {
  color: var(--is-text-tertiary);
  flex-shrink: 0;
}
.side__add {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  border: 1px solid var(--is-border);
  border-radius: var(--is-radius-sm);
  background: var(--is-surface);
  color: var(--is-text-secondary);
  cursor: pointer;
  transition:
    color var(--is-dur-fast) var(--is-ease),
    border-color var(--is-dur-fast) var(--is-ease);
}
.side__add:hover {
  color: var(--is-accent);
  border-color: var(--is-accent);
}

/* ---- 项目/部门筛选 ---- */
.side__filters {
  display: flex;
  gap: 6px;
  margin: 10px 12px 0;
  flex-shrink: 0;
}
.side__filter {
  flex: 1;
  min-width: 0;
}

/* ---- 卡片列表 ---- */
.side__list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
}
.side__empty {
  padding: 24px 8px;
}
.card {
  position: relative;
  border: 1px solid #e8ecf1;
  border-radius: var(--is-radius);
  background: var(--is-surface);
  padding: 12px;
  cursor: pointer;
  transition:
    border-color var(--is-dur-fast) var(--is-ease),
    background var(--is-dur-fast) var(--is-ease);
}
.card:hover,
.card:focus-visible {
  border-color: var(--is-border-strong);
}
.card--on,
.card--on:hover {
  border-color: #7aa7f5;
  background: #f4f8ff;
}
.card__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 6px;
}
.card__name {
  margin: 0;
  font-size: var(--is-text-md);
  font-weight: 600;
  line-height: 1.4;
  color: var(--is-text);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-all;
}
.card--on .card__name {
  color: #2f7cf6;
}
.card__meta {
  margin: 4px 0 0;
  font-size: var(--is-text-xs);
  color: var(--is-text-tertiary);
}
.card__menu {
  display: inline-flex;
  padding: 3px;
  margin: -3px -3px 0 0;
  border: none;
  border-radius: var(--is-radius-sm);
  background: transparent;
  color: var(--is-text-tertiary);
  cursor: pointer;
  opacity: 0;
  transition:
    opacity var(--is-dur-fast) var(--is-ease),
    background-color var(--is-dur-fast) var(--is-ease);
}
.card:hover .card__menu,
.card:focus-within .card__menu {
  opacity: 1;
}
.card__menu:hover {
  background: var(--is-surface-hover);
  color: var(--is-text);
}

.menu {
  padding: 4px;
  display: flex;
  flex-direction: column;
  min-width: 140px;
}
.menu__item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  border: none;
  border-radius: var(--is-radius-sm);
  background: transparent;
  font-size: var(--is-text-sm);
  text-align: left;
  color: var(--is-text);
  cursor: pointer;
}
.menu__item:hover {
  background: var(--is-surface-hover);
}
.menu__item--danger {
  color: var(--is-danger);
}
.menu__item--danger:hover {
  background: var(--is-danger-soft);
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
.confirm-text {
  font-size: var(--is-text-sm);
  color: var(--is-text-secondary);
  line-height: 1.6;
}
</style>
