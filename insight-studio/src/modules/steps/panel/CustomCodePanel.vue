<script setup lang="ts">
/**
 * Custom Code 节点专用配置面板：代码编辑 + 输入预览 + 输出/日志 + AI 辅助。
 * 编辑态与预览态共用本组件，预览态传入 readonly 只读展示。
 */
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import type { AnalysisTable, StepNode } from '../../../shared/types'
import { useAnalysisStore } from '../../../stores/analysisStore'
import { storeToRefs } from 'pinia'
import { IButton, IIcon, ISelect, type IconName, type SelectOption } from '../../../ui'
import { resolveStepInputs } from '../exec'
import PythonEditor, { type PythonCompletionSource } from './PythonEditor.vue'
import CustomCodeAiChat from './CustomCodeAiChat.vue'
import PlotlyArtifactPreview from './PlotlyArtifactPreview.vue'
import { CUSTOM_CODE_DEFAULT_TEMPLATE } from '../customCodeTemplate'

const props = withDefaults(defineProps<{ step: StepNode; readonly?: boolean }>(), {
  readonly: false,
})
const emit = defineEmits<{ (e: 'change'): void }>()

const store = useAnalysisStore()
const { current } = storeToRefs(store)

const pyEditorRef = ref<InstanceType<typeof PythonEditor> | null>(null)
const activeTab = ref<'code' | 'inputs' | 'outputs'>('code')

/* ------------------------------ AI 对话 ------------------------------ */

const aiOpen = ref(false)
const aiMinimized = ref(false)
const aiChatRef = ref<InstanceType<typeof CustomCodeAiChat> | null>(null)

/* AI 窗为固定悬浮窗：浮在详情面板左侧（盖住 flowchart），不参与面板布局、不挤编辑器。
   位置由本组件根节点的位置推算，窗口 resize / 面板尺寸变化时重算。 */
const ccpEl = ref<HTMLElement | null>(null)
const aiFloatStyle = ref<Record<string, string>>({})
const aiFabStyle = ref<Record<string, string>>({})
let aiResizeObs: ResizeObserver | null = null

const AI_FLOAT_W = 340
const AI_FLOAT_GAP = 12

