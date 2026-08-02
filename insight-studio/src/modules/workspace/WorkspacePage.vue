<script setup lang="ts">
import { computed, defineAsyncComponent, onMounted, ref, watch } from 'vue'
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useAnalysisStore } from '../../stores/analysisStore'
import { analysisRepository } from '../../shared/repository'
import { IButton, IIcon, IModal, IPopover, ITextField, ITooltip, toast } from '../../ui'
import WorkspaceMain from './WorkspaceMain.vue'
import { useAddData } from '../shell/useAddData'

const FlowchartMain = defineAsyncComponent(() => import('./FlowchartMain.vue'))

function prefetchFlowchart(): void {
  void import('./FlowchartMain.vue')
}

async function prefetchCharts(): Promise<void> {
  // 空闲预取 ChartView + Plotly，点开图表不再现场下载大 chunk
  void import('../charts/ChartView.vue')
  const mod = await import('../charts/ChartPanel.vue')
  await mod.prefetchPlotly()
}

const route = useRoute()
const router = useRouter()
const store = useAnalysisStore()
const { current, mode, dirty, saving, loading } = storeToRefs(store)
const { openMenu: openAddData } = useAddData()

const analysisId = computed(() => String(route.params.id ?? ''))

onMounted(async () => {
  // 空闲时预取 flowchart / 图表，降低首次打开等待
  const ric = (window as Window & { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number }).requestIdleCallback
  const prefetchAll = () => {
    prefetchFlowchart()
    void prefetchCharts()
  }
  if (typeof ric === 'function') ric(prefetchAll, { timeout: 2500 })
  else setTimeout(prefetchAll, 800)

  const ok = await store.load(analysisId.value)
  if (!ok) {
    toast.error('Analysis 不存在或已被删除')
    router.replace('/')
    return
  }
  applyQuerySelection()
})

// 路由参数变化（例如列表页跳转）时重新加载
watch(analysisId, async (id, prev) => {
  if (id && id !== prev) {
    await store.saveNow()
    const ok = await store.load(id)
    if (!ok) router.replace('/')
    else applyQuerySelection()
  }
})

/** 看板「打开源视图」带入 ?tableId=&viewId= */
function applyQuerySelection() {
  const tableId = typeof route.query.tableId === 'string' ? route.query.tableId : ''
  if (!tableId) return
  const viewId = typeof route.query.viewId === 'string' ? route.query.viewId : undefined
  store.select(viewId ? { kind: 'view', tableId, viewId } : { kind: 'table', tableId })
}

// 离开页面前等待落盘，避免防抖未完成导致配置丢失
onBeforeRouteLeave(async () => {
  try {
    await store.saveNow()
  } catch (e) {
    toast.error(e instanceof Error ? e.message : '保存失败', { title: '离开前保存失败' })
    // 仍允许离开；dirty 保留，下次进入可再试
  }
})

/* 顶栏 ⋯ 菜单 */
const headerMenuOpen = ref(false)
const renameOpen = ref(false)
const renameName = ref('')
const deleteOpen = ref(false)

function openRename() {
  renameName.value = current.value?.name ?? ''
  renameOpen.value = true
}
function submitRename() {
  const name = renameName.value.trim()
  if (!name) return
  store.rename(name)
  renameOpen.value = false
}

async function confirmDelete() {
  if (!current.value) return
  const name = current.value.name
  await analysisRepository.delete(current.value.id)
  toast.success(`已删除「${name}」`)
  router.replace('/')
}

/* Flowchart 切换 */
function toggleFlowchart() {
  store.setMode(mode.value === 'flowchart' ? 'workspace' : 'flowchart')
}

const modeComponent = computed(() => (mode.value === 'flowchart' ? FlowchartMain : WorkspaceMain))
</script>

