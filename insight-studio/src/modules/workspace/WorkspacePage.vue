<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useAnalysisStore } from '../../stores/analysisStore'
import { analysisRepository } from '../../shared/repository'
import { IButton, IIcon, IModal, IPopover, ITextField, ITooltip, toast } from '../../ui'
import SidebarTree from './SidebarTree.vue'
import WorkspaceMain from './WorkspaceMain.vue'
import FlowchartMain from './FlowchartMain.vue'
import CsvImportDialog from '../table/CsvImportDialog.vue'
import CombineTablesDialog from '../table/CombineTablesDialog.vue'

const route = useRoute()
const router = useRouter()
const store = useAnalysisStore()
const { current, mode, dirty, saving, loading } = storeToRefs(store)

const analysisId = computed(() => String(route.params.id ?? ''))

onMounted(async () => {
  const ok = await store.load(analysisId.value)
  if (!ok) {
    toast.error('Analysis 不存在或已被删除')
    router.replace('/')
  }
})

// 路由参数变化（例如列表页跳转）时重新加载
watch(analysisId, async (id, prev) => {
  if (id && id !== prev) {
    await store.saveNow()
    const ok = await store.load(id)
    if (!ok) router.replace('/')
  }
})

// 离开页面前落盘
onBeforeUnmount(() => {
  void store.saveNow()
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

/* Add data 菜单 */
const addDataOpen = ref(false)
const csvImportOpen = ref(false)
const combineOpen = ref(false)

function openCsvImport() {
  addDataOpen.value = false
  csvImportOpen.value = true
}
function openCombine() {
  addDataOpen.value = false
  combineOpen.value = true
}

const modeComponent = computed(() => (mode.value === 'flowchart' ? FlowchartMain : WorkspaceMain))
</script>

<template>
  <div class="ws">
    <header class="ws__header">
      <nav class="ws__breadcrumb" aria-label="面包屑">
        <RouterLink to="/" class="ws__crumb-link">Projects</RouterLink>
        <IIcon name="chevron-right" :size="12" class="ws__crumb-sep" />
        <span class="ws__crumb-current is-ellipsis">{{ current?.name ?? '…' }}</span>
        <span v-if="dirty" class="ws__dirty" title="有未保存更改">
          <IIcon name="dot" :size="8" />
        </span>
        <span v-if="saving" class="ws__saving">保存中…</span>
      </nav>

      <div class="ws__header-actions">
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

        <ITooltip :content="mode === 'flowchart' ? '返回工作区' : '查看流程图'">
          <IButton
            :variant="mode === 'flowchart' ? 'secondary' : 'ghost'"
            icon="flowchart"
            :aria-pressed="mode === 'flowchart'"
            @click="toggleFlowchart"
          >
            Flowchart
          </IButton>
        </ITooltip>

        <IPopover :open="addDataOpen" placement="bottom-end" :arrow="true" @update:open="addDataOpen = $event">
          <template #anchor>
            <IButton variant="primary" icon="plus" @click="addDataOpen = !addDataOpen">Add data</IButton>
          </template>
          <template #default>
            <div class="menu menu--adddata" role="menu">
              <button type="button" class="menu__item" role="menuitem" @click="openCsvImport">
                <IIcon name="upload" :size="14" />
                <span>
                  <span class="menu__item-title">Import CSV</span>
                  <span class="menu__item-desc">上传 .csv 文件创建新表</span>
                </span>
              </button>
              <button type="button" class="menu__item" role="menuitem" @click="openCombine">
                <IIcon name="combine" :size="14" />
                <span>
                  <span class="menu__item-title">Combine tables</span>
                  <span class="menu__item-desc">Join / Append 现有表</span>
                </span>
              </button>
              <div class="menu__sep" role="separator" />
              <button type="button" class="menu__item" role="menuitem" disabled aria-disabled="true">
                <IIcon name="database" :size="14" />
                <span>
                  <span class="menu__item-title">From Registry</span>
                  <span class="menu__item-desc">后续版本</span>
                </span>
              </button>
              <button type="button" class="menu__item" role="menuitem" disabled aria-disabled="true">
                <IIcon name="plate" :size="14" />
                <span>
                  <span class="menu__item-title">From Plate</span>
                  <span class="menu__item-desc">后续版本</span>
                </span>
              </button>
            </div>
          </template>
        </IPopover>
      </div>
    </header>

    <div class="ws__body">
      <SidebarTree @add-data="addDataOpen = true" />
      <main class="ws__main">
        <KeepAlive>
          <component :is="modeComponent" :key="mode" @add-data="addDataOpen = true" />
        </KeepAlive>
      </main>
    </div>

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

    <!-- CSV 导入 / 表合并 -->
    <CsvImportDialog :open="csvImportOpen" @update:open="csvImportOpen = $event" />
    <CombineTablesDialog :open="combineOpen" @update:open="combineOpen = $event" />

    <div v-if="loading" class="ws__loading">加载中…</div>
  </div>
</template>

<style scoped>
.ws {
  height: 100%;
  display: flex;
  flex-direction: column;
}
.ws__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  height: 52px;
  padding: 0 16px;
  background: var(--is-surface);
  border-bottom: 1px solid var(--is-border);
  flex-shrink: 0;
}
.ws__breadcrumb {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  font-size: var(--is-text-sm);
}
.ws__crumb-link {
  color: var(--is-text-secondary);
}
.ws__crumb-link:hover {
  color: var(--is-accent);
}
.ws__crumb-sep {
  color: var(--is-text-tertiary);
}
.ws__crumb-current {
  font-weight: 600;
  max-width: 320px;
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
  gap: 6px;
}
.ws__body {
  flex: 1;
  min-height: 0;
  display: flex;
}
.ws__main {
  flex: 1;
  min-width: 0;
  min-height: 0;
}
.ws__loading {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--is-bg);
  color: var(--is-text-secondary);
  z-index: 10;
}

.menu {
  padding: 4px;
  display: flex;
  flex-direction: column;
  min-width: 180px;
}
.menu--adddata {
  width: 260px;
}
.menu__item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: var(--is-radius-sm);
  font-size: var(--is-text-sm);
  text-align: left;
  color: var(--is-text);
  transition: background-color var(--is-dur-fast) var(--is-ease);
}
.menu__item:hover:not(:disabled) {
  background: var(--is-surface-hover);
}
.menu__item:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.menu__item > span {
  display: flex;
  flex-direction: column;
}
.menu__item-title {
  font-size: var(--is-text-sm);
  font-weight: 500;
}
.menu__item-desc {
  font-size: var(--is-text-xs);
  color: var(--is-text-tertiary);
}
.menu__item--danger {
  color: var(--is-danger);
}
.menu__item--danger:hover {
  background: var(--is-danger-soft);
}
.menu__sep {
  height: 1px;
  background: var(--is-border);
  margin: 4px 6px;
}
.confirm-text {
  font-size: var(--is-text-sm);
  color: var(--is-text-secondary);
  line-height: 1.6;
}
</style>
