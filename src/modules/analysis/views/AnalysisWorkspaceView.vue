<template>
  <div v-if="store.current" class="workspace">
    <a
      v-show="!hideSkipLink"
      class="skip-link"
      data-ia-skip="1"
      :href="skipHref"
    >跳到主内容</a>
    <header class="header" :inert="shellBehindOverlay || undefined">
      <div class="crumbs">
        <router-link to="/">Analyses</router-link>
        <span>/</span>
        <span>{{ getProjectName(store.current.projectId) }}</span>
        <span>/</span>
        <strong>{{ store.current.name }}</strong>
        <span v-if="store.saving" class="saving-tag" role="status">保存中…</span>
      </div>
      <div class="actions">
        <button
          type="button"
          class="btn"
          :class="{ 'btn-primary': store.mainMode === 'flowchart' }"
          :aria-pressed="store.mainMode === 'flowchart'"
          @click="store.mainMode = 'flowchart'"
        >
          Flowchart
        </button>
        <button type="button" class="btn" @click="stub('Send output')">Send output</button>
        <div class="add-data" ref="addDataRoot">
          <button
            type="button"
            class="btn btn-primary"
            aria-haspopup="menu"
            :aria-expanded="addDataOpen"
            aria-controls="add-data-menu"
            @click="toggleAddData"
            @keydown="onAddDataTriggerKey"
          >
            + Add data
          </button>
          <ul
            v-if="addDataOpen"
            id="add-data-menu"
            class="add-data-menu"
            role="menu"
            aria-label="+ Add data"
            @keydown="onAddDataMenuKey"
          >
            <li
              v-for="(item, i) in addDataItems"
              :key="item.cmd"
              role="menuitem"
              :tabindex="addDataActive === i ? 0 : -1"
              :aria-disabled="item.disabled || undefined"
              :class="{ 'is-disabled': item.disabled, 'is-active': addDataActive === i }"
              @click="!item.disabled && pickAddData(item.cmd)"
            >
              {{ item.label }}
            </li>
          </ul>
        </div>
      </div>
    </header>

    <!--
      DOM 顺序：主区 → 分隔条 → 侧栏；CSS order 保持侧栏在左。
      键盘 Tab 优先进入工具栏/表图，再回侧栏导航（a11y）。
    -->
    <div class="body">
      <main
        id="workspace-main"
        class="main"
        tabindex="-1"
        :inert="mainBehindOverlay || undefined"
      >
        <FlowchartCanvas
          v-if="store.mainMode === 'flowchart'"
          :focus-id="focusId"
          @add-data="onAddData"
        />
        <TableChartWorkspace
          v-else-if="vxeReady"
          @add-data="onAddData"
          @request-new-view="onRequestNewView"
        />
        <div v-else class="workspace-skel workspace-skel--main ia-skel" v-bind="workspaceSkeletonAttrs()">
          <div class="ia-skel__pulse" aria-hidden="true" />
          <span class="sr-only">加载表格引擎…</span>
        </div>
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
        :inert="shellBehindOverlay || undefined"
        @pointerdown="onSidebarDown"
        @keydown="onSidebarKey"
      />
      <div class="sidebar-slot" :style="{ width: `${sidebarWidth}px` }">
        <AnalysisSidebar
          ref="sidebarRef"
          :width="sidebarWidth"
          @add-data="onAddData"
          @jump-flowchart="onJump"
        />
      </div>
    </div>

    <!-- CSV / Combine teleport to body (Round 36); mount stays on workspace shell. -->
    <CsvImportDialog v-if="showCsv" v-model="showCsv" />
    <CombineTablesDialog v-if="showCombine" v-model="showCombine" />
  </div>
  <div v-else class="workspace-skel ia-skel" v-bind="workspaceSkeletonAttrs()">
    <div class="workspace-skel__header ia-skel__block" aria-hidden="true" />
    <div class="workspace-skel__body" aria-hidden="true">
      <div class="workspace-skel__sidebar" />
      <div class="workspace-skel__main">
        <div class="ia-skel__pulse" />
      </div>
    </div>
    <span class="sr-only">加载中…</span>
  </div>
</template>

<script setup lang="ts">
import {
  computed,
  defineAsyncComponent,
  getCurrentInstance,
  h,
  nextTick,
  onMounted,
  onUnmounted,
  ref,
  shallowRef,
  watch,
} from 'vue'
import { useAnalysisStore } from '@/modules/analysis/stores/analysisStore'
import { workspaceSkeletonAttrs } from '@/modules/analysis/workspaceLoading'
import { workspaceSkipHref } from '@/modules/analysis/workspaceSkip'
import { getProjectName } from '@/shared/mock/projects'
import AnalysisSidebar from '@/modules/sidebar/AnalysisSidebar.vue'
import TableChartWorkspace from '@/modules/table/TableChartWorkspace.vue'
import { setToastHostExternalInert, toast } from '@/shared/ui/feedback'
import {
  enabledMenuIndices,
  handleMenuKeydown,
} from '@/shared/ui/menuNav'
import {
  clampSidebarWidth,
  loadSidebarWidth,
  saveSidebarWidth,
  MIN_SIDEBAR_WIDTH,
  MAX_SIDEBAR_WIDTH,
} from '@/modules/sidebar/sidebarPrefs'
import {
  anyWorkspaceDialogOpen,
  mainBehindWorkspaceOverlay,
  setWorkspaceDialogOpen,
  skipLinkHiddenBehindOverlay,
} from '@/modules/analysis/workspaceOverlay'