<template>
  <div class="ws">
    <header class="ws__header">
      <div class="ws__title-row">
        <h1 class="ws__title is-ellipsis">{{ current?.name ?? '…' }}</h1>
        <span v-if="dirty" class="ws__dirty" title="有未保存更改">
          <IIcon name="dot" :size="8" />
        </span>
        <span v-if="saving" class="ws__saving">保存中…</span>
      </div>

      <div class="ws__header-actions">
        <ITooltip :content="mode === 'flowchart' ? '返回工作区' : '查看流程图'">
          <IButton
            :variant="mode === 'flowchart' ? 'secondary' : 'ghost'"
            icon="flowchart"
            :aria-pressed="mode === 'flowchart'"
            @mouseenter="prefetchFlowchart(); void prefetchCharts()"
            @focus="prefetchFlowchart(); void prefetchCharts()"
            @click="toggleFlowchart"
          >
            Flowchart
          </IButton>
        </ITooltip>

        <IPopover :open="headerMenuOpen" placement="bottom-end" :arrow="false" @update:open="headerMenuOpen = $event">
          <template #anchor>
            <IButton variant="ghost" icon="more" title="更多操作" aria-label="更多操作" @click="headerMenuOpen = !headerMenuOpen" />
          </template>
          <template #default="{ close }">
            <div class="menu" role="menu">
              <button type="button" class="menu__item" role="menuitem" @click="close(); openRename()">
                <IIcon name="edit" :size="13" /> 重命名
              </button>
              <button type="button" class="menu__item menu__item--danger" role="menuitem" @click="close(); deleteOpen = true">
                <IIcon name="trash" :size="13" /> 删除 Analysis
              </button>
            </div>
          </template>
        </IPopover>
      </div>
    </header>

    <main class="ws__main">
      <KeepAlive>
        <component :is="modeComponent" :key="mode" @add-data="openAddData" />
      </KeepAlive>
    </main>

    <!-- 重命名 -->
    <IModal :open="renameOpen" title="重命名 Analysis" :width="420" @update:open="renameOpen = $event">
      <ITextField v-model="renameName" autofocus @enter="submitRename" />
      <template #footer>
        <IButton @click="renameOpen = false">取消</IButton>
        <IButton variant="primary" :disabled="!renameName.trim()" @click="submitRename">保存</IButton>
      </template>
    </IModal>

    <!-- 删除确认 -->
    <IModal :open="deleteOpen" title="删除 Analysis" :width="420" @update:open="deleteOpen = $event">
      <p class="confirm-text">确定删除「{{ current?.name }}」吗？所有表、视图与图表配置都会被删除，此操作不可撤销。</p>
      <template #footer>
        <IButton @click="deleteOpen = false">取消</IButton>
        <IButton variant="danger" @click="confirmDelete">删除</IButton>
      </template>
    </IModal>

    <div v-if="loading" class="ws__loading">加载中…</div>
  </div>
</template>

<style scoped>
.ws {
  height: 100%;
  display: flex;
  flex-direction: column;
  position: relative;
}
.ws__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  height: 56px;
  padding: 0 20px;
  background: var(--is-surface);
  border-bottom: 1px solid var(--is-border);
  flex-shrink: 0;
}
.ws__title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.ws__title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--is-text);
  max-width: 480px;
}
.ws__dirty {
  color: var(--is-warning-text);
  display: inline-flex;
}
.ws__saving {
  font-size: var(--is-text-xs);
  color: var(--is-text-tertiary);
}
.ws__header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.ws__main {
  flex: 1;
  min-width: 0;
  min-height: 0;
}
.ws__loading {
  /* 只盖工作区主区域，不盖全局壳层（头部/rail/侧栏保持可见可交互）；
     200ms 延迟淡入，快速加载不闪屏 */
  position: absolute;
  left: 0;
  right: 0;
  top: 56px;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--is-bg);
  color: var(--is-text-secondary);
  z-index: 5;
  opacity: 0;
  animation: ws-loading-in 160ms var(--is-ease) 200ms forwards;
}
@keyframes ws-loading-in {
  to {
    opacity: 1;
  }
}

.menu {
  padding: 4px;
  display: flex;
  flex-direction: column;
  min-width: 180px;
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
.menu__item:hover:not(:disabled) {
  background: var(--is-surface-hover);
}
.menu__item:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.menu__item--danger {
  color: var(--is-danger);
}
.menu__item--danger:hover {
  background: var(--is-danger-soft);
}
.confirm-text {
  font-size: var(--is-text-sm);
  color: var(--is-text-secondary);
  line-height: 1.6;
}
</style>
