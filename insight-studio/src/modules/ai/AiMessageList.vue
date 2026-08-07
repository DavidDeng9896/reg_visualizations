<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { IIcon } from '../../ui'
import PlanChecklist from './PlanChecklist.vue'
import TraceCard from './TraceCard.vue'
import ArtifactCard from './ArtifactCard.vue'
import ReasoningCard from './ReasoningCard.vue'
import AskCard from './AskCard.vue'
import { useAiStore, type TraceItem, type UiMessage } from './aiStore'
import { attachmentKindIcon } from './mentionIcons'

/** 消息流：无气泡纯文本风格（用户右对齐 + 时间戳；助手 markdown + 思考/计划/轨迹/产物）。 */
const props = defineProps<{
  messages: UiMessage[]
}>()

const emit = defineEmits<{
  (e: 'confirm', item: TraceItem): void
  (e: 'reject', item: TraceItem): void
  (e: 'retry'): void
}>()

const ai = useAiStore()
const { pendingAsk } = storeToRefs(ai)

function askSettled(t: TraceItem): boolean {
  // 待答的 ask 提到输入框上方悬浮区；已结算的不再渲染卡片（正文普通文本已写入）
  return pendingAsk.value?.id !== t.id && !t.askSettled && !!t.ask
}
function fmtTime(at: number): string {
  try {
    return new Date(at).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })
  } catch {
    return ''
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** 去除 emoji/装饰符号（保留 → × 及 ⚠ ✓ ✗ 等有语义符号），渲染层兜底。 */
function stripEmoji(s: string): string {
  return s
    .replace(
      /[\u{1F1E6}-\u{1F1FF}\u{1F300}-\u{1FAFF}\u{2600}-\u{269F}\u{26A2}-\u{26FF}\u{2700}-\u{2712}\u{2714}-\u{2716}\u{2718}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}]/gu,
      '',
    )
    .replace(/[ \t]{2,}/g, ' ')
}

/** 长文按句号断段，避免一整坨挤在一起。 */
function breakLongParagraphs(src: string): string {
  return src
    .split(/\n{2,}/)
    .map((block) => {
      const trimmed = block.trim()
      if (!trimmed) return ''
      if (/^```/m.test(trimmed) || /^\s*[-*] /m.test(trimmed) || /^\s*#{1,4}\s/m.test(trimmed) || /^\s*\|/m.test(trimmed)) {
        return block
      }
      if (trimmed.includes('\n') && trimmed.length < 420) return block
      const parts = trimmed
        .replace(/([。！？；])(?!\n)/g, '$1\n')
        .replace(/([.!?])\s+(?=[A-Z\u4e00-\u9fff])/g, '$1\n')
        .split('\n')
        .map((p) => p.trim())
        .filter(Boolean)
      if (parts.length <= 1) return block
      const out: string[] = []
      let cur = ''
      for (const p of parts) {
        if (!cur) cur = p
        else if (cur.length < 56) {
          const needSpace = /[a-zA-Z0-9]$/.test(cur) && /^[A-Za-z]/.test(p)
          cur = `${cur}${needSpace ? ' ' : ''}${p}`
        } else {
          out.push(cur)
          cur = p
        }
      }
      if (cur) out.push(cur)
      return out.join('\n\n')
    })
    .filter(Boolean)
    .join('\n\n')
}

/** 轻量 markdown → html（先做 HTML 转义，再按模式替换）。 */
function renderMd(src: string): string {
  const lines = escapeHtml(breakLongParagraphs(src)).split('\n')
  const out: string[] = []
  let i = 0
  let listOpen = false
  const inline = (t: string): string =>
    t
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')

  while (i < lines.length) {
    const raw = lines[i]
    // 代码块（内容原样保留，不去 emoji）
    if (raw.trimStart().startsWith('```')) {
      const buf: string[] = []
      i += 1
      while (i < lines.length && !lines[i].trimStart().startsWith('```')) {
        buf.push(lines[i])
        i += 1
      }
      i += 1
      out.push(`<pre class="md-pre">${buf.join('\n')}</pre>`)
      continue
    }
    const line = stripEmoji(raw)
    if (!line.trim()) {
      if (listOpen) {
        out.push('</ul>')
        listOpen = false
      }
      i += 1
      continue
    }
    // 表格
    if (/^\s*\|.*\|\s*$/.test(line) && i + 1 < lines.length && /^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1])) {
      const header = line.split('|').slice(1, -1).map((c) => c.trim())
      const rows: string[][] = []
      i += 2
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) {
        rows.push(lines[i].split('|').slice(1, -1).map((c) => c.trim()))
        i += 1
      }
      out.push(
        `<table class="md-table"><thead><tr>${header.map((h) => `<th>${inline(h)}</th>`).join('')}</tr></thead><tbody>${rows
          .map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`)
          .join('')}</tbody></table>`,
      )
      continue
    }
    // 列表
    if (/^\s*[-*] /.test(line)) {
      if (!listOpen) {
        out.push('<ul class="md-ul">')
        listOpen = true
      }
      out.push(`<li>${inline(line.replace(/^\s*[-*] /, ''))}</li>`)
      i += 1
      continue
    }
    if (listOpen) {
      out.push('</ul>')
      listOpen = false
    }
    if (/^\s*#{1,4}\s+/.test(line)) {
      out.push(`<div class="md-h">${inline(line.replace(/^\s*#{1,4}\s+/, ''))}</div>`)
    } else {
      out.push(`<p class="md-p">${inline(line)}</p>`)
    }
    i += 1
  }
  if (listOpen) out.push('</ul>')
  return out.join('')
}

