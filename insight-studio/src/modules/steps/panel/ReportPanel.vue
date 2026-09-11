<script setup lang="ts">
/**
 * Report 节点专用面板：全宽预览 + 紧凑顶栏（主题 popover / AI 撰写 / 导出 PDF）。
 * 删除右侧主题栏与双入口「AI 写报告」；AI 走 reportAiStore agent-loop。
 */
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import type { AnalysisReport, ReportTemplateId, StepNode } from '../../../shared/types'
import { useAnalysisStore } from '../../../stores/analysisStore'
import { IButton, IIcon, IPopover, type IconName } from '../../../ui'
import { readReportConfig } from '../report/reportModel'
import { resolveTemplateId } from '../report/reportTemplates'
import ReportThemeThumbs from '../report/ReportThemeThumbs.vue'
import ReportPreview from './ReportPreview.vue'
import ReportEditor from './ReportEditor.vue'
import ReportAiChat from './ReportAiChat.vue'

const props = withDefaults(defineProps<{ step: StepNode; readonly?: boolean }>(), {
  readonly: false,
})
const emit = defineEmits<{ (e: 'change'): void }>()

const store = useAnalysisStore()
const { current } = storeToRefs(store)

const activeTab = ref<'preview' | 'content'>('preview')

/**
 * AI（reportAiStore → update_report_step）经 analysisStore.mutate 写 step.config.report。
 * 预览必须从 store 按 stepId 取 live step，并显式依赖 revision（与 ReportEmbedChart /
 * TableChartWorkspace 同一套路），避免 props.step 快照或深层追踪漏失导致 ReportPreview 不刷新。
 */
const liveStep = computed(() => {
  const id = props.step.id
  return current.value?.steps.find((s) => s.id === id) ?? props.step
})

const reportDoc = computed(() => {
  void current.value?.revision
  return readReportConfig(liveStep.value.config)
})

/* ------------------------------ 主题 popover ------------------------------ */

const themeOpen = ref(false)

const activeTheme = computed((): ReportTemplateId =>
  resolveTemplateId(reportDoc.value.theme ?? reportDoc.value.templateId),
)

function setTheme(id: ReportTemplateId) {
  if (props.readonly) return
  const nextId = resolveTemplateId(id)
  const cur = reportDoc.value
  const stepId = props.step.id
  store.mutate((a) => {
    const target = a.steps.find((s) => s.id === stepId)
    if (!target) return
    target.config.report = {
      ...cur,
      theme: nextId,
      templateId: nextId,
    }
  })
  emit('change')
  themeOpen.value = false
}

/* ------------------------------ AI 撰写 ------------------------------ */

const aiOpen = ref(false)

const rpEl = ref<HTMLElement | null>(null)
const aiFloatStyle = ref<Record<string, string>>({})
let aiResizeObs: ResizeObserver | null = null

const AI_FLOAT_W = 360
const AI_FLOAT_GAP = 12

function positionAiFloat() {
  const el = rpEl.value
  if (!el) return
  const r = el.getBoundingClientRect()
  const vw = window.innerWidth
  const vh = window.innerHeight
  const h = Math.min(Math.max(r.height, 360), vh - 16)
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
  aiOpen.value = !aiOpen.value
}

if (typeof window !== 'undefined') {
  window.addEventListener('resize', positionAiFloat)
}
onBeforeUnmount(() => {
  if (typeof window !== 'undefined') window.removeEventListener('resize', positionAiFloat)
  stopAiPositioning()
})

/* ------------------------------ 导出 PDF ------------------------------ */

const previewRef = ref<{ printPdf: () => void | Promise<void> } | null>(null)

async function onExportPdf() {
  await previewRef.value?.printPdf()
}

/* ------------------------------ 配置写回 ------------------------------ */

function onReportUpdate(v: AnalysisReport) {
  if (props.readonly) return
  const stepId = props.step.id
  store.mutate((a) => {
    const target = a.steps.find((s) => s.id === stepId)
    if (!target) return
    target.config.report = v
  })
  emit('change')
}

/* ------------------------------ 错误与日志 ------------------------------ */

const errorOpen = ref(true)
const reportStderr = computed(() => String(liveStep.value.config.__stderr ?? ''))
const reportStdout = computed(() => String(liveStep.value.config.__stdout ?? ''))
const hasErrorArea = computed(
  () => !!(liveStep.value.error || reportStderr.value || reportStdout.value),
)

