<script setup lang="ts">
/**
 * Report 节点专用面板：报告预览 / 报告内容编辑 + AI 写报告。
 * 编辑态与预览态共用本组件，预览态传入 readonly 只读展示。
 */
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import type { AnalysisReport, StepNode } from '../../../shared/types'
import { useAnalysisStore } from '../../../stores/analysisStore'
import { IButton, IIcon, type IconName } from '../../../ui'
import { readReportConfig } from '../report/reportModel'
import ReportPreview from './ReportPreview.vue'
import ReportEditor from './ReportEditor.vue'
import ReportAiAssist from './ReportAiAssist.vue'

const props = withDefaults(defineProps<{ step: StepNode; readonly?: boolean }>(), {
  readonly: false,
})
const emit = defineEmits<{ (e: 'change'): void }>()

const store = useAnalysisStore()
const { current } = storeToRefs(store)

const activeTab = ref<'preview' | 'content'>('preview')

const reportDoc = computed(() => readReportConfig(props.step.config))

/* ------------------------------ AI 写报告 ------------------------------ */

const aiOpen = ref(false)
const aiMinimized = ref(false)

/* AI 窗为固定悬浮窗：浮在详情面板左侧（盖住 flowchart），不参与面板布局。
   位置由本组件根节点的位置推算，窗口 resize / 面板尺寸变化时重算。 */
const rpEl = ref<HTMLElement | null>(null)
const aiFloatStyle = ref<Record<string, string>>({})
const aiFabStyle = ref<Record<string, string>>({})
let aiResizeObs: ResizeObserver | null = null

const AI_FLOAT_W = 340
const AI_FLOAT_GAP = 12

function positionAiFloat() {
  const el = rpEl.value
  if (!el) return
  const r = el.getBoundingClientRect()
  const vw = window.innerWidth
  const vh = window.innerHeight
  const h = Math.min(Math.max(r.height, 360), vh - 16)
  // 首选：面板左侧；放不下（如下侧布局贴左边界）则悬浮到面板上方
  let left = r.left - AI_FLOAT_W - AI_FLOAT_GAP
  let top = Math.max(8, Math.min(r.top, vh - h - 8))
  if (left < 8) {
    left = Math.max(8, Math.min(r.left, vw - AI_FLOAT_W - 8))
    top = Math.max(8, r.top - h - AI_FLOAT_GAP)
  }
  aiFloatStyle.value = {
    left: `${Math.round(left)}px`,
    top: `${Math.round(top)}px`,
    width: `${AI_FLOAT_W}px`,
    height: `${Math.round(h)}px`,
  }
  aiFabStyle.value = {
    left: `${Math.round(left + AI_FLOAT_W - 36)}px`,
    top: `${Math.round(top)}px`,
  }
}

function startAiPositioning() {
  void nextTick(() => {
    positionAiFloat()
    if (!aiResizeObs && rpEl.value) {
      aiResizeObs = new ResizeObserver(() => positionAiFloat())
      aiResizeObs.observe(rpEl.value)
    }
  })
}

function stopAiPositioning() {
  aiResizeObs?.disconnect()
  aiResizeObs = null
}

watch(aiOpen, (open) => {
  if (open) startAiPositioning()
  else stopAiPositioning()
})

