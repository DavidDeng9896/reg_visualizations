<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { createDashboardWidget } from '../../shared/factories'
import { useDashboardStore } from '../../stores/dashboardStore'
import { IButton, IEmptyState, toast } from '../../ui'
import HomeSegmentNav from '../home/HomeSegmentNav.vue'
import DashboardSidebar from './DashboardSidebar.vue'
import DashboardCanvas from './DashboardCanvas.vue'
import AddWidgetDialog, { type AddWidgetPayload } from './AddWidgetDialog.vue'
import { findNextSlot } from './grid'
import type { DashboardWidget } from '../../shared/types'

const route = useRoute()
const router = useRouter()
const store = useDashboardStore()
const { current, currentId, saving, dirty } = storeToRefs(store)

const editLayout = ref(false)
const addOpen = ref(false)

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

function onRemoveWidget(widgetId: string) {
  store.mutate((d) => {
    d.widgets = d.widgets.filter((w) => w.id !== widgetId)
  })
}

function onAddWidget(payload: AddWidgetPayload) {
  store.mutate((d) => {
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
</script>

<template>
  <div class="shell">
    <header class="shell__header">
      <div class="shell__brand">
        <h1 class="shell__title">Insight Studio</h1>
        <HomeSegmentNav active="dashboard" />
      </div>
      <div class="shell__status">
        <span v-if="saving" class="shell__saving">保存中…</span>
        <span v-else-if="dirty" class="shell__dirty">未保存</span>
      </div>
    </header>
    <div class="shell__body">
      <DashboardSidebar class="shell__side" />
      <main class="shell__main">
        <template v-if="current">
          <div class="shell__toolbar">
            <h2 class="shell__dash-name is-ellipsis">{{ current.name }}</h2>
            <div class="shell__toolbar-actions">
              <IButton
                size="sm"
                :variant="editLayout ? 'primary' : 'secondary'"
                @click="editLayout = !editLayout"
              >
                {{ editLayout ? '完成布局' : '编辑布局' }}
              </IButton>
              <IButton size="sm" variant="primary" icon="plus" @click="addOpen = true">添加组件</IButton>
            </div>
          </div>
          <div class="shell__canvas-wrap">
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
              @remove-widget="onRemoveWidget"
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
    </div>
    <AddWidgetDialog v-model:open="addOpen" @confirm="onAddWidget" />
  </div>
</template>

<style scoped>
.shell {
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: var(--is-bg, #f9fafb);
}
.shell__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  background: var(--is-surface);
  border-bottom: 1px solid var(--is-border);
  flex-shrink: 0;
}
.shell__brand {
  display: flex;
  align-items: center;
  gap: 16px;
}
.shell__title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}
.shell__status {
  font-size: 12px;
  color: var(--is-text-tertiary);
}
.shell__body {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 240px 1fr;
}
.shell__side {
  min-height: 0;
}
.shell__main {
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: auto;
}
.shell__toolbar {
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
.shell__dash-name {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  min-width: 0;
}
.shell__toolbar-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}
.shell__canvas-wrap {
  padding: 16px 20px 32px;
  flex: 1;
}
</style>