const rendered = computed(() =>
  props.messages.map((m) => ({
    id: m.id,
    html: m.role === 'assistant' ? renderMd(displayContent(m)) : '',
  })),
)
function htmlOf(id: string): string {
  return rendered.value.find((r) => r.id === id)?.html ?? ''
}
function displayContent(m: UiMessage): string {
  const notes = (m.interactionNotes ?? '').trim()
  const body = (m.content ?? '').trim()
  return [notes, body].filter(Boolean).join('\n\n')
}
</script>

<template>
  <div class="msgs" data-testid="ai-messages">
    <div v-for="m in messages" :key="m.id" class="msg" :class="`msg--${m.role}`">
      <div v-if="m.role === 'system'" class="msg__sys" data-testid="ai-ctx-summary" :title="m.content">
        <IIcon name="history" :size="11" />
        上下文已压缩 · 早前对话已折叠为摘要
      </div>
      <div v-else-if="m.role === 'user'" class="msg__user">
        <div v-if="m.content" class="msg__user-text">{{ m.content }}</div>
        <div v-if="m.attachments?.length" class="msg__atts" data-testid="ai-msg-atts">
          <span v-for="att in m.attachments" :key="att.id" class="msg__att">
            <IIcon :name="attachmentKindIcon(att.kind)" :size="11" />
            <span class="msg__att-name">{{ att.name }}</span>
          </span>
        </div>
        <div v-if="m.at" class="msg__time">{{ fmtTime(m.at) }}</div>
      </div>
      <template v-else>
        <ReasoningCard v-if="m.reasoning" :reasoning="m.reasoning" :streaming="m.streaming" />
        <PlanChecklist v-if="m.planSteps?.length" :steps="m.planSteps" :done="m.planDone ?? []" :streaming="m.streaming" />
        <TraceCard
          v-if="m.trace.length"
          :items="m.trace"
          :streaming="m.streaming"
          hide-pending
          @confirm="emit('confirm', $event)"
          @reject="emit('reject', $event)"
        />
        <AskCard
          v-for="t in m.trace.filter((x) => askSettled(x))"
          :key="`ask-${t.id}`"
          :item="t"
        />
        <!-- eslint-disable-next-line vue/no-v-html -->
        <div v-if="displayContent(m)" class="msg__ai md" v-html="htmlOf(m.id)" />
        <div v-if="m.streaming && !displayContent(m) && !m.trace.length && !m.reasoning" class="msg__thinking">思考中…</div>
        <div v-if="m.incomplete && !m.streaming && !m.planDismissed" class="msg__incomplete" data-testid="ai-incomplete">
          任务未完成：可点击下方「继续任务」从检查点续跑，或关闭该提示。
        </div>
        <ArtifactCard v-for="a in m.artifacts" :key="`${a.kind}-${a.name}`" :artifact="a" />
        <div v-if="m.error" class="msg__error">{{ m.error }}<button type="button" class="msg__retry" data-testid="ai-retry" @click="emit('retry')">重试</button></div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.msgs {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 14px 14px 18px;
}
.msg--user {
  display: flex;
  justify-content: flex-end;
}
.msg--system {
  display: flex;
  justify-content: center;
}
.msg__sys {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 10px;
  border: 1px dashed var(--is-border-strong);
  border-radius: var(--is-radius-full);
  color: var(--is-text-tertiary);
  font-size: 11px;
  cursor: default;
}
.msg__user {
  max-width: 92%;
  text-align: right;
}
.msg__user-text {
  font-size: var(--is-text-sm);
  line-height: 1.6;
  color: var(--is-text);
  white-space: pre-wrap;
  word-break: break-word;
  text-align: left;
  display: inline-block;
}
.msg__atts {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 6px;
  justify-content: flex-end;
}
.msg__att {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: var(--is-radius-full);
  background: var(--is-surface-muted, var(--is-surface-hover));
  color: var(--is-text-secondary);
  font-size: 11px;
  max-width: 100%;
}
.msg__att-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 180px;
}
.msg__time {
  margin-top: 3px;
  font-size: 11px;
  color: var(--is-text-tertiary);
}
.msg__ai {
  font-size: var(--is-text-sm);
  line-height: 1.7;
  color: var(--is-text);
  word-break: break-word;
}
.msg__thinking {
  color: var(--is-text-tertiary);
  font-size: var(--is-text-xs);
  padding: 4px 2px;
}
.msg__incomplete {
  margin-top: 8px;
  padding: 8px 10px;
  border-radius: var(--is-radius-sm);
  background: var(--is-warning-soft, color-mix(in srgb, var(--is-warning, #b45309) 12%, transparent));
  color: var(--is-warning, #b45309);
  font-size: var(--is-text-xs);
  line-height: 1.5;
}
.msg__error {
  margin-top: 6px;
  font-size: var(--is-text-xs);
  color: var(--is-danger);
  display: flex;
  align-items: center;
  gap: 8px;
}
.msg__retry {
  border: 1px solid var(--is-border);
  border-radius: var(--is-radius-sm);
  background: var(--is-surface);
  color: var(--is-text-secondary);
  padding: 2px 10px;
  font-size: var(--is-text-xs);
  cursor: pointer;
}
.msg__retry:hover {
  border-color: var(--is-accent);
  color: var(--is-accent);
}

.md :deep(.md-p) {
  margin: 0 0 10px;
  line-height: 1.65;
}
.md :deep(.md-p:last-child) {
  margin-bottom: 0;
}
.md :deep(.md-h) {
  font-weight: 600;
  margin: 10px 0 4px;
}
.md :deep(.md-ul) {
  margin: 4px 0 4px 18px;
  list-style: disc;
}
.md :deep(.md-pre) {
  background: var(--is-surface-muted);
  border-radius: var(--is-radius-sm);
  padding: 8px 10px;
  font-family: var(--is-font-mono);
  font-size: var(--is-text-xs);
  overflow-x: auto;
  white-space: pre;
}
.md :deep(code) {
  background: var(--is-surface-muted);
  border-radius: 4px;
  padding: 0 4px;
  font-family: var(--is-font-mono);
  font-size: var(--is-text-xs);
}
.md :deep(.md-pre code) {
  background: transparent;
  padding: 0;
}
.md :deep(.md-table) {
  border-collapse: collapse;
  margin: 6px 0;
  font-size: 12px;
}
.md :deep(.md-table th),
.md :deep(.md-table td) {
  border: 1px solid var(--is-border);
  padding: 3px 8px;
  text-align: left;
}
.md :deep(.md-table th) {
  background: var(--is-surface-hover);
  font-weight: 600;
}
</style>