function onAiToggle() {
  if (aiOpen.value) {
    aiOpen.value = false
    aiMinimized.value = false
  } else {
    aiOpen.value = true
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('resize', positionAiFloat)
}
onBeforeUnmount(() => {
  if (typeof window !== 'undefined') window.removeEventListener('resize', positionAiFloat)
  stopAiPositioning()
})

/* ------------------------------ 配置写回 ------------------------------ */

function onReportUpdate(v: AnalysisReport) {
  if (props.readonly) return
  props.step.config.report = v
  emit('change')
}

function applyAiReport(r: AnalysisReport) {
  if (props.readonly) return
  props.step.config.report = r
  emit('change')
}

/* ------------------------------ 错误与日志 ------------------------------ */

const errorOpen = ref(true)
const reportStderr = computed(() => String(props.step.config.__stderr ?? ''))
const reportStdout = computed(() => String(props.step.config.__stdout ?? ''))

const hasErrorArea = computed(
  () => !!(props.step.error || reportStderr.value || reportStdout.value),
)

/* ------------------------------ 标签页 ------------------------------ */

const tabs: { key: 'preview' | 'content'; label: string; icon: IconName }[] = [
  { key: 'preview', label: '报告预览', icon: 'file-text' },
  { key: 'content', label: '报告内容', icon: 'edit' },
]
</script>

<template>
  <div ref="rpEl" class="rpt">
    <!-- 状态栏 -->
    <div class="rpt__status-bar">
      <span class="rpt__meta">{{ reportDoc.sections.length }} 个章节</span>
      <div class="rpt__status-actions">
        <IButton v-if="!readonly" size="sm" variant="ghost" icon="sparkle" @click="onAiToggle">
          AI 写报告
        </IButton>
      </div>
    </div>

    <!-- 标签页 -->
    <div class="rpt__tabs" role="tablist">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        type="button"
        role="tab"
        class="rpt__tab"
        :class="{ 'rpt__tab--active': activeTab === tab.key }"
        :aria-selected="activeTab === tab.key"
        @click="activeTab = tab.key"
      >
        <IIcon :name="tab.icon" :size="13" />
        <span>{{ tab.label }}</span>
      </button>
    </div>

    <!-- 报告预览 -->
    <div v-show="activeTab === 'preview'" class="rpt__pane rpt__pane--preview">
      <ReportPreview :report="reportDoc" :analysis="current" />
    </div>

    <!-- 报告内容（与编辑页同组件，readonly 只读展示） -->
    <div v-show="activeTab === 'content'" class="rpt__pane">
      <ReportEditor
        :report="reportDoc"
        :analysis="current"
        :readonly="readonly"
        @update:report="onReportUpdate"
      />
    </div>

    <!-- 错误与日志 -->
    <section v-if="hasErrorArea" class="rpt__errbox">
      <div class="rpt__errbox-head">
        <button type="button" class="rpt__errbox-toggle" @click="errorOpen = !errorOpen">
          <IIcon :name="errorOpen ? 'chevron-down' : 'chevron-right'" :size="12" />
          <span>错误与日志</span>
        </button>
      </div>
      <template v-if="errorOpen">
        <p v-if="step.error" class="rpt__errbox-error">{{ step.error }}</p>
        <pre v-if="reportStderr" class="rpt__log rpt__log--err">{{ reportStderr }}</pre>
        <pre v-if="reportStdout" class="rpt__log">{{ reportStdout }}</pre>
      </template>
    </section>

    <!-- AI 悬浮窗：Teleport 到 body，固定悬浮在面板左侧，不参与面板布局 -->
    <Teleport to="body">
      <div v-if="aiOpen && !readonly && aiMinimized" class="rpt__ai-fab" :style="aiFabStyle" title="展开 AI 写报告">
        <button type="button" class="rpt__ai-fab-btn" aria-label="展开 AI 写报告" @click="aiMinimized = false">
          <IIcon name="sparkle" :size="16" />
        </button>
      </div>
      <div
        v-else-if="aiOpen && !readonly"
        class="rpt__ai-float"
        :style="aiFloatStyle"
        role="complementary"
        aria-label="AI 写报告"
      >
        <ReportAiAssist
          :step="step"
          :analysis="current"
          :report="reportDoc"
          @apply="applyAiReport"
          @minimize="aiMinimized = true"
          @close="onAiToggle"
        />
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.rpt {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.rpt__status-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--is-border);
  background: var(--is-surface-hover);
  flex-shrink: 0;
}
.rpt__meta {
  font-size: 11px;
  color: var(--is-text-tertiary);
}
.rpt__status-actions {
  margin-left: auto;
}

.rpt__tabs {
  display: flex;
  gap: 2px;
  padding: 6px 8px 0;
  border-bottom: 1px solid var(--is-border);
  background: var(--is-surface);
  flex-shrink: 0;
}
.rpt__tab {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border: 0;
  border-bottom: 2px solid transparent;
  background: transparent;
  font-size: 12px;
  color: var(--is-text-secondary);
  cursor: pointer;
}
.rpt__tab:hover {
  color: var(--is-text);
}
.rpt__tab--active {
  color: var(--is-accent);
  border-bottom-color: var(--is-accent);
  font-weight: 600;
}

.rpt__pane {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 12px;
}
.rpt__pane--preview {
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.rpt__errbox {
  flex-shrink: 0;
  max-height: 220px;
  overflow-y: auto;
  padding: 0 12px 8px;
  border-top: 1px solid var(--is-border);
}
.rpt__errbox-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 0;
  position: sticky;
  top: 0;
  background: var(--is-surface);
  z-index: 1;
}
.rpt__errbox-toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 2px 4px;
  border: 0;
  border-radius: 4px;
  background: transparent;
  font-size: 12px;
  font-weight: 600;
  color: var(--is-text-secondary);
  cursor: pointer;
}
.rpt__errbox-toggle:hover {
  color: var(--is-text);
}
.rpt__errbox-error {
  margin: 0 0 8px;
  padding: 8px 10px;
  border-radius: 6px;
  font-size: 12px;
  color: var(--is-danger);
  background: var(--is-danger-soft);
}
.rpt__log {
  margin: 0;
  padding: 10px;
  background: #f8fafc;
  border: 1px solid var(--is-border);
  border-radius: 6px;
  font-size: 11px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 300px;
  overflow: auto;
}
.rpt__log--err {
  background: #fef3f2;
  border-color: #fecdca;
  color: #b42318;
}

/* AI 悬浮窗（Teleport 到 body）：固定定位、盖在面板左侧，不占布局 */
.rpt__ai-float {
  position: fixed;
  z-index: 60;
  display: flex;
  flex-direction: column;
  background: var(--is-surface);
  border: 1px solid var(--is-border);
  border-radius: 10px;
  box-shadow: 0 8px 28px rgba(15, 23, 42, 0.18);
  overflow: hidden;
}
.rpt__ai-float :deep(.rai) {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  margin-bottom: 0;
  border: 0;
  border-radius: 0;
}
.rpt__ai-float :deep(.rai__body) {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.rpt__ai-fab {
  position: fixed;
  z-index: 60;
}
.rpt__ai-fab-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 1px solid var(--is-border);
  border-radius: 8px;
  background: var(--is-surface);
  color: var(--is-accent);
  box-shadow: 0 4px 14px rgba(15, 23, 42, 0.16);
  cursor: pointer;
}
.rpt__ai-fab-btn:hover {
  background: var(--is-accent-soft);
}
</style>
