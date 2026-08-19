<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { createDashboardWidget, createLinkWidget } from '../../shared/factories'
import { useDashboardStore } from '../../stores/dashboardStore'
import { IButton, IEmptyState, toast } from '../../ui'
import DashboardCanvas from './DashboardCanvas.vue'
import AddWidgetDialog, { type AddWidgetPayload } from './AddWidgetDialog.vue'
import CategorySidebar from './CategorySidebar.vue'
import { findNextSlot, type LayoutItem } from './grid'
import {
  dashboardCanvasVisible,
  dashboardEmptyStateVisible,
  dashboardLoadingOverlayVisible,
} from './canvasVisibility'
import type { DashboardWidget } from '../../shared/types'

const route = useRoute()
const router = useRouter()
const store = useDashboardStore()
const { current, currentId, saving, dirty, loading } = storeToRefs(store)

/** 首次挂载：list + 按路由 loadOne 完成前显示骨架，避免闪空白。 */
const booting = ref(true)

const editLayout = ref(false)
const addOpen = ref(false)

/** 分类样式侧栏开关（内嵌面板，非浮窗）。 */
const categoryOpen = ref(false)

const routeId = computed(() => {
  const id = route.params.id
  return typeof id === 'string' && id ? id : null
})

const showCanvas = computed(() =>
  dashboardCanvasVisible({
    hasCurrent: !!current.value,
    widgetCount: current.value?.widgets.length ?? 0,
    loading: loading.value,
  }),
)
const showEmpty = computed(() =>
  dashboardEmptyStateVisible({
    hasCurrent: !!current.value,
    widgetCount: current.value?.widgets.length ?? 0,
    loading: loading.value,
  }),
)
const showLoadingOverlay = computed(() =>
  dashboardLoadingOverlayVisible({
    hasCurrent: !!current.value,
    loading: loading.value,
    booting: booting.value && !!routeId.value,
  }),
)

onMounted(async () => {
  try {
    await store.loadList()
    await syncRoute()
  } finally {
    booting.value = false
  }
})

onBeforeUnmount(() => {
  void store.saveNow()
})

watch(routeId, () => {
  void syncRoute()
})

async function syncRoute() {
  const id = routeId.value
  if (!id) {
    store.clearCurrent()
    return
  }
  if (currentId.value === id && current.value) return
  const ok = await store.loadOne(id)
  if (!ok) {
    toast.error('看板不存在或已被删除')
    void router.replace('/dashboards')
  }
}

function onUpdateWidget(widgetId: string, patch: Partial<DashboardWidget>) {
  store.mutate((d) => {
    const w = d.widgets.find((x) => x.id === widgetId)
    if (!w) return
    Object.assign(w, patch)
  })
}

/** 拖放结束后一次写入全量布局（占位挤压后的结果）。 */
function onApplyLayout(layout: LayoutItem[]) {
  store.mutate((d) => {
    const byId = new Map(layout.map((l) => [l.id, l]))
    for (const w of d.widgets) {
      const l = byId.get(w.id)
      if (!l) continue
      w.grid = { x: l.x, y: l.y, w: l.w, h: l.h }
    }
  })
}

function onRemoveWidget(widgetId: string) {
  store.mutate((d) => {
    d.widgets = d.widgets.filter((w) => w.id !== widgetId)
  })
}

/** 多选批量删除：一次 mutate。 */
function onRemoveWidgets(widgetIds: string[]) {
  const ids = new Set(widgetIds)
  store.mutate((d) => {
    d.widgets = d.widgets.filter((w) => !ids.has(w.id))
  })
  toast.success(`已删除 ${widgetIds.length} 个组件`)
}