const CsvImportDialog = defineAsyncComponent(() => import('@/modules/table/CsvImportDialog.vue'))
const CombineTablesDialog = defineAsyncComponent(() => import('@/modules/table/CombineTablesDialog.vue'))
/** Delay avoids skeleton flash when Flowchart chunk is already warm (Round 26). */
const FLOWCHART_LOADING_DELAY_MS = 200

const FlowchartCanvas = defineAsyncComponent({
  loader: () => import('@/modules/flowchart/FlowchartCanvas.vue'),
  delay: FLOWCHART_LOADING_DELAY_MS,
  loadingComponent: {
    setup() {
      return () =>
        h('div', { class: 'workspace-skel workspace-skel--main ia-skel', ...workspaceSkeletonAttrs() }, [
          h('div', { class: 'ia-skel__pulse', 'aria-hidden': 'true' }),
          h('span', { class: 'sr-only' }, '加载流程图…'),
        ])
    },
  },
})

const addDataItems = [
  { cmd: 'csv', label: 'From CSV', disabled: false },
  { cmd: 'combine', label: 'By combining tables', disabled: false },
  { cmd: 'registry', label: 'From Registry（暂未实现）', disabled: true },
  { cmd: 'plate', label: 'From Plate（暂未实现）', disabled: true },
] as const

const vxeReady = shallowRef(false)
const instance = getCurrentInstance()

const props = defineProps<{ analysisId: string }>()
const store = useAnalysisStore()
const showCsv = ref(false)
const showCombine = ref(false)
const focusId = ref<string | null>(null)
const sidebarWidth = ref(loadSidebarWidth())
const draggingSidebar = ref(false)
const addDataOpen = ref(false)
const addDataRoot = ref<HTMLElement | null>(null)
const addDataActive = ref<number | null>(null)
const sidebarRef = ref<{
  openNewViewDialog: (opts: {
    tableId: string
    parentId: string
    restoreFocus?: HTMLElement | null
  }) => void
} | null>(null)

watch(showCsv, (open) => setWorkspaceDialogOpen('csv', open))
watch(showCombine, (open) => setWorkspaceDialogOpen('combine', open))
watch(
  () => anyWorkspaceDialogOpen(),
  (open) => setToastHostExternalInert(open),
  { immediate: true },
)

const shellBehindOverlay = computed(() => anyWorkspaceDialogOpen())
const mainBehindOverlay = computed(() => mainBehindWorkspaceOverlay())
const hideSkipLink = computed(() => skipLinkHiddenBehindOverlay())
const flowchartEmpty = computed(() => (store.current?.tables.length ?? 0) === 0)
const workspaceEmpty = computed(() => !store.workspaceResult)
const skipHref = computed(() =>
  workspaceSkipHref({
    mode: store.mainMode,
    flowchartEmpty: flowchartEmpty.value,
    workspaceEmpty: workspaceEmpty.value,
  }),
)

onMounted(async () => {
  document.addEventListener('pointerdown', onDocPointer, true)
  // Vxe 仅动态导入，避免列表路由共享图误拉；表网格需等注册完成再挂载
  const [{ setupVxe }] = await Promise.all([
    import('@/modules/plugins/vxe'),
    (async () => {
      const preferred = store.current?.id === props.analysisId ? store.selectedNodeId : null
      await store.openAnalysis(props.analysisId, { selectNodeId: preferred })
      if (!store.current) toast('error', 'Analysis 不存在')
    })(),
  ])
  const app = instance?.appContext.app
  if (app) setupVxe(app)
  vxeReady.value = true
  // Warm flowchart chunk after paint so first Flowchart click is not cold.
  void import('@/modules/flowchart/FlowchartCanvas.vue')
})

onUnmounted(() => {
  document.removeEventListener('pointerdown', onDocPointer, true)
  window.removeEventListener('pointermove', onSidebarMove)
  window.removeEventListener('pointerup', onSidebarUp)
  setWorkspaceDialogOpen('csv', false)
  setWorkspaceDialogOpen('combine', false)
  setToastHostExternalInert(false)
})

function stub(name: string) {
  toast('info', `${name}：后续版本`)
}

function focusAddDataItem() {
  void nextTick(() => {
    const menu = addDataRoot.value?.querySelector('#add-data-menu')
    if (!menu || addDataActive.value === null) return
    const nodes = menu.querySelectorAll<HTMLElement>('[role="menuitem"]')
    nodes[addDataActive.value]?.focus()
  })
}