function positionAiFloat() {
  const el = ccpEl.value
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
    if (!aiResizeObs && ccpEl.value) {
      aiResizeObs = new ResizeObserver(() => positionAiFloat())
      aiResizeObs.observe(ccpEl.value)
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

/* ------------------------------ 配置 ------------------------------ */

const customCodeCfg = computed(() => {
  const cfg = props.step.config as { code?: string }
  if (!cfg.code) {
    if (props.readonly) return { code: CUSTOM_CODE_DEFAULT_TEMPLATE }
    cfg.code = CUSTOM_CODE_DEFAULT_TEMPLATE
  }
  return cfg as { code: string }
})

/* ------------------------------ 输入 ------------------------------ */

const customCodeInputs = computed(() => {
  if (!current.value || props.step.type !== 'custom-code') return [] as AnalysisTable[]
  const inputs = resolveStepInputs(current.value, props.step)
  const raw = inputs['Input datasets']
  if (Array.isArray(raw)) return raw
  return raw ? [raw as AnalysisTable] : []
})

const pyCompletion = computed<PythonCompletionSource>(() => {
  const columnsByInput: Record<number, string[]> = {}
  const inputNames: string[] = []
  customCodeInputs.value.forEach((t, i) => {
    inputNames.push(t.name)
    columnsByInput[i] = t.columns.map((c) => c.field)
  })
  return { columnsByInput, inputNames }
})

const fieldInsertOptions = computed<SelectOption[]>(() => {
  const opts: SelectOption[] = []
  customCodeInputs.value.forEach((t, i) => {
    for (const c of t.columns) {
      opts.push({
        value: `inputs[${i}].data["${c.field}"]`,
        label: `${t.name} · ${c.title}`,
        icon: c.dataType === 'number' ? ('type-number' as const) : ('type-text' as const),
      })
    }
  })
  return opts
})

function insertFieldSnippet(v: string | number | null) {
  if (props.readonly || v == null || v === '') return
  pyEditorRef.value?.insertAtCursor(String(v))
  emit('change')
}

function insertColumnSnippet(inputIndex: number, field: string) {
  if (props.readonly) return
  pyEditorRef.value?.insertAtCursor(`inputs[${inputIndex}].data["${field}"]`)
  emit('change')
}

const customCodeInputsSummary = computed(() => {
  if (!customCodeInputs.value.length) return '（暂无已连接的 Input dataset）'
  return customCodeInputs.value
    .map((t, i) => `inputs[${i}] name="${t.name}" 列: ${t.columns.map((c) => c.field).join(', ')}`)
    .join('\n')
})

/* ------------------------------ 输出 ------------------------------ */

const customCodeErrorLine = computed(() => {
  const n = props.step.config.__errorLine
  return typeof n === 'number' ? n : undefined
})
const customCodeStdout = computed(() => String(props.step.config.__stdout ?? ''))
const customCodeStderr = computed(() => String(props.step.config.__stderr ?? ''))

const customCodeCharts = computed(() => {
  if (!current.value || props.step.type !== 'custom-code') return []
  const ids = props.step.output.charts ?? []
  if (!ids.length || !current.value.charts?.length) return []
  const byId = new Map(current.value.charts.map((c) => [c.id, c]))
  return ids.map((id) => byId.get(id)).filter((c): c is NonNullable<typeof c> => !!c)
})

const customCodeFiles = computed(() => {
  if (!current.value || props.step.type !== 'custom-code') return []
  const ids = props.step.output.files ?? []
  if (!ids.length || !current.value.files?.length) return []
  const byId = new Map(current.value.files.map((f) => [f.id, f]))
  return ids.map((id) => byId.get(id)).filter((f): f is NonNullable<typeof f> => !!f)
})

const customCodeTables = computed(() => {
  if (!current.value || props.step.type !== 'custom-code') return []
  const ids = props.step.output.tables ?? []
  return current.value.tables.filter((t) => ids.includes(t.id))
})

const hasOutputs = computed(
  () =>
    customCodeCharts.value.length > 0 ||
    customCodeFiles.value.length > 0 ||
    customCodeTables.value.length > 0,
)

const tabs = computed<{ key: 'code' | 'inputs' | 'outputs'; label: string; icon: IconName; badge?: boolean }[]>(() => [
  { key: 'code', label: '代码', icon: 'database' },
  { key: 'inputs', label: `输入 (${customCodeInputs.value.length})`, icon: 'table' },
  { key: 'outputs', label: '输出', icon: 'bar', badge: hasOutputs.value },
])

/* ------------------------------ 错误与日志 ------------------------------ */

const errorOpen = ref(true)

const hasErrorArea = computed(
  () => !!(props.step.error || customCodeStderr.value || customCodeStdout.value),
)

const errorTextForAi = computed(() =>
  [props.step.error, customCodeStderr.value]
    .filter((s) => !!s && s.trim().length > 0)
    .join('\n\n')
    .slice(0, 2000),
)

async function sendErrorToAi() {
  if (!errorTextForAi.value) return
  aiOpen.value = true
  aiMinimized.value = false
  await nextTick()
  aiChatRef.value?.ingestError(errorTextForAi.value)
}

/* ------------------------------ 代码操作 ------------------------------ */

function applyAiCode(code: string) {
  customCodeCfg.value.code = code
  emit('change')
}

function insertSnippet(snippet: string) {
  if (props.readonly) return
  pyEditorRef.value?.insertAtCursor(snippet)
  emit('change')
}

function formatCode() {
  // 简单格式化：去除行尾空格，确保文件末尾有换行
  const code = customCodeCfg.value.code
  const formatted = code
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .replace(/\n*$/, '\n')
  customCodeCfg.value.code = formatted
  emit('change')
}

/* ------------------------------ 模板 ------------------------------ */

const SNIPPETS: { label: string; code: string }[] = [
  {
    label: '读取输入表',
    code: `# 读取第一个输入表
df = inputs[0].data.copy()
`,
  },
  {
    label: '输出新表',
    code: `# 输出处理后的表
out = df.copy()
# ... 处理逻辑 ...
return [IOData(name="result", data=out)]
`,
  },
  {
    label: '输出图表',
    code: `# 输出 Plotly 图表
fig = go.Figure(data=[go.Scatter(x=df["x"], y=df["y"])])
fig.update_layout(title="Chart")
return [IOData(name="chart", data=fig)]
`,
  },
  {
    label: '输出文件',
    code: `# 输出 CSV 文件
buf = BytesIO()
df.to_csv(buf, index=False)
buf.seek(0)
return [IOData(name="data.csv", data=buf)]
`,
  },
  {
    label: '多输出',
    code: `return [
    IOData(name="table", data=out_df),
    IOData(name="chart", data=fig),
    IOData(name="file.csv", data=buf),
]
`,
  },
]

/* ------------------------------ 状态 ------------------------------ */

watch(
  () => props.step.status,
  (s) => {
    if (s === 'failed') activeTab.value = 'code'
  },
)
</script>

<template>
  <div ref="ccpEl" class="ccp">
    <!-- 状态栏 -->
    <div class="ccp__status-bar">
      <span v-if="customCodeInputs.length" class="ccp__input-count">
        {{ customCodeInputs.length }} 个输入
      </span>
      <div class="ccp__status-actions">
        <IButton v-if="!readonly" size="sm" variant="ghost" @click="formatCode">格式化</IButton>
      </div>
    </div>

    <!-- 标签页 -->
    <div class="ccp__tabs" role="tablist">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        type="button"
        role="tab"
        class="ccp__tab"
        :class="{ 'ccp__tab--active': activeTab === tab.key }"
        :aria-selected="activeTab === tab.key"
        @click="activeTab = tab.key"
      >
        <IIcon :name="tab.icon" :size="13" />
        <span>{{ tab.label }}</span>
        <span v-if="tab.badge" class="ccp__tab-badge" />
      </button>
    </div>

    <!-- 代码编辑 -->
    <div v-show="activeTab === 'code'" class="ccp__pane ccp__pane--code">
      <div v-if="!readonly" class="ccp__code-head">
        <button type="button" class="ccp__ai-toggle" @click="onAiToggle">
          <IIcon name="sparkle" :size="13" />
          <span>AI 助手</span>
          <IIcon :name="aiOpen ? 'chevron-down' : 'chevron-right'" :size="12" />
        </button>
      </div>

      <div class="ccp__code-body">
        <div class="ccp__code-main">
          <div class="ccp__editor">
            <PythonEditor
              ref="pyEditorRef"
              v-model="customCodeCfg.code"
              :completion="pyCompletion"
              :disabled="readonly"
              @update:model-value="emit('change')"
            />
          </div>

          <div v-if="!readonly" class="ccp__toolbar">
            <ISelect
              :model-value="null"
              size="sm"
              :options="fieldInsertOptions"
              placeholder="插入字段…"
              :disabled="!fieldInsertOptions.length"
              @update:model-value="insertFieldSnippet($event == null ? null : String($event))"
            />
            <ISelect
              :model-value="null"
              size="sm"
              :options="SNIPPETS.map((s) => ({ value: s.code, label: s.label }))"
              placeholder="插入代码片段…"
              @update:model-value="insertSnippet(String($event ?? ''))"
            />
          </div>
        </div>
      </div>

      <section v-if="hasErrorArea" class="ccp__errbox">
        <div class="ccp__errbox-head">
          <button type="button" class="ccp__errbox-toggle" @click="errorOpen = !errorOpen">
            <IIcon :name="errorOpen ? 'chevron-down' : 'chevron-right'" :size="12" />
            <span>错误与日志</span>
          </button>
          <IButton
            v-if="!readonly"
            size="sm"
            variant="ghost"
            icon="sparkle"
            :disabled="!errorTextForAi"
            @click="sendErrorToAi"
          >
            发送到 AI 修复
          </IButton>
        </div>
        <template v-if="errorOpen">
          <p v-if="step.error" class="ccp__errbox-error">
            <template v-if="customCodeErrorLine != null">Line {{ customCodeErrorLine }}: </template>{{ step.error }}
          </p>
          <pre v-if="customCodeStderr" class="ccp__log ccp__log--err">{{ customCodeStderr }}</pre>
          <pre v-if="customCodeStdout" class="ccp__log">{{ customCodeStdout }}</pre>
        </template>
      </section>
    </div>

    <!-- 输入预览 -->
    <div v-show="activeTab === 'inputs'" class="ccp__pane">
      <div v-if="!customCodeInputs.length" class="ccp__empty">
        暂无输入表。请从上游节点拖线连接 Input datasets。
      </div>
      <div v-else class="ccp__inputs">
        <div v-for="(t, i) in customCodeInputs" :key="t.id" class="ccp__input-card">
          <div class="ccp__input-head">
            <span class="ccp__input-index">inputs[{{ i }}]</span>
            <span class="ccp__input-name">{{ t.name }}</span>
            <span class="ccp__input-meta">{{ t.rows.length }} 行 × {{ t.columns.length }} 列</span>
          </div>
          <div class="ccp__input-cols">
            <span
              v-for="c in t.columns"
              :key="c.field"
              class="ccp__col"
              :class="{ 'ccp__col--number': c.dataType === 'number', 'ccp__col--static': readonly }"
              :title="readonly ? c.title : '点击插入 inputs[' + i + '].data[&quot;' + c.field + '&quot;]'"
              @click="insertColumnSnippet(i, c.field)"
            >
              {{ c.title }}
            </span>
          </div>
          <div class="ccp__input-preview">
            <table class="ccp__preview-table">
              <thead>
                <tr>
                  <th v-for="c in t.columns.slice(0, 6)" :key="c.field">{{ c.title }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, ri) in t.rows.slice(0, 5)" :key="ri">
                  <td v-for="c in t.columns.slice(0, 6)" :key="c.field">{{ row[c.field] ?? '' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- 输出预览 -->
    <div v-show="activeTab === 'outputs'" class="ccp__pane">
      <div v-if="!hasOutputs" class="ccp__empty">
        暂无输出。保存并运行后，输出表 / 图表 / 文件会显示在这里。
      </div>
      <template v-else>
        <div v-if="customCodeTables.length" class="ccp__output-section">
          <h4 class="ccp__section-title">输出表</h4>
          <div v-for="t in customCodeTables" :key="t.id" class="ccp__output-table">
            <div class="ccp__output-table-head">
              <span class="ccp__output-table-name">{{ t.name }}</span>
              <span class="ccp__output-table-meta">{{ t.rows.length }} 行 × {{ t.columns.length }} 列</span>
            </div>
            <div class="ccp__input-preview">
              <table class="ccp__preview-table">
                <thead>
                  <tr>
                    <th v-for="c in t.columns.slice(0, 6)" :key="c.field">{{ c.title }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(row, ri) in t.rows.slice(0, 5)" :key="ri">
                    <td v-for="c in t.columns.slice(0, 6)" :key="c.field">{{ row[c.field] ?? '' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div v-if="customCodeCharts.length" class="ccp__output-section">
          <h4 class="ccp__section-title">输出图表</h4>
          <PlotlyArtifactPreview
            v-for="ch in customCodeCharts"
            :key="ch.id"
            :name="ch.name"
            :plotly-json="ch.plotlyJson"
          />
        </div>

        <div v-if="customCodeFiles.length" class="ccp__output-section">
          <h4 class="ccp__section-title">输出文件</h4>
          <ul class="ccp__file-list">
            <li v-for="f in customCodeFiles" :key="f.id" class="ccp__file-item">
              <IIcon name="file-text" :size="14" />
              <span class="is-ellipsis" :title="f.name">{{ f.name }}</span>
              <span class="ccp__file-size">{{ Math.max(1, Math.round(f.sizeBytes / 1024)) }} KB</span>
            </li>
          </ul>
        </div>
      </template>
    </div>

    <!-- AI 悬浮窗：Teleport 到 body，固定悬浮在面板左侧，不参与面板布局 -->
    <Teleport to="body">
      <div v-if="aiOpen && !readonly && aiMinimized" class="ccp__ai-fab" :style="aiFabStyle" title="展开 AI 助手">
        <button type="button" class="ccp__ai-fab-btn" aria-label="展开 AI 助手" @click="aiMinimized = false">
          <IIcon name="sparkle" :size="16" />
        </button>
      </div>
      <div
        v-else-if="aiOpen && !readonly"
        class="ccp__ai-float"
        :style="aiFloatStyle"
        role="complementary"
        aria-label="AI 助手"
      >
        <CustomCodeAiChat
          ref="aiChatRef"
          :code="customCodeCfg.code"
          :inputs-summary="customCodeInputsSummary"
          :last-error="step.error"
          @apply="applyAiCode"
          @insert="insertSnippet"
          @minimize="aiMinimized = true"
          @close="onAiToggle"
        />
      </div>
    </Teleport>

  </div>
</template>

<style scoped>
.ccp {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.ccp__status-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--is-border);
  background: var(--is-surface-hover);
  flex-shrink: 0;
}
.ccp__input-count {
  font-size: 11px;
  color: var(--is-text-tertiary);
}
.ccp__status-actions {
  margin-left: auto;
}

.ccp__tabs {
  display: flex;
  gap: 2px;
  padding: 6px 8px 0;
  border-bottom: 1px solid var(--is-border);
  background: var(--is-surface);
  flex-shrink: 0;
}
.ccp__tab {
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
  position: relative;
}
.ccp__tab:hover {
  color: var(--is-text);
}
.ccp__tab--active {
  color: var(--is-accent);
  border-bottom-color: var(--is-accent);
  font-weight: 600;
}
.ccp__tab-badge {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--is-accent);
}

.ccp__pane {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.ccp__pane--code {
  overflow: hidden;
  padding: 0;
}
.ccp__pane--code > .ccp__code-head {
  display: flex;
  align-items: center;
  padding: 4px 8px;
  border-bottom: 1px solid var(--is-border);
  flex-shrink: 0;
}

.ccp__code-body {
  display: flex;
  flex: 1;
  min-height: 0;
}
.ccp__code-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.ccp__code-main .ccp__editor {
  flex: 1;
  min-height: 0;
}
.ccp__ai-toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  font-size: 12px;
  color: var(--is-text-secondary);
  cursor: pointer;
}
.ccp__ai-toggle:hover {
  color: var(--is-accent);
  background: var(--is-accent-soft);
}

/* AI 悬浮窗（Teleport 到 body）：固定定位、盖在面板左侧，不占布局 */
.ccp__ai-float {
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

.ccp__ai-fab {
  position: fixed;
  z-index: 60;
}
.ccp__ai-fab-btn {
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
.ccp__ai-fab-btn:hover {
  background: var(--is-accent-soft);
}

.ccp__toolbar {
  display: flex;
  gap: 8px;
  padding: 8px 12px;
  flex-shrink: 0;
  border-top: 1px solid var(--is-border);
}
.ccp__toolbar :deep(.i-select) {
  flex: 1;
  min-width: 140px;
}

.ccp__editor {
  min-height: 280px;
}

.ccp__pane--code > .ccp__errbox {
  flex-shrink: 0;
  max-height: 220px;
  overflow-y: auto;
  padding: 0 12px 8px;
  border-top: 1px solid var(--is-border);
}
.ccp__errbox-head {
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
.ccp__errbox-toggle {
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
.ccp__errbox-toggle:hover {
  color: var(--is-text);
}
.ccp__errbox-error {
  margin: 0 0 8px;
  padding: 8px 10px;
  border-radius: 6px;
  font-size: 12px;
  color: var(--is-danger);
  background: var(--is-danger-soft);
}
.ccp__errbox .ccp__log {
  margin-bottom: 8px;
}
.ccp__errbox .ccp__log:last-child {
  margin-bottom: 0;
}

.ccp__empty {
  padding: 32px;
  text-align: center;
  color: var(--is-text-tertiary);
  font-size: 13px;
}

.ccp__inputs {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.ccp__input-card {
  border: 1px solid var(--is-border);
  border-radius: 8px;
  overflow: hidden;
}
.ccp__input-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  background: var(--is-surface-hover);
  border-bottom: 1px solid var(--is-border);
}
.ccp__input-index {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 11px;
  color: var(--is-accent);
  background: var(--is-accent-soft);
  padding: 2px 6px;
  border-radius: 4px;
}
.ccp__input-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--is-text);
}
.ccp__input-meta {
  font-size: 11px;
  color: var(--is-text-tertiary);
  margin-left: auto;
}
.ccp__input-cols {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 8px 10px;
  border-bottom: 1px solid var(--is-border);
}
.ccp__col {
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 4px;
  background: var(--is-surface-hover);
  color: var(--is-text-secondary);
  cursor: pointer;
}
.ccp__col:hover {
  background: var(--is-accent-soft);
  color: var(--is-accent);
}
.ccp__col--number {
  color: #175cd3;
  background: #eff4ff;
}
.ccp__col--number:hover {
  background: #dbe7ff;
  color: #175cd3;
}
.ccp__col--static {
  cursor: default;
}
.ccp__col--static:hover {
  background: var(--is-surface-hover);
  color: var(--is-text-secondary);
}
.ccp__col--number.ccp__col--static:hover {
  background: #eff4ff;
  color: #175cd3;
}
.ccp__input-preview {
  overflow: auto;
  max-height: 160px;
}
.ccp__preview-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
}
.ccp__preview-table th,
.ccp__preview-table td {
  padding: 5px 8px;
  border-bottom: 1px solid var(--is-border);
  text-align: left;
}
.ccp__preview-table th {
  background: var(--is-surface-hover);
  font-weight: 600;
  position: sticky;
  top: 0;
}

.ccp__output-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.ccp__section-title {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  color: var(--is-text-secondary);
}
.ccp__output-table {
  border: 1px solid var(--is-border);
  border-radius: 8px;
  overflow: hidden;
}
.ccp__output-table-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  background: var(--is-surface-hover);
  border-bottom: 1px solid var(--is-border);
}
.ccp__output-table-name {
  font-size: 13px;
  font-weight: 600;
}
.ccp__output-table-meta {
  font-size: 11px;
  color: var(--is-text-tertiary);
  margin-left: auto;
}

.ccp__file-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.ccp__file-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border: 1px solid var(--is-border);
  border-radius: 6px;
  font-size: 12px;
}
.ccp__file-size {
  margin-left: auto;
  font-size: 11px;
  color: var(--is-text-tertiary);
}

.ccp__log {
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
.ccp__log--err {
  background: #fef3f2;
  border-color: #fecdca;
  color: #b42318;
}
</style>
