<script setup lang="ts">
import { computed } from 'vue'
import PlanChecklist from './PlanChecklist.vue'
import TraceCard from './TraceCard.vue'
import ArtifactCard from './ArtifactCard.vue'
import type { TraceItem, UiMessage } from './aiStore'

/** 消息流：用户气泡 + assistant 轻量 markdown（粗体/行内码/代码块/列表/表格）。 */
const props = defineProps<{
  messages: UiMessage[]
}>()

const emit = defineEmits<{ (e: 'confirm', item: TraceItem): void; (e: 'retry'): void }>()

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** 轻量 markdown → html（先做 HTML 转义，再按模式替换）。 */
function renderMd(src: string): string {
  const lines = escapeHtml(src).split('\n')
  const out: string[] = []
  let i = 0
  let listOpen = false
  const inline = (t: string): string =>
    t
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')

  while (i < lines.length) {
    const line = lines[i]
    // 代码块
    if (line.trimStart().startsWith('```')) {
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
    } else if (line.trim()) {
      out.push(`<p class="md-p">${inline(line)}</p>`)
    }
    i += 1
  }
  if (listOpen) out.push('</ul>')
  return out.join('')
}

const rendered = computed(() => props.messages.map((m) => ({ id: m.id, html: m.role === 'assistant' ? renderMd(m.content) : '' })))
function htmlOf(id: string): string {
  return rendered.value.find((r) => r.id === id)?.html ?? ''
}
</script>

<template>
  <div class="msgs" data-testid="ai-messages">
    <div v-for="m in messages" :key="m.id" class="msg" :class="`msg--${m.role}`">
      <div v-if="m.role === 'user'" class="msg__bubble msg__bubble--user">{{ m.content }}</div>
      <template v-else>
        <PlanChecklist v-if="m.planSteps?.length" :steps="m.planSteps" :done="m.planDone ?? []" :streaming="m.streaming" />
        <TraceCard v-if="m.trace.length" :items="m.trace" :streaming="m.streaming" @confirm="emit('confirm', $event)" />
        <!-- eslint-disable-next-line vue/no-v-html -->
        <div v-if="m.content" class="msg__bubble msg__bubble--ai md" v-html="htmlOf(m.id)" />
        <div v-if="m.streaming && !m.content && !m.trace.length" class="msg__thinking">思考中…</div>
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
  gap: 12px;
  padding: 12px;
}
.msg--user {
  display: flex;
  justify-content: flex-end;
}
.msg__bubble {
  max-width: 100%;
  padding: 8px 12px;
  border-radius: var(--is-radius-lg);
  font-size: var(--is-text-sm);
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}
.msg__bubble--user {
  background: var(--is-accent);
  color: #fff;
  border-bottom-right-radius: var(--is-radius-sm);
  max-width: 88%;
}
.msg__bubble--ai {
  background: var(--is-surface);
  border: 1px solid var(--is-border);
  border-bottom-left-radius: var(--is-radius-sm);
  white-space: normal;
}
.msg__thinking {
  color: var(--is-text-tertiary);
  font-size: var(--is-text-xs);
  padding: 4px 2px;
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
  margin: 2px 0;
}
.md :deep(.md-h) {
  font-weight: 600;
  margin: 8px 0 4px;
}
.md :deep(.md-ul) {
  margin: 4px 0 4px 18px;
  list-style: disc;
}
.md :deep(.md-pre) {
  background: #f2f4f7;
  border-radius: var(--is-radius-sm);
  padding: 8px 10px;
  font-family: var(--is-font-mono);
  font-size: 12px;
  overflow-x: auto;
  white-space: pre;
}
.md :deep(code) {
  background: #f2f4f7;
  border-radius: 4px;
  padding: 0 4px;
  font-family: var(--is-font-mono);
  font-size: 12px;
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
