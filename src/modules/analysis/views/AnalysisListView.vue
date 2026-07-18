<template>
  <div class="list-page">
    <a
      class="skip-link"
      data-ia-skip="1"
      :href="skipHref"
      v-show="listSkipVisibleWhenCreateClosed(showCreate)"
    >跳到列表</a>
    <div class="list-shell" :inert="showCreate || undefined">
    <header class="top">
      <div>
        <h1 tabindex="-1">Insight Analysis</h1>
        <p class="sub">本地数据工作空间 · 导入 · 转换 · 可视化</p>
      </div>
      <div class="top-actions">
        <button type="button" class="btn" :disabled="demoBusy" @click="createDemo">
          {{ demoBusy ? '创建中…' : '一键 Demo（含示例数据）' }}
        </button>
        <button
          type="button"
          class="btn btn-primary create-trigger"
          @pointerenter="warmCreateOnce"
          @focus="warmCreateOnce"
          @click="openCreate"
        >
          + 创建 Analysis
        </button>
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

    <div
      v-if="!listReady"
      class="list-skel ia-skel"
      v-bind="{ ...listMainRegionAttrs(), ...listSkeletonAttrs() }"
    >
      <div class="list-skel__rows" aria-hidden="true">
        <div v-for="n in 4" :key="n" class="ia-skel__pulse list-skel__row" />
      </div>
      <span class="sr-only">加载中…</span>
    </div>
    <table
      v-else-if="filtered.length"
      class="analysis-table"
      aria-label="Analysis 列表"
      v-bind="listMainRegionAttrs()"
    >
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
          v-for="(row, index) in filtered"
          :key="row.id"
          :tabindex="listRowTabIndex(index, rowFocusIndex)"
          :data-ia-list-row="index"
          @click="open(row)"
          @focus="rowFocusIndex = index"
          @keydown="onRowKeydown($event, index, row)"
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
    <div v-else class="empty-list" v-bind="listEmptyRegionAttrs()">
      <div class="empty-list__pulse ia-skel__pulse" aria-hidden="true" />
      <p>还没有 Analysis。使用下方按钮快速体验，或创建后导入 CSV。</p>
      <div class="empty-list__cta">
        <button
          type="button"
          class="btn empty-cta"
          :aria-label="listEmptyCtaAria('demo')"
          :disabled="demoBusy"
          @click="createDemo"
        >
          {{ demoBusy ? '创建中…' : '一键 Demo' }}
        </button>
        <button
          type="button"
          class="btn btn-primary empty-cta create-trigger"
          :aria-label="listEmptyCtaAria('create')"
          @pointerenter="warmCreateOnce"
          @focus="warmCreateOnce"
          @click="openCreate"
        >
          + 创建 Analysis
        </button>
      </div>
    </div>
    </div>

    <CreateAnalysisDialog
      v-if="showCreate"
      v-model="showCreate"
      :restore-target="createRestoreFocus"
      @create="onCreate"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { confirm, isFeedbackCancel, setToastHostExternalInert, toast } from '@/shared/ui/feedback'
import { dangerDeleteOptions } from '@/shared/ui/dangerConfirm'
import { useAnalysisStore } from '@/modules/analysis/stores/analysisStore'
import { listSkeletonAttrs } from '@/modules/analysis/workspaceLoading'
import {
  listEmptyRegionAttrs,
  listEmptyCtaAria,
  listMainRegionAttrs,
  listSkipHref,
} from '@/modules/analysis/listEmpty'
import { MOCK_PROJECTS, getProjectName } from '@/shared/mock/projects'
import { createDemoTable } from '@/shared/mock/demoData'
import { scheduleWorkspaceRoutePrefetch } from '@/shared/ui/routePrefetch'
import { scheduleCreateAnalysisWarm, demoSuccessPathWarmsCreate } from '@/modules/analysis/createAnalysisChunk'
import {
  applyListDeleteFocus,
  planListDeleteFocus,
} from '@/modules/analysis/listDeleteFocus'
import { listDeleteSuccessToastMessage } from '@/modules/analysis/listDeleteToastFocus'
import {
  clampListRowFocus,
  listRowTabIndex,
  nextListRowFocus,
  resolveListRowKeyAction,
} from '@/modules/analysis/listRowNav'
import { demoFailToastMessage } from '@/modules/analysis/demoFailToastCreate'
import { listSkipVisibleWhenCreateClosed } from '@/modules/analysis/listSkipCreate'

const CreateAnalysisDialog = defineAsyncComponent(
  () => import('@/modules/analysis/views/CreateAnalysisDialog.vue'),
)

const store = useAnalysisStore()
const router = useRouter()
const showCreate = ref(false)
const projectFilter = ref('')
const demoBusy = ref(false)
const listReady = ref(false)
const createRestoreFocus = ref<HTMLElement | null>(null)
/** Round 41: single Tab stop in the analysis table (roving tabindex). */
const rowFocusIndex = ref<number | null>(null)
let createWarmed = false

