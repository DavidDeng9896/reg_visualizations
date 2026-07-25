<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import type { StepNode } from '../../../shared/types'
import { useAnalysisStore } from '../../../stores/analysisStore'
import { IButton, IIcon, ITextField } from '../../../ui'
import { getStepDef } from '../registry'
import { previewStep } from '../exec'
import type { StepPreviewResult } from '../exec'
import StepConfigForm from './StepConfigForm.vue'

/**
 * 步骤配置面板（草稿语义）：
 * - 表单直接编辑 step.config 以驱动 150ms 防抖预览，但不落盘；
 * - Save：应用名称并由画布重跑物化 + 落盘；
 * - Cancel / Esc / 点空白：由画布恢复快照（本组件只负责发出语义事件）。
 */
const props = defineProps<{ step: StepNode }>()
const emit = defineEmits<{ (e: 'close', canceled: boolean): void; (e: 'save', name: string): void; (e: 'delete'): void }>()

const store = useAnalysisStore()
const { current } = storeToRefs(store)

const def = computed(() => getStepDef(props.step.type))
const nameInput = ref(props.step.name)
const isFullscreen = ref(false)
const preview = ref<StepPreviewResult | null>(null)
const previewLoading = ref(false)

/** 打开时的配置快照（仅用于 dirty 比较；撤销恢复由画布统一做）。 */
const snapshot = ref('')

watch(() => props.step.name, (v) => { nameInput.value = v })

const dirty = computed(() => {
  if (nameInput.value.trim() !== props.step.name) return true
  return JSON.stringify(props.step.config) !== snapshot.value
})

let previewTimer: ReturnType<typeof setTimeout> | null = null
function schedulePreview() {
  if (!current.value) return
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
</script>

<template>
  <Transition name="step-panel">
    <aside class="step-panel" :class="{ 'step-panel--fullscreen': isFullscreen }" @keydown.esc.stop="cancel">
      <header class="step-panel__header">
        <div class="step-panel__head-left">
          <ITextField v-model="nameInput" size="sm" class="step-panel__name" aria-label="步骤名称" />
          <span class="step-panel__type">{{ def.label }}</span>
        </div>
        <div class="step-panel__head-actions">
          <button type="button" class="step-panel__action" :title="isFullscreen ? '退出全屏' : '全屏'" @click="isFullscreen = !isFullscreen">
            <IIcon :name="isFullscreen ? 'close' : 'expand'" :size="14" />
          </button>
          <button type="button" class="step-panel__action" title="关闭" @click="cancel">
            <IIcon name="close" :size="14" />
          </button>
        </div>
      </header>

      <div class="step-panel__body">
        <div class="step-panel__form">
          <StepConfigForm :step="step" @change="onConfigChange" />
        </div>

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
      </div>

      <footer class="step-panel__footer">
        <IButton variant="ghost" icon="trash" @click="emit('delete')">Delete</IButton>
        <div class="step-panel__footer-right">
          <IButton @click="cancel">Cancel</IButton>
          <IButton variant="primary" :class="{ 'step-panel__save--dirty': dirty }" @click="save">Save</IButton>
        </div>
      </footer>
    </aside>
  </Transition>
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
}
.step-panel--fullscreen {
  width: 100%;
}
.step-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border-bottom: 1px solid var(--is-border);
}
.step-panel__head-left {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.step-panel__name {
  font-weight: 600;
}
.step-panel__type {
  font-size: var(--is-text-xs);
  color: var(--is-text-tertiary);
}
.step-panel__head-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}
.step-panel__action {
  display: inline-flex;
  padding: 6px;
  border-radius: var(--is-radius-sm);
  color: var(--is-text-secondary);
}
.step-panel__action:hover {
  background: var(--is-surface-hover);
  color: var(--is-text);
}
.step-panel__body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 16px;
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
  padding: 12px 14px;
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

.step-panel-enter-active,
.step-panel-leave-active {
  transition:
    opacity var(--is-dur) var(--is-ease),
    transform var(--is-dur) var(--is-ease);
}
.step-panel-enter-from,
.step-panel-leave-to {
  opacity: 0;
  transform: translateX(20px);
}
</style>
