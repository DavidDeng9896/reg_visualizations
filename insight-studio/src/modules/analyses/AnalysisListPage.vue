<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import type { Analysis } from '../../shared/types'
import { analysisRepository } from '../../shared/repository'
import { createEmptyAnalysis } from '../../shared/factories'
import { createDemoAnalysis } from '../../shared/seed'
import { countAnalysisViews } from '../../shared/tree'
import { formatRelative } from '../../shared/datetime'
import { IButton, IBadge, IEmptyState, IModal, IPopover, ITextField, IIcon, toast } from '../../ui'

const router = useRouter()

const analyses = ref<Analysis[]>([])
const loading = ref(true)
const query = ref('')

const sorted = computed(() =>
  analyses.value.slice().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
)

const visible = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return sorted.value
  return sorted.value.filter((a) => a.name.toLowerCase().includes(q))
})

async function refresh() {
  loading.value = true
  try {
    analyses.value = await analysisRepository.list()
  } finally {
    loading.value = false
  }
}
onMounted(refresh)

/* 新建 */
const createOpen = ref(false)
const createName = ref('')
const creating = ref(false)

function openCreate() {
  createName.value = ''
  createOpen.value = true
}

async function submitCreate() {
  const name = createName.value.trim()
  if (!name || creating.value) return
  creating.value = true
  try {
    const analysis = createEmptyAnalysis(name)
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

/* 重命名 */
const renameOpen = ref(false)
const renameTarget = ref<Analysis | null>(null)
const renameName = ref('')

function openRename(a: Analysis) {
  renameTarget.value = a
  renameName.value = a.name
  renameOpen.value = true
}

async function submitRename() {
  const target = renameTarget.value
  const name = renameName.value.trim()
  if (!target || !name) return
  target.name = name
  target.updatedAt = new Date().toISOString()
  await analysisRepository.put(target)
  renameOpen.value = false
  toast.success('已重命名')
  await refresh()
}

/* 删除 */
const deleteOpen = ref(false)
const deleteTarget = ref<Analysis | null>(null)

function openDelete(a: Analysis) {
  deleteTarget.value = a
  deleteOpen.value = true
}

async function confirmDelete() {
  const target = deleteTarget.value
  if (!target) return
  await analysisRepository.delete(target.id)
  deleteOpen.value = false
  toast.success(`已删除「${target.name}」`)
  await refresh()
}

/* 卡片菜单 */
const menuFor = ref<string | null>(null)

function toggleMenu(id: string) {
  menuFor.value = menuFor.value === id ? null : id
}
</script>

<template>
  <div class="page">
    <header class="page__header">
      <div>
        <h1 class="page__title">Projects</h1>
        <p class="page__subtitle">Insight analyses</p>
      </div>
      <div class="page__actions">
        <IButton icon="database" :loading="demoLoading" @click="createDemo">一键 Demo</IButton>
        <IButton variant="primary" icon="plus" @click="openCreate">New analysis</IButton>
      </div>
    </header>

    <main class="page__body">
      <div v-if="loading" class="page__loading">加载中…</div>

      <IEmptyState
        v-else-if="!sorted.length"
        icon="folder"
        title="还没有 Analysis"
        description="新建一个空白分析，或从内置 Demo 数据开始探索。"
      >
        <IButton variant="primary" icon="plus" @click="openCreate">New analysis</IButton>
        <IButton icon="database" :loading="demoLoading" @click="createDemo">一键 Demo</IButton>
      </IEmptyState>

      <template v-else>
        <!-- 工具栏：搜索 -->
        <div class="page__toolbar">
          <ITextField
            v-model="query"
            prefix-icon="search"
            clearable
            placeholder="搜索 Analysis 名称…"
            aria-label="搜索 Analysis"
            class="page__search"
          />
        </div>

        <p v-if="!visible.length" class="page__no-result">没有匹配「{{ query.trim() }}」的 Analysis</p>

        <div v-else class="grid">
          <article
            v-for="a in visible"
            :key="a.id"
            class="card"
            tabindex="0"
            role="link"
            data-testid="analysis-card"
            :data-name="a.name"
            :aria-label="`打开 ${a.name}`"
            @click="router.push(`/analysis/${a.id}`)"
            @keydown.enter="router.push(`/analysis/${a.id}`)"
          >
            <div class="card__main">
              <div class="card__head">
                <div class="card__title-row">
                  <h3 class="card__name is-ellipsis" :title="a.name">{{ a.name }}</h3>
                  <IBadge tone="blue" class="card__badge">Analysis</IBadge>
                </div>
                <IPopover :open="menuFor === a.id" placement="bottom-end" :arrow="false" @update:open="menuFor = $event ? a.id : null">
                  <template #anchor>
                    <button
                      type="button"
                      class="card__menu-btn"
                      aria-label="更多操作"
                      @click.stop="toggleMenu(a.id)"
                    >
                      <IIcon name="more" :size="15" />
                    </button>
                  </template>
                  <template #default="{ close }">
                    <div class="menu" role="menu">
                      <button type="button" class="menu__item" role="menuitem" @click.stop="close(); openRename(a)">
                        <IIcon name="edit" :size="13" /> 重命名
                      </button>
                      <button type="button" class="menu__item menu__item--danger" role="menuitem" @click.stop="close(); openDelete(a)">
                        <IIcon name="trash" :size="13" /> 删除
                      </button>
                    </div>
                  </template>
                </IPopover>
              </div>
              <p class="card__meta">{{ a.tables.length }} 张表 · {{ countAnalysisViews(a) }} 个视图</p>
            </div>
            <div class="card__foot">
              <span class="card__time">
                <IIcon name="calendar" :size="12" />
                更新于 {{ formatRelative(a.updatedAt) }}
              </span>
            </div>
          </article>

          <!-- 新建入口卡片 -->
          <button type="button" class="card card--create" @click="openCreate">
            <span class="card__create-icon"><IIcon name="plus" :size="16" /></span>
            <span class="card__create-text">新建空白 Analysis</span>
          </button>
        </div>
      </template>
    </main>

    <!-- 新建 -->
    <IModal :open="createOpen" title="新建 Analysis" :width="420" @update:open="createOpen = $event">
      <label class="form-row">
        <span class="form-row__label">名称</span>
        <ITextField v-model="createName" placeholder="例如：Binding assay analysis" autofocus @enter="submitCreate" />
      </label>
      <template #footer>
        <IButton @click="createOpen = false">取消</IButton>
        <IButton variant="primary" :disabled="!createName.trim()" :loading="creating" @click="submitCreate">
          创建
        </IButton>
      </template>
    </IModal>

    <!-- 重命名 -->
    <IModal :open="renameOpen" title="重命名" :width="420" @update:open="renameOpen = $event">
      <label class="form-row">
        <span class="form-row__label">名称</span>
        <ITextField v-model="renameName" autofocus @enter="submitRename" />
      </label>
      <template #footer>
        <IButton @click="renameOpen = false">取消</IButton>
        <IButton variant="primary" :disabled="!renameName.trim()" @click="submitRename">保存</IButton>
      </template>
    </IModal>

    <!-- 删除确认 -->
    <IModal :open="deleteOpen" title="删除 Analysis" :width="420" @update:open="deleteOpen = $event">
      <p class="confirm-text">
        确定删除「{{ deleteTarget?.name }}」吗？其中的所有表、视图与图表配置都会被删除，此操作不可撤销。
      </p>
      <template #footer>
        <IButton @click="deleteOpen = false">取消</IButton>
        <IButton variant="danger" @click="confirmDelete">删除</IButton>
      </template>
    </IModal>
  </div>
</template>

<style scoped>
.page {
  min-height: 100%;
  display: flex;
  flex-direction: column;
}
.page__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 32px;
  background: var(--is-surface);
  border-bottom: 1px solid var(--is-border);
}
.page__title {
  font-size: 20px;
  font-weight: 600;
  letter-spacing: -0.01em;
}
.page__subtitle {
  margin-top: 2px;
  font-size: var(--is-text-sm);
  color: var(--is-text-secondary);
}
.page__actions {
  display: flex;
  gap: 8px;
}
.page__body {
  flex: 1;
  padding: 24px 32px;
}
.page__loading {
  color: var(--is-text-secondary);
  padding: 40px 0;
  text-align: center;
}
.page__toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}
.page__search {
  width: 320px;
  max-width: 100%;
}
.page__no-result {
  padding: 40px 0;
  text-align: center;
  font-size: var(--is-text-sm);
  color: var(--is-text-tertiary);
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}
.card {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 148px;
  background: var(--is-surface);
  border: 1px solid var(--is-border);
  border-radius: var(--is-radius);
  padding: 20px;
  cursor: pointer;
  text-align: left;
  transition:
    box-shadow var(--is-dur) var(--is-ease),
    border-color var(--is-dur) var(--is-ease),
    transform var(--is-dur) var(--is-ease);
}
.card:hover,
.card:focus-visible {
  border-color: var(--is-accent);
  box-shadow: var(--is-shadow-md);
  transform: translateY(-1px);
}
.card__main {
  min-width: 0;
}
.card__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
}
.card__title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.card__name {
  font-size: var(--is-text-md);
  font-weight: 600;
  transition: color var(--is-dur-fast) var(--is-ease);
}
.card:hover .card__name {
  color: var(--is-accent);
}
.card__badge {
  flex-shrink: 0;
}
.card__menu-btn {
  display: inline-flex;
  padding: 5px;
  margin: -5px -5px 0 0;
  border-radius: var(--is-radius-sm);
  color: var(--is-text-tertiary);
  opacity: 0;
  transition:
    opacity var(--is-dur-fast) var(--is-ease),
    background-color var(--is-dur-fast) var(--is-ease);
}
.card:hover .card__menu-btn,
.card:focus-within .card__menu-btn {
  opacity: 1;
}
.card__menu-btn:hover {
  background: var(--is-surface-hover);
  color: var(--is-text);
}
.card__meta {
  margin-top: 6px;
  font-size: var(--is-text-xs);
  color: var(--is-text-secondary);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.card__foot {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px dashed var(--is-border);
}
.card__time {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: var(--is-text-tertiary);
}
/* 新建入口卡片（虚线） */
.card--create {
  align-items: center;
  justify-content: center;
  gap: 12px;
  border: 2px dashed var(--is-border);
  background: transparent;
  box-shadow: none;
}
.card--create:hover,
.card--create:focus-visible {
  border-color: var(--is-accent);
  background: var(--is-surface);
  box-shadow: none;
  transform: none;
}
.card__create-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: var(--is-radius-full);
  background: var(--is-surface-hover);
  color: var(--is-text-tertiary);
  transition:
    background-color var(--is-dur-fast) var(--is-ease),
    color var(--is-dur-fast) var(--is-ease);
}
.card--create:hover .card__create-icon,
.card--create:focus-visible .card__create-icon {
  background: var(--is-accent-soft);
  color: var(--is-accent);
}
.card__create-text {
  font-size: var(--is-text-sm);
  font-weight: 500;
  color: var(--is-text-secondary);
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
  border-radius: var(--is-radius-sm);
  font-size: var(--is-text-sm);
  text-align: left;
  color: var(--is-text);
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
