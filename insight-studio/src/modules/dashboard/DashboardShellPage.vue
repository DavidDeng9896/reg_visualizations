<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { createDashboardWidget, createLinkWidget } from '../../shared/factories'
import { useDashboardStore } from '../../stores/dashboardStore'
import { IButton, IEmptyState, IIcon, IPopover, toast } from '../../ui'
import DashboardCanvas from './DashboardCanvas.vue'
import AddWidgetDialog, { type AddWidgetPayload } from './AddWidgetDialog.vue'
import CategorySidebar from './CategorySidebar.vue'
import { findNextSlot, type LayoutItem } from './grid'
import type { DashboardWidget } from '../../shared/types'

const route = useRoute()
const router = useRouter()
const store = useDashboardStore()
const { current, currentId, saving, dirty } = storeToRefs(store)

const editLayout = ref(false)
const addOpen = ref(false)
const menuOpen = ref(false)

/** 分类样式侧栏开关（内嵌面板，非浮窗）。 */
const categoryOpen = ref(false)

const routeId = computed(() => {
  const id = route.params.id
  return typeof id === 'string' && id ? id : null
})

onMounted(async () => {
  await store.loadList()
  await syncRoute()
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
  store.mutate((d) => {
    if (payload.kind === 'link') {
      const grid = findNextSlot(d.widgets, 6, 10)
      const w = createLinkWidget(payload.url, { title: payload.title, grid })
      d.widgets.push(w)
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
  })
  toast.success('已添加组件')
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
            <IPopover :open="menuOpen" placement="bottom-end" :arrow="false" @update:open="menuOpen = $event">
              <template #anchor>
                <IButton variant="ghost" icon="more" title="更多操作" aria-label="更多操作" @click="menuOpen = !menuOpen" />
              </template>
              <template #default="{ close }">
                <div class="menu" role="menu">
                  <button
                    type="button"
                    class="menu__item"
                    role="menuitem"
                    :aria-pressed="categoryOpen"
                    @click="close(); categoryOpen = !categoryOpen"
                  >
                    <IIcon name="sliders" :size="13" /> 分类样式
                  </button>
                  <button type="button" class="menu__item" role="menuitem" @click="close(); editLayout = !editLayout">
                    <IIcon name="drag" :size="13" /> {{ editLayout ? '完成布局' : '编辑布局' }}
                  </button>
                  <button type="button" class="menu__item" role="menuitem" @click="close(); addOpen = true">
                    <IIcon name="plus" :size="13" /> 添加组件
                  </button>
                </div>
              </template>
            </IPopover>
          </div>
        </div>
        <div class="dash__canvas-wrap">
          <IEmptyState
            v-if="!current.widgets.length"
            icon="plus"
            title="还没有组件"
            description="从多个 Insight 中选择已配置好的表或图表，拖到画布上组成总览。"
          >
            <IButton variant="primary" icon="plus" @click="addOpen = true">添加组件</IButton>
          </IEmptyState>
          <DashboardCanvas
            v-else
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
        v-else
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
  </div>
</template>

<style scoped>
.dash {
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
  gap: 8px;
  flex-shrink: 0;
}
.dash__canvas-wrap {
  padding: 16px 20px 32px;
  flex: 1;
  min-height: 320px;
  background: #f9fafb;
}

.menu {
  padding: 4px;
  display: flex;
  flex-direction: column;
  min-width: 160px;
}
.menu__item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border: none;
  border-radius: var(--is-radius-sm);
  background: transparent;
  font-size: var(--is-text-sm);
  text-align: left;
  color: var(--is-text);
  cursor: pointer;
  transition: background-color var(--is-dur-fast) var(--is-ease);
}
.menu__item:hover {
  background: var(--is-surface-hover);
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
</style>