const tabs: { key: 'preview' | 'content'; label: string; icon: IconName }[] = [
  { key: 'preview', label: '报告预览', icon: 'file-text' },
  { key: 'content', label: '报告内容', icon: 'edit' },
]
</script>

<template>
  <div ref="rpEl" class="rpt">
    <!-- 紧凑顶栏 (~36–40px)：tabs | 主题 popover | AI 撰写 | 导出 PDF -->
    <div class="rpt__chrome" data-testid="report-chrome">
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

      <div class="rpt__chrome-actions">
        <IPopover :open="themeOpen" placement="bottom-end" :arrow="false" @update:open="themeOpen = $event">
          <template #anchor>
            <IButton
              size="sm"
              variant="ghost"
              data-testid="report-theme-trigger"
              :disabled="readonly"
              @click="themeOpen = !themeOpen"
            >
              主题 · {{ activeTheme }}
              <IIcon name="chevron-down" :size="12" />
            </IButton>
          </template>
          <div class="rpt__theme-pop" data-testid="report-theme-popover">
            <p class="rpt__theme-pop-hint">切换主题只改视觉样式，不改写正文。</p>
            <ReportThemeThumbs
              :model-value="activeTheme"
              variant="mini"
              :disabled="readonly"
              @update:model-value="setTheme"
            />
          </div>
        </IPopover>

        <IButton
          v-if="!readonly"
          size="sm"
          variant="secondary"
          icon="sparkle"
          data-testid="report-ai-write"
          @click="onAiToggle"
        >
          AI 撰写
        </IButton>

        <IButton
          v-if="activeTab === 'preview'"
          size="sm"
          variant="ghost"
          icon="file-text"
          data-testid="report-export-pdf"
          @click="onExportPdf"
        >
          导出 PDF
        </IButton>
      </div>
    </div>

    <!-- 全宽预览（无右侧主题栏） -->
    <div v-show="activeTab === 'preview'" class="rpt__pane rpt__pane--preview">
      <ReportPreview
        ref="previewRef"
        :report="reportDoc"
        :analysis="current"
        hide-toolbar
      />
    </div>

    <div v-show="activeTab === 'content'" class="rpt__pane">
      <ReportEditor
        :report="reportDoc"
        :analysis="current"
        :readonly="readonly"
        @update:report="onReportUpdate"
      />
    </div>

    <section v-if="hasErrorArea" class="rpt__errbox">
      <div class="rpt__errbox-head">
        <button type="button" class="rpt__errbox-toggle" @click="errorOpen = !errorOpen">
          <IIcon :name="errorOpen ? 'chevron-down' : 'chevron-right'" :size="12" />
          <span>错误与日志</span>
        </button>
      </div>
      <template v-if="errorOpen">
        <p v-if="liveStep.error" class="rpt__errbox-error">{{ liveStep.error }}</p>
        <pre v-if="reportStderr" class="rpt__log rpt__log--err">{{ reportStderr }}</pre>
        <pre v-if="reportStdout" class="rpt__log">{{ reportStdout }}</pre>
      </template>
    </section>

    <!-- 仅顶栏「AI 撰写」入口；无最小化 FAB / 无全局第二气泡 -->
    <Teleport to="body">
      <div
        v-if="aiOpen && !readonly"
        class="rpt__ai-float"
        :style="aiFloatStyle"
        role="complementary"
        aria-label="AI 撰写"
        data-testid="report-ai-float"
      >
        <ReportAiChat :step-id="liveStep.id" @minimize="onAiToggle" @close="onAiToggle" />
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

.rpt__chrome {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 36px;
  max-height: 40px;
  padding: 0 8px;
  border-bottom: 1px solid var(--is-border);
  background: var(--is-surface);
  flex-shrink: 0;
}

.rpt__tabs {
  display: flex;
  gap: 2px;
  align-items: stretch;
  min-width: 0;
}

.rpt__tab {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
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

.rpt__chrome-actions {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.rpt__theme-pop {
  padding: 10px 12px;
  min-width: 220px;
}
.rpt__theme-pop-hint {
  margin: 0 0 8px;
  font-size: 11px;
  color: var(--is-text-tertiary);
  line-height: 1.4;
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
  padding: 0;
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
.rpt__ai-float :deep(.rac) {
  flex: 1;
  min-height: 0;
  height: 100%;
}
</style>