function focusAddDataTrigger() {
  void nextTick(() => {
    addDataRoot.value?.querySelector<HTMLElement>('button.btn-primary')?.focus()
  })
}

function openAddData() {
  // Intent-warm CSV / Combine dialogs so first open is not cold; keeps EP dialogs out of sync path.
  void import('@/modules/table/CsvImportDialog.vue')
  void import('@/modules/table/CombineTablesDialog.vue')
  addDataOpen.value = true
  addDataActive.value = enabledMenuIndices(addDataItems)[0] ?? null
  focusAddDataItem()
}

function closeAddData(opts?: { restoreFocus?: boolean }) {
  const wasOpen = addDataOpen.value
  addDataOpen.value = false
  addDataActive.value = null
  if (wasOpen && opts?.restoreFocus !== false) focusAddDataTrigger()
}

function toggleAddData() {
  if (addDataOpen.value) closeAddData()
  else openAddData()
}

function pickAddData(cmd: string) {
  closeAddData({ restoreFocus: false })
  onAddData(cmd)
}

function onAddDataTriggerKey(e: KeyboardEvent) {
  if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
    if (!addDataOpen.value) {
      e.preventDefault()
      openAddData()
    }
  } else if (e.key === 'Escape' && addDataOpen.value) {
    e.preventDefault()
    closeAddData()
  }
}

function onAddDataMenuKey(e: KeyboardEvent) {
  handleMenuKeydown(e, addDataItems, {
    getActiveIndex: () => addDataActive.value,
    setActiveIndex: (i) => {
      addDataActive.value = i
      focusAddDataItem()
    },
    onActivate: (i) => {
      const item = addDataItems[i]
      if (item && !item.disabled) pickAddData(item.cmd)
    },
    onClose: () => closeAddData(),
  })
}

function onDocPointer(e: PointerEvent) {
  if (!addDataOpen.value) return
  const root = addDataRoot.value
  if (root && !root.contains(e.target as Node)) closeAddData({ restoreFocus: false })
}

function onAddData(cmd: string) {
  if (cmd === 'csv') showCsv.value = true
  else if (cmd === 'combine') showCombine.value = true
  else if (cmd === 'registry' || cmd === 'plate') stub(cmd)
}

/** Workspace New view CTA → sidebar dialog (name/type + focus restore). */
function onRequestNewView() {
  const table = store.selectedTable
  if (!table) return
  const restore =
    document.activeElement instanceof HTMLElement ? document.activeElement : null
  sidebarRef.value?.openNewViewDialog({
    tableId: table.id,
    parentId: table.id,
    restoreFocus: restore,
  })
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
.saving-tag {
  margin-left: 8px;
  padding: 2px 8px;
  font-size: 12px;
  line-height: 18px;
  color: #646a73;
  background: #f2f3f5;
  border-radius: 4px;
}
.actions {
  display: flex;
  gap: 8px;
  align-items: center;
}
.btn {
  height: 32px;
  padding: 0 14px;
  border: 1px solid var(--ia-border);
  border-radius: 6px;
  background: #fff;
  color: #1f2329;
  font: inherit;
  font-size: 13px;
  cursor: pointer;
}
.btn:hover {
  border-color: var(--ia-accent);
  color: var(--ia-accent);
}
.btn:focus-visible {
  outline: 2px solid var(--ia-accent);
  outline-offset: 1px;
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
.add-data {
  position: relative;
}
.add-data-menu {
  position: absolute;
  right: 0;
  top: calc(100% + 4px);
  z-index: 20;
  min-width: 200px;
  margin: 0;
  padding: 6px 0;
  list-style: none;
  background: #fff;
  border: 1px solid var(--ia-border);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.12);
}
.add-data-menu li {
  padding: 8px 14px;
  font-size: 13px;
  cursor: pointer;
  color: #1f2329;
}
.add-data-menu li:hover:not(.is-disabled),
.add-data-menu li.is-active:not(.is-disabled),
.add-data-menu li:focus-visible:not(.is-disabled) {
  background: var(--ia-accent-soft);
  color: var(--ia-accent);
  outline: none;
}
.add-data-menu li.is-disabled {
  color: #c0c4cc;
  cursor: not-allowed;
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
.workspace-skel {
  height: 100%;
  min-height: 240px;
  display: flex;
  flex-direction: column;
  background: var(--ia-bg);
}
.workspace-skel--main {
  height: 100%;
  padding: 16px;
  justify-content: center;
}
.workspace-skel__header {
  height: 52px;
  margin: 0;
  border-bottom: 1px solid var(--ia-border);
}
.workspace-skel__body {
  flex: 1;
  display: flex;
  min-height: 0;
}
.workspace-skel__sidebar {
  width: 220px;
  background: linear-gradient(180deg, #fff 0%, #f5f6f8 100%);
  border-right: 1px solid var(--ia-border);
}
.workspace-skel__main {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}
.workspace-skel__main .ia-skel__pulse {
  width: min(320px, 70%);
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
</style>
