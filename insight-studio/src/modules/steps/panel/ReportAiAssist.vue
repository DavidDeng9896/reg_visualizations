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

const emit = defineEmits<{ (e: 'apply', report: AnalysisReport): void }>()

const open = ref(true)
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
  "sections": [
    { "id": string, "kind": "heading"|"paragraph"|"bullets"|"chart"|"table"|"divider",
      "title"?: string, "body"?: string, "items"?: string[],
      "tableId"?: string, "viewId"?: string, "caption"?: string }
  ],
  "conclusion": string
}

## 风格
- 简洁、专业、权威；中文；避免空话与 emoji
- 章节一节一事；可引用已有表/视图 id（chart/table 节）
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
      <button type="button" class="rai__toggle" @click="open = !open">
        <IIcon name="sparkle" :size="14" />
        <span>AI 写报告</span>
        <IIcon :name="open ? 'chevron-up' : 'chevron-down'" :size="14" />
      </button>
    </header>
    <div v-if="open" class="rai__body">
      <p class="rai__hint">根据当前分析生成或改写科研风格报告；写入后可在预览中查看，并用「导出 PDF」打印。</p>
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
}
.rai__toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding: 8px 10px;
  border: 0;
  background: transparent;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
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
