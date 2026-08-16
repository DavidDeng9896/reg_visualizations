<script setup lang="ts">
/**
 * 报告节点旁的 AI 辅助小窗：生成/改写结构化报告 JSON。
 */
import { computed, ref } from 'vue'
import type { Analysis, AnalysisReport, StepNode } from '../../../shared/types'
import { contentText, postChat, readSseStream, type ChatMessage } from '../../ai/client'
import { parseReportFromModelText } from '../report/reportModel'
import { IButton, IIcon, ITextField } from '../../../ui'

const props = defineProps<{
  step: StepNode
  analysis: Analysis | null
  report: AnalysisReport
}>()

const emit = defineEmits<{
  (e: 'apply', report: AnalysisReport): void
  (e: 'minimize'): void
  (e: 'close'): void
}>()

const prompt = ref('')
const loading = ref(false)
const draft = ref('')
const errorMsg = ref('')

const canSend = computed(() => prompt.value.trim().length > 0 && !loading.value)

function analysisBrief(): string {
  const a = props.analysis
  if (!a) return '（当前无打开的分析）'
  const tables = a.tables
    .slice(0, 8)
    .map((t) => {
      const views = t.views.map((v) => `${v.name}(${v.type}, id=${v.id})`).join('、') || '无视图'
      return `- 表「${t.name}」id=${t.id} ${t.rows.length}行：${t.columns
        .slice(0, 12)
        .map((c) => c.field)
        .join(', ')}；视图：${views}`
    })
    .join('\n')
  const steps = a.steps.map((s) => `${s.name}(${s.type})`).join(' → ')
  return `分析「${a.name}」id=${a.id}\n步骤：${steps || '无'}\n表：\n${tables || '无'}`
}

function systemPrompt(): string {
  return `你是科研风格分析报告撰写助手。根据用户需求与分析上下文，输出**一份 JSON 报告**（不要解释）。

## JSON schema
{
  "title": string,
  "subtitle": string,
  "theme": "research",
  "templateId": "research"|"antibody"|"dashboard-review",
  "sections": [
    { "id": string, "kind": "heading"|"paragraph"|"bullets"|"chart"|"table"|"divider",
      "title"?: string, "body"?: string, "items"?: string[],
      "tableId"?: string, "viewId"?: string, "caption"?: string }
  ],
  "conclusion": string
}

## 结构（默认）
1. 分析目标与数据范围
2. 数据概况（bullets）
3. 关键发现：每个 chart/table 后紧跟一段 **解读 paragraph**（自动写 caption + 解读，可写长）
4. 结论（可较长）

内置模板：research（通用）/ antibody（抗体筛选，含候选一览）/ dashboard-review（复盘与行动项）。

## 风格
- 简洁、专业、权威；中文；避免空话与 emoji
- **必须**为引用的图/表填写有信息量的 caption，并撰写解读（引用趋势、离群点、分组差异等）
- 章节与结论允许较长正文；一节一事
- 若用户要求改格式/语气/结构，在现有报告基础上修改

## 当前分析
${analysisBrief()}

## 输出
只输出一个 \`\`\`json ... \`\`\` 代码块。`
}

async function send() {
  if (!canSend.value) return
  loading.value = true
  errorMsg.value = ''
  draft.value = ''
  try {
    const current = JSON.stringify(props.report, null, 2)
    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt() },
      {
        role: 'user',
        content: `需求：${prompt.value}\n\n当前报告 JSON：\n${current}`,
      },
    ]
    const res = await postChat({ messages })
    const msg = await readSseStream(res, (t) => {
      draft.value += t
    })
    const finalText = contentText(msg.content) || draft.value
    draft.value = finalText || draft.value
    if (!draft.value.trim()) errorMsg.value = '模型未返回内容'
    else prompt.value = ''
  } catch (e) {
    errorMsg.value = e instanceof Error ? e.message : String(e)
  } finally {
    loading.value = false
  }
}

function apply() {
  const parsed = parseReportFromModelText(draft.value)
  if (!parsed) {
    errorMsg.value = '无法解析 JSON 报告，请重试或让模型重新生成'
    return
  }
  emit('apply', parsed)
}
</script>

<template>
  <section class="rai">
    <header class="rai__head">
      <IIcon name="sparkle" :size="14" class="rai__head-ico" />
      <span class="rai__title">AI 写报告</span>
      <button type="button" class="rai__head-btn" title="最小化" aria-label="最小化" @click="emit('minimize')">
        <IIcon name="minus" :size="14" />
      </button>
      <button type="button" class="rai__head-btn" title="关闭" aria-label="关闭" @click="emit('close')">
        <IIcon name="close" :size="14" />
      </button>
    </header>
    <div class="rai__body">
      <p class="rai__hint">根据当前分析自动生成图注与解读（内容可较长）；写入后可在预览中交互看图，并用「导出 PDF」嵌入静态图。</p>
      <div class="rai__row">
        <ITextField
          v-model="prompt"
          size="sm"
          placeholder="例如：总结 IC50 结果，结论放前，引用生长曲线图…"
          :disabled="loading"
          @keydown.enter.prevent="send"
        />
        <IButton size="sm" variant="primary" :disabled="!canSend" :loading="loading" @click="send">
          生成
        </IButton>
      </div>
      <p v-if="errorMsg" class="rai__err">{{ errorMsg }}</p>
      <div v-if="draft" class="rai__draft">
        <pre class="rai__pre">{{ draft }}</pre>
        <IButton size="sm" variant="secondary" @click="apply">写入报告</IButton>
      </div>
    </div>
  </section>
</template>

<style scoped>
.rai {
  border: 1px solid var(--is-border, #d0d5dd);
  border-radius: 6px;
  background: var(--is-surface, #fff);
  margin-bottom: 10px;
}
.rai__head {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  border-bottom: 1px solid var(--is-border, #d0d5dd);
  flex-shrink: 0;
}
.rai__head-ico {
  color: var(--is-accent, #3b82f6);
  flex-shrink: 0;
}
.rai__title {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--is-text, #1a1d21);
}
.rai__head-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: var(--is-text-tertiary, #667085);
  cursor: pointer;
  flex-shrink: 0;
}
.rai__head-btn:hover {
  background: var(--is-surface-hover, #f2f4f7);
  color: var(--is-text, #1a1d21);
}
.rai__body {
  padding: 0 10px 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.rai__hint {
  margin: 0;
  font-size: 12px;
  color: var(--is-text-secondary, #667085);
  line-height: 1.45;
}
.rai__row {
  display: flex;
  gap: 8px;
  align-items: center;
}
.rai__row :deep(input),
.rai__row :deep(.i-textfield) {
  flex: 1;
}
.rai__err {
  margin: 0;
  color: #b42318;
  font-size: 12px;
}
.rai__draft {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.rai__pre {
  max-height: 180px;
  overflow: auto;
  margin: 0;
  padding: 8px;
  font-size: 11px;
  background: #f8fafc;
  border-radius: 4px;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