const filtered = computed(() =>
  store.list.filter((a) => !projectFilter.value || a.projectId === projectFilter.value),
)

watch(filtered, (rows) => {
  rowFocusIndex.value = clampListRowFocus(rowFocusIndex.value, rows.length)
})

const skipHref = computed(() =>
  listSkipHref({ ready: listReady.value, hasRows: filtered.value.length > 0 }),
)

watch(showCreate, (open) => {
  setToastHostExternalInert(open)
  if (!open) createRestoreFocus.value = null
}, { immediate: true })

onUnmounted(() => {
  setToastHostExternalInert(false)
})

onMounted(async () => {
  // Round 37: warm workspace only after list is interactive (not during loadList).
  try {
    await store.loadList()
  } finally {
    listReady.value = true
    scheduleWorkspaceRoutePrefetch(router)
  }
})

function formatTime(iso: string) {
  return new Date(iso).toLocaleString()
}

/** Round 38: warm Create chunk on first Create trigger interaction (not at listReady). */
function warmCreateOnce() {
  if (createWarmed) return
  createWarmed = true
  scheduleCreateAnalysisWarm()
}

function openCreate(ev: Event) {
  warmCreateOnce()
  const target = ev.currentTarget
  createRestoreFocus.value = target instanceof HTMLElement ? target : null
  showCreate.value = true
}

async function onCreate(payload: { name: string; projectId: string }) {
  const a = await store.createAnalysis(payload.name, payload.projectId)
  createRestoreFocus.value = null
  showCreate.value = false
  toast('success', '已创建')
  router.push(`/analyses/${a.id}`)
}

async function createDemo() {
  if (demoBusy.value) return
  // Round 41: Demo success path must never schedule Create warm.
  void demoSuccessPathWarmsCreate()
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
    // Round 40: stable copy; toast may coexist with Create (inert via showCreate watch).
    toast('error', demoFailToastMessage())
  } finally {
    demoBusy.value = false
  }
}

function open(row: { id: string }) {
  router.push(`/analyses/${row.id}`)
}

function focusListRow(index: number) {
  rowFocusIndex.value = index
  void nextTick(() => {
    const el = document.querySelector(`[data-ia-list-row="${index}"]`)
    if (el instanceof HTMLElement) el.focus()
  })
}

function onRowKeydown(
  ev: KeyboardEvent,
  index: number,
  row: { id: string },
) {
  const action = resolveListRowKeyAction(ev.key)
  if (!action) return
  ev.preventDefault()
  if (action === 'activate') {
    open(row)
    return
  }
  const next = nextListRowFocus(action, index, filtered.value.length)
  if (next !== null) focusListRow(next)
}

async function onRemove(id: string) {
  const deletedIndex = filtered.value.findIndex((row) => row.id === id)
  try {
    await confirm(
      '确定删除该 Analysis？此操作不可撤销。',
      '删除 Analysis',
      dangerDeleteOptions('删除'),
    )
  } catch (err) {
    if (isFeedbackCancel(err)) return
    throw err
  }
  await store.removeAnalysis(id)
  // Round 41: toast + focus ring coexist; focus after toast so ring wins.
  toast('success', listDeleteSuccessToastMessage())
  await nextTick()
  const plan = planListDeleteFocus(deletedIndex, filtered.value.length)
  if (plan.kind === 'row') rowFocusIndex.value = plan.index
  else rowFocusIndex.value = null
  applyListDeleteFocus(plan)
}
</script>

<style scoped>
.list-page {
  position: relative;
  max-width: 960px;
  margin: 0 auto;
  padding: 32px 20px;
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
.btn:focus-visible {
  outline: 2px solid var(--ia-accent);
  outline-offset: 2px;
}
.btn-primary:focus-visible {
  outline-offset: 2px;
}
.link-danger:focus-visible {
  outline: 2px solid var(--ia-danger, #d92d20);
  outline-offset: 2px;
  border-radius: 2px;
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
.list-skel {
  margin-top: 8px;
  padding: 16px;
  background: #fff;
  border: 1px solid var(--ia-border);
  border-radius: 8px;
}
.list-skel__rows {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.list-skel__row {
  width: 100%;
  height: 14px;
}
.empty-list {
  margin-top: 24px;
  text-align: center;
  color: #646a73;
  padding: 40px 16px 32px;
  background: linear-gradient(180deg, #fff 0%, #f7f8fa 100%);
  border: 1px dashed var(--ia-border);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}
.empty-list__pulse {
  width: min(200px, 50%);
  height: 10px;
}
.empty-list p {
  margin: 0;
  max-width: 36em;
}
.empty-list__cta {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
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