function onAddWidget(payload: AddWidgetPayload) {
  let addedId: string | null = null
  store.mutate((d) => {
    if (payload.kind === 'python-chart') {
      const grid = findNextSlot(d.widgets, 6, 8)
      const w = createDashboardWidget('python-chart', { analysisId: payload.analysisId, chartId: payload.chartId }, grid)
      d.widgets.push(w)
      addedId = w.id
      return
    }
    if (payload.kind === 'link') {
      const grid = findNextSlot(d.widgets, 6, 10)
      const w = createLinkWidget(payload.url, { title: payload.title, grid })
      d.widgets.push(w)
      addedId = w.id
      return
    }
    const defaults = payload.type === 'chart' ? { w: 6, h: 8 } : { w: 12, h: 10 }
    const grid = findNextSlot(d.widgets, defaults.w, defaults.h)
    const w = createDashboardWidget(
      payload.type,
      {
        analysisId: payload.analysisId,
        tableId: payload.tableId,
        viewId: payload.viewId,
      },
      grid,
    )
    d.widgets.push(w)
    addedId = w.id
  })
  if (!addedId) {
    toast.error('未选中看板，无法添加组件')
    return
  }
  toast.success('已添加组件')
  void nextTick(() => {
    document.querySelector(`[data-widget-id="${addedId}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  })
}

/** 分类侧栏选择：打开添加组件对话框（图表/表） */
function onPickCategory(kind: 'table' | 'chart') {
  addOpen.value = true
}
</script>

<template>
  <div class="dash">
    <!-- 看板画布区 -->
    <main class="dash__main">
      <template v-if="current">
        <div class="dash__toolbar">
          <h2 class="dash__name is-ellipsis">{{ current.name }}</h2>
          <div class="dash__actions">
            <IButton
              size="sm"
              :variant="categoryOpen ? 'primary' : 'secondary'"
              icon="sliders"
              :aria-pressed="categoryOpen"
              title="分类样式"
              @click="categoryOpen = !categoryOpen"
            >
              分类样式
            </IButton>
            <IButton
              size="sm"
              :variant="editLayout ? 'primary' : 'secondary'"
              icon="drag"
              :aria-pressed="editLayout"
              :title="editLayout ? '完成布局' : '编辑布局'"
              @click="editLayout = !editLayout"
            >
              {{ editLayout ? '完成布局' : '编辑布局' }}
            </IButton>
            <IButton size="sm" variant="primary" icon="plus" title="添加组件" @click="addOpen = true">
              添加组件
            </IButton>
          </div>
        </div>
        <div class="dash__canvas-wrap">
          <IEmptyState
            v-if="showEmpty"
            icon="plus"
            title="还没有组件"
            description="从多个 Insight 中选择已配置好的表或图表，拖到画布上组成总览。"
          >
            <IButton variant="primary" icon="plus" @click="addOpen = true">添加组件</IButton>
          </IEmptyState>
          <DashboardCanvas
            v-else-if="showCanvas"
            :dashboard="current"
            :edit-layout="editLayout"
            @update-widget="onUpdateWidget"
            @apply-layout="onApplyLayout"
            @remove-widget="onRemoveWidget"
            @remove-widgets="onRemoveWidgets"
          />
        </div>
      </template>
      <IEmptyState
        v-else-if="!loading"
        icon="folder"
        title="选择或新建看板"
        description="左侧选择一个看板，或新建「细胞培养」「Assay」等主题总览。"
      />
    </main>

    <!-- 分类样式侧栏（内嵌面板，非浮窗） -->
    <aside v-if="categoryOpen && current" class="dash__cats" aria-label="分类样式">
      <div class="dash__cats-head">
        <span class="dash__cats-title">分类样式</span>
        <IButton variant="ghost" size="sm" icon="close" aria-label="关闭" @click="categoryOpen = false" />
      </div>
      <CategorySidebar @pick="onPickCategory" />
    </aside>

    <AddWidgetDialog v-model:open="addOpen" @confirm="onAddWidget" />

    <div v-if="showLoadingOverlay" class="dash__loading" role="status" aria-label="加载看板">
      <div class="dash__skel" aria-hidden="true">
        <div class="dash__skel-bar" />
        <div class="dash__skel-grid">
          <div v-for="n in 4" :key="n" class="dash__skel-card" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dash {
  position: relative;
  display: flex;
  height: 100%;
  min-height: 0;
}
.dash__main {
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: auto;
}
.dash__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 20px;
  background: var(--is-surface);
  border-bottom: 1px solid var(--is-border);
  flex-shrink: 0;
  position: sticky;
  top: 0;
  z-index: 2;
}
.dash__name {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  min-width: 0;
}
.dash__actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
  flex-shrink: 0;
}
.dash__toolbtn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 28px;
  padding: 0 10px;
  font-size: var(--is-text-xs);
  font-weight: 500;
  color: var(--is-text);
  background: var(--is-surface);
  border: 1px solid var(--is-border-strong);
  border-radius: var(--is-radius-sm);
  box-shadow: var(--is-shadow-sm);
  white-space: nowrap;
  cursor: pointer;
  transition:
    background-color var(--is-dur-fast) var(--is-ease),
    border-color var(--is-dur-fast) var(--is-ease),
    color var(--is-dur-fast) var(--is-ease);
}
.dash__toolbtn:hover {
  background: var(--is-surface-hover);
  border-color: var(--is-text-tertiary);
  color: var(--is-text);
}
.dash__toolbtn--active {
  background: var(--is-accent-soft);
  border-color: var(--is-accent);
  color: var(--is-accent-hover);
}
.dash__toolbtn--active:hover {
  background: var(--is-accent-soft);
  border-color: var(--is-accent-hover);
  color: var(--is-accent-hover);
}
.dash__toolbtn--primary {
  background: var(--is-primary);
  border-color: var(--is-primary);
  color: var(--is-text-inverse);
  box-shadow: none;
}
.dash__toolbtn--primary:hover {
  background: var(--is-primary-hover);
  border-color: var(--is-primary-hover);
  color: var(--is-text-inverse);
}
.dash__canvas-wrap {
  padding: 16px 20px 32px;
  flex: 1;
  min-height: 320px;
  background: var(--is-canvas-bg);
}

/* 分类样式侧栏（内嵌） */
.dash__cats {
  width: 264px;
  flex-shrink: 0;
  min-height: 0;
  overflow-y: auto;
  background: var(--is-surface);
  border-left: 1px solid var(--is-border);
}
.dash__cats-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px 6px 16px;
  border-bottom: 1px solid var(--is-border);
  position: sticky;
  top: 0;
  background: var(--is-surface);
  z-index: 1;
}
.dash__cats-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--is-text);
}
.dash__loading {
  position: absolute;
  inset: 0;
  z-index: 5;
  background: var(--is-bg);
}
.dash__skel {
  display: flex;
  flex-direction: column;
  height: 100%;
}
.dash__skel-bar {
  height: 52px;
  flex-shrink: 0;
  background: var(--is-surface);
  border-bottom: 1px solid var(--is-border);
}
.dash__skel-grid {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  padding: 20px;
  align-content: start;
}
.dash__skel-card {
  height: 180px;
  border-radius: var(--is-radius-md, 8px);
  background: linear-gradient(90deg, var(--is-surface-hover) 25%, var(--is-border) 50%, var(--is-surface-hover) 75%);
  background-size: 200% 100%;
  animation: dash-shimmer 1.2s ease-in-out infinite;
}
@keyframes dash-shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
</style>
