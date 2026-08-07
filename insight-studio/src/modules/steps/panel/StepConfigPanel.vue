<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import type { StepNode } from '../../../shared/types'
import { useAnalysisStore } from '../../../stores/analysisStore'
import { IButton, IIcon, ITextField, toast, type IconName } from '../../../ui'
import { getStepDef } from '../registry'
import { previewStep } from '../exec'
import type { StepPreviewResult } from '../exec'
import StepConfigForm from './StepConfigForm.vue'
import { refreshSqlSourceStep } from '../../table/refreshSqlSource'
import type { DetailLayout } from '../../flowchart/NodeDetailCard.vue'

/**
 * 步骤配置面板（草稿语义）：
 * - 表单直接编辑 step.config 以驱动 150ms 防抖预览，但不落盘；
 * - Save：应用名称并由画布重跑物化 + 落盘；
 * - Cancel / Esc / 点空白：由画布恢复快照（本组件只负责发出语义事件）。
 * - docked=true：嵌入流程图 ISplitPane 第二栏（与节点详情同布局）；否则为叠层抽屉（工作区等）。
 */
const props = withDefaults(
  defineProps<{
    step: StepNode
    docked?: boolean
    layout?: DetailLayout
  }>(),
  { docked: false, layout: 'right' },
)
const emit = defineEmits<{
  (e: 'close', canceled: boolean): void
  (e: 'save', name: string): void
  (e: 'delete'): void
  (e: 'update:layout', layout: DetailLayout): void
}>()

const store = useAnalysisStore()
const { current } = storeToRefs(store)

const def = computed(() => getStepDef(props.step.type))
const nameInput = ref(props.step.name)
const isFullscreen = ref(false)
const preview = ref<StepPreviewResult | null>(null)
const previewLoading = ref(false)

const LAYOUT_OPTIONS: { value: DetailLayout; label: string; icon: IconName }[] = [
  { value: 'right', label: '右侧固定', icon: 'panel-right' },
  { value: 'bottom', label: '下侧固定', icon: 'panel-bottom' },
]

/** 打开时的配置快照（仅用于 dirty 比较；撤销恢复由画布统一做）。 */
const snapshot = ref('')
const inputsSnapshot = ref('')

watch(() => props.step.name, (v) => { nameInput.value = v })

const dirty = computed(() => {
  if (nameInput.value.trim() !== props.step.name) return true
  if (JSON.stringify(props.step.config) !== snapshot.value) return true
  if (JSON.stringify(props.step.inputs) !== inputsSnapshot.value) return true
  return false
})

let previewTimer: ReturnType<typeof setTimeout> | null = null
function schedulePreview() {
  if (!current.value) return
  if (props.step.type === 'custom-code' || props.step.type === 'report') {
    preview.value = null
    previewLoading.value = false
    return
  }
  if (previewTimer) clearTimeout(previewTimer)
  previewLoading.value = true
  previewTimer = setTimeout(() => {
    previewTimer = null
    preview.value = previewStep(current.value!, props.step, 50)
    previewLoading.value = false
  }, 150)
}

watch(() => props.step.config, schedulePreview, { deep: true, immediate: true })

function onConfigChange() {
  schedulePreview()
}

onMounted(() => {
  snapshot.value = JSON.stringify(props.step.config)
  inputsSnapshot.value = JSON.stringify(props.step.inputs)
})

onBeforeUnmount(() => {
  if (previewTimer) clearTimeout(previewTimer)
})

function save() {
  emit('save', nameInput.value.trim() || props.step.name)
}

function cancel() {
  emit('close', true)
}

const refreshingSql = ref(false)
const isQuerySql = computed(() => props.step.type === 'query-sql')
const lastSyncedLabel = computed(() => {
  const iso = props.step.config.lastSyncedAt
  if (typeof iso !== 'string' || !iso) return ''
  const t = Date.parse(iso)
  if (!Number.isFinite(t)) return iso
  try {
    return new Date(t).toLocaleString('zh-CN')
  } catch {
    return iso
  }
})

async function onRefreshSql(): Promise<void> {
  if (refreshingSql.value) return
  refreshingSql.value = true
  try {
    const r = await refreshSqlSourceStep(props.step.id)
    if (r.mode === 'unchanged') toast.success('数据源无变化')
    else toast.success(`数据源已刷新（${r.rowCount} 行）`)
  } catch (e) {
    toast.error(e instanceof Error ? e.message : '刷新失败')
  } finally {
    refreshingSql.value = false
  }
}
</script>

