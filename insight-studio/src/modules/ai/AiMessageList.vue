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
import { renderMd } from './renderMd'

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
        <div
          v-if="(m.incomplete || m.error) && !m.streaming && !m.planDismissed && (m.planSteps?.length || m.rawTail?.length || m.trace.length)"
          class="msg__ai"
          data-testid="ai-incomplete"
        >
          <template v-if="m.error">
            因模型或网络错误已暂停：可点击下方「继续任务」从检查点续跑，或关闭该提示。
          </template>
          <template v-else>
            任务未完成：可点击下方「继续任务」从检查点续跑，或关闭该提示。
          </template>
        </div>
        <ArtifactCard v-for="a in m.artifacts" :key="`${a.kind}-${a.name}`" :artifact="a" />
        <div v-if="m.error" class="msg__error" data-testid="ai-error">
          <span class="msg__error-text">{{ m.error }}</span>
          <button
            v-if="!m.planSteps?.length && !m.rawTail?.length && !m.trace.length"
            type="button"
            class="msg__retry"
            data-testid="ai-retry"
            @click="emit('retry')"
          >
            重试
          </button>
        </div>
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
  line-height: 1.6;
  color: var(--is-text);
  word-break: break-word;
}
.msg__ai + .msg__ai {
  margin-top: 10px;
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
  align-items: flex-start;
  gap: 8px;
}
.msg__error-text {
  flex: 1;
  min-width: 0;
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.5;
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
  margin: 0 0 0.65em;
  line-height: 1.65;
}
.md :deep(.md-p:last-child) {
  margin-bottom: 0;
}
.md :deep(.md-h) {
  font-weight: 600;
  line-height: 1.4;
  margin: 0.9em 0 0.4em;
  color: var(--is-text);
}
.md :deep(.md-h1),
.md :deep(.md-h2) {
  font-size: 1.05em;
}
.md :deep(.md-h3),
.md :deep(.md-h4) {
  font-size: 1em;
}
.md :deep(.md-h:first-child) {
  margin-top: 0;
}
.md :deep(.md-ul),
.md :deep(.md-ol) {
  margin: 0.35em 0 0.65em;
  padding-left: 1.35em;
}
.md :deep(.md-ul) {
  list-style: disc;
}
.md :deep(.md-ol) {
  list-style: decimal;
}
.md :deep(.md-ul li),
.md :deep(.md-ol li) {
  margin: 0.15em 0;
}
.md :deep(.md-pre) {
  background: var(--is-surface-muted, rgba(0, 0, 0, 0.04));
  border: 1px solid var(--is-border);
  border-radius: var(--is-radius-sm);
  padding: 10px 12px;
  font-family: var(--is-font-mono);
  font-size: var(--is-text-xs);
  overflow-x: auto;
  white-space: pre;
  margin: 0.5em 0 0.75em;
  line-height: 1.5;
}
.md :deep(code) {
  background: var(--is-surface-muted, rgba(0, 0, 0, 0.05));
  border-radius: 4px;
  padding: 0.1em 0.35em;
  font-family: var(--is-font-mono);
  font-size: 0.92em;
}
.md :deep(.md-pre code) {
  background: transparent;
  padding: 0;
  font-size: inherit;
  border-radius: 0;
}
.md :deep(strong) {
  font-weight: 600;
}
.md :deep(.md-table) {
  border-collapse: collapse;
  margin: 0.5em 0 0.75em;
  font-size: 12px;
  width: 100%;
}
.md :deep(.md-table th),
.md :deep(.md-table td) {
  border: 1px solid var(--is-border);
  padding: 4px 8px;
  text-align: left;
}
.md :deep(.md-table th) {
  background: var(--is-surface-hover);
  font-weight: 600;
}
</style>