<template>
  <aside
    class="step-panel"
    :class="{
      'step-panel--docked': docked,
      'step-panel--fullscreen': !docked && isFullscreen,
    }"
    @keydown.esc.stop="cancel"
  >
    <header class="step-panel__header">
      <div class="step-panel__head-left">
        <h2 class="step-panel__title">Configure step</h2>
        <span class="step-panel__type">{{ def.label }}</span>
      </div>
      <div class="step-panel__head-actions">
        <div v-if="docked" class="step-panel__layout" role="group" aria-label="详情展示方式">
          <button
            v-for="opt in LAYOUT_OPTIONS"
            :key="opt.value"
            type="button"
            class="step-panel__layout-btn"
            :class="{ 'step-panel__layout-btn--on': layout === opt.value }"
            :title="opt.label"
            :aria-label="opt.label"
            :aria-pressed="layout === opt.value"
            @click="emit('update:layout', opt.value)"
          >
            <IIcon :name="opt.icon" :size="13" />
          </button>
        </div>
        <button
          v-if="!docked"
          type="button"
          class="step-panel__action"
          :title="isFullscreen ? '退出全屏' : '全屏'"
          @click="isFullscreen = !isFullscreen"
        >
          <IIcon :name="isFullscreen ? 'close' : 'expand'" :size="14" />
        </button>
        <button type="button" class="step-panel__action" title="关闭" @click="cancel">
          <IIcon name="close" :size="14" />
        </button>
      </div>
    </header>

    <div class="step-panel__body">
      <section v-if="isQuerySql" class="step-panel__section">
        <h3 class="step-panel__section-title">SQL 数据源</h3>
        <p v-if="lastSyncedLabel" class="step-panel__hint">上次同步：{{ lastSyncedLabel }}</p>
        <IButton
          size="sm"
          icon="refresh"
          :loading="refreshingSql"
          data-testid="sql-source-refresh-panel"
          @click="onRefreshSql"
        >
          刷新数据源
        </IButton>
      </section>

      <div v-if="isQuerySql" class="step-panel__divider" />

      <section class="step-panel__section">
        <h3 class="step-panel__section-title">Step details</h3>
        <div class="step-panel__field">
          <label class="step-panel__label">Node name</label>
          <ITextField v-model="nameInput" size="sm" aria-label="步骤名称" />
        </div>
      </section>

      <div class="step-panel__divider" />

      <section class="step-panel__section step-panel__section--form">
        <StepConfigForm :step="step" @change="onConfigChange" />
      </section>

      <div class="step-panel__divider" />

      <section v-if="step.type !== 'custom-code' && step.type !== 'report'" class="step-panel__section">
        <div class="step-panel__preview">
          <div class="step-panel__preview-head">
            <span class="step-panel__preview-title">Preview</span>
            <span v-if="preview && !preview.error" class="step-panel__preview-count">{{ preview.totalRows }} rows</span>
          </div>
          <div v-if="preview?.stats?.length" class="step-panel__preview-stats">
            <span v-for="s in preview.stats" :key="s.label" class="step-panel__preview-stat">
              {{ s.label }} <b>{{ s.value }}</b>
            </span>
          </div>
          <div v-if="previewLoading" class="step-panel__preview-loading">Loading preview…</div>
          <div v-else-if="preview?.error" class="step-panel__preview-error">{{ preview.error }}</div>
          <div v-else-if="preview && preview.rows.length" class="step-panel__preview-table-wrap">
            <table class="step-panel__preview-table">
              <thead>
                <tr>
                  <th v-for="c in preview.columns" :key="c.field">{{ c.title }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, i) in preview.rows" :key="i">
                  <td v-for="c in preview.columns" :key="c.field">{{ row[c.field] ?? '' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-else class="step-panel__preview-empty">无预览数据</div>
        </div>
      </section>
      <section v-else class="step-panel__section">
        <p class="step-panel__preview-empty">
          <template v-if="step.type === 'report'">
            报告为独立节点，无需连线；内容与科研主题预览见上方，可用「导出 PDF」打印。
          </template>
          <template v-else>
            Custom Code 在 Save 后由 Python Worker 执行；输出表 / 图 / 文件与日志见上方编辑区。
          </template>
        </p>
      </section>
    </div>

    <footer class="step-panel__footer">
      <IButton variant="ghost" icon="trash" @click="emit('delete')">Delete</IButton>
      <div class="step-panel__footer-right">
        <IButton @click="cancel">Cancel</IButton>
        <IButton variant="primary" :class="{ 'step-panel__save--dirty': dirty }" @click="save">Save</IButton>
      </div>
    </footer>
  </aside>
</template>

<style scoped>
.step-panel {
  position: absolute;
  top: 0;
  right: 0;
  width: 340px;
  height: 100%;
  background: var(--is-surface);
  border-left: 1px solid var(--is-border);
  box-shadow: var(--is-shadow-lg);
  z-index: 9;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
}
/* 嵌入 ISplitPane：填满分栏，与 NodeDetailCard docked 一致 */
.step-panel--docked {
  position: relative;
  top: auto;
  right: auto;
  width: 100%;
  height: 100%;
  border-left: none;
  box-shadow: none;
  z-index: auto;
}
.step-panel--fullscreen {
  width: 100%;
}
.step-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  height: 52px;
  padding: 0 16px;
  border-bottom: 1px solid var(--is-border);
  flex-shrink: 0;
}
.step-panel__head-left {
  display: flex;
  align-items: baseline;
  gap: 8px;
  min-width: 0;
}
.step-panel__title {
  font-size: var(--is-text-md);
  font-weight: 600;
  letter-spacing: -0.01em;
  white-space: nowrap;
}
.step-panel__type {
  font-size: var(--is-text-xs);
  color: var(--is-text-tertiary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.step-panel__head-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}
.step-panel__layout {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 2px;
  margin-right: 2px;
  border-radius: var(--is-radius-sm);
  background: var(--is-surface-hover);
}
.step-panel__layout-btn {
  display: inline-flex;
  padding: 4px;
  border-radius: calc(var(--is-radius-sm) - 1px);
  color: var(--is-text-tertiary);
}
.step-panel__layout-btn:hover {
  color: var(--is-text);
}
.step-panel__layout-btn--on {
  background: var(--is-surface);
  color: var(--is-text);
  box-shadow: var(--is-shadow-sm, 0 1px 2px rgba(16, 24, 40, 0.08));
}
.step-panel__action {
  display: inline-flex;
  padding: 6px;
  border-radius: var(--is-radius-sm);
  color: var(--is-text-tertiary);
}
.step-panel__action:hover {
  background: var(--is-surface-hover);
  color: var(--is-text);
}
.step-panel__body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}
.step-panel__section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px 16px;
}
.step-panel__section--form {
  flex: 1;
  min-height: 0;
}
.step-panel__section:first-child {
  padding-top: 16px;
}
.step-panel__divider {
  height: 1px;
  margin: 0 16px;
  background: var(--is-border);
  flex-shrink: 0;
}
.step-panel__section-title {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--is-text-tertiary);
}
.step-panel__field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.step-panel__label {
  font-size: var(--is-text-xs);
  font-weight: 600;
  color: var(--is-text-secondary);
}
.step-panel__hint {
  margin: 0 0 8px;
  font-size: var(--is-text-xs);
  color: var(--is-text-tertiary);
}
.step-panel__preview {
  border: 1px solid var(--is-border);
  border-radius: var(--is-radius);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-height: 120px;
}
.step-panel__preview-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  background: var(--is-surface-hover);
  border-bottom: 1px solid var(--is-border);
}
.step-panel__preview-title {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--is-text-tertiary);
}
.step-panel__preview-count {
  font-size: var(--is-text-xs);
  color: var(--is-text-secondary);
}
.step-panel__preview-stats {
  display: flex;
  gap: 12px;
  padding: 6px 10px;
  font-size: var(--is-text-xs);
  color: var(--is-text-secondary);
  border-bottom: 1px solid var(--is-border);
}
.step-panel__preview-stat b {
  color: var(--is-text);
  font-weight: 600;
}
.step-panel__preview-table-wrap {
  overflow: auto;
  max-height: 260px;
}
.step-panel__preview-table {
  border-collapse: collapse;
  width: 100%;
  font-size: var(--is-text-xs);
}
.step-panel__preview-table th {
  position: sticky;
  top: 0;
  background: var(--is-surface-hover);
  padding: 5px 8px;
  text-align: left;
  border-bottom: 1px solid var(--is-border);
}
.step-panel__preview-table td {
  padding: 4px 8px;
  border-bottom: 1px solid var(--is-border);
  color: var(--is-text-secondary);
}
.step-panel__preview-loading,
.step-panel__preview-empty {
  padding: 16px;
  text-align: center;
  font-size: var(--is-text-sm);
  color: var(--is-text-tertiary);
}
.step-panel__preview-error {
  padding: 12px;
  font-size: var(--is-text-xs);
  color: var(--is-danger);
  background: var(--is-danger-soft);
}
.step-panel__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid var(--is-border);
}
.step-panel__footer-right {
  display: flex;
  align-items: center;
  gap: 8px;
}
.step-panel__save--dirty {
  box-shadow: 0 0 0 3px rgba(30, 42, 120, 0.18);
}
</style>
