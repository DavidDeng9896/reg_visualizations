<script setup lang="ts">
/**
 * Report 节点 AI 撰写（悬浮窗）：底层走 reportAiStore（主会话 agent-loop 内核）。
 * 能力：多轮工具调用（update_report_step / skill / 表结构）、截断续写、检查点续跑、按步骤持久化。
 */
import { computed, nextTick, onDeactivated, onMounted, onUnmounted, ref, watch } from 'vue'
import { useReportAiStore } from '../../ai/reportAiStore'
import ReasoningCard from '../../ai/ReasoningCard.vue'
import { assistantBubbleText } from '../../ai/contentScrub'
import { IButton, IIcon } from '../../../ui'

interface MsgPart {
  kind: 'text' | 'code'
  text: string
}

const props = defineProps<{
  stepId: string
}>()

const emit = defineEmits<{
  (e: 'minimize'): void
  (e: 'close'): void
}>()

const store = useReportAiStore()
const input = ref('')
const listRef = ref<HTMLElement | null>(null)

const messages = computed(() => store.messages)
const loading = computed(() => store.running)
const lastMsg = computed(() => messages.value[messages.value.length - 1])
const canSend = computed(() => input.value.trim().length > 0 && !loading.value)

onMounted(() => {
  void store.open(props.stepId)
})
onUnmounted(() => {
  store.close()
})
onDeactivated(() => {
  store.close()
})
watch(
  () => props.stepId,
  (id) => {
    void store.open(id)
  },
)

/** 气泡正文：先剥 MiniMax `<think>`，再拆 python 代码块（流式未闭合围栏也按代码块）。 */
function splitParts(content: string): MsgPart[] {
  const visible = assistantBubbleText(content)
  const parts: MsgPart[] = []
  const re = /```(?:python)?[ \t]*\r?\n?([\s\S]*?)(?:```|$)/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(visible))) {
    if (m.index > last) parts.push({ kind: 'text', text: visible.slice(last, m.index) })
    parts.push({ kind: 'code', text: m[1].replace(/\s+$/, '') })
    last = re.lastIndex
  }
  if (last < visible.length) parts.push({ kind: 'text', text: visible.slice(last) })
  return parts
}

function scrollBottom() {
  void nextTick(() => {
    if (listRef.value) listRef.value.scrollTop = listRef.value.scrollHeight
  })
}

watch(messages, scrollBottom, { deep: true })

function onSend() {
  const content = input.value.trim()
  if (!content || loading.value) return
  input.value = ''
  void store.send(content)
}

function stop() {
  store.stop()
}

function clear() {
  if (loading.value) stop()
  void store.clear()
}

function continueTask() {
  void store.continueTask()
}

/** 由父组件调用：把报错内容作为一条 user 消息发出。 */
function ingestHint(text: string) {
  void store.send(`请继续完善当前报告：\n${text}`)
}

defineExpose({ ingestHint })
</script>

<template>
  <div class="rac">
    <header class="rac__head">
      <IIcon name="sparkle" :size="14" />
      <span class="rac__title">AI 撰写 <span class="rac__scope">本节点</span></span>
      <button type="button" class="rac__head-btn" title="清除对话" :disabled="loading" @click="clear">
        <IIcon name="trash" :size="13" />
      </button>
      <button type="button" class="rac__head-btn" title="关闭（可从顶栏「AI 撰写」再次打开）" aria-label="关闭面板" @click="emit('close')">
        <IIcon name="close" :size="13" />
      </button>
    </header>

    <div ref="listRef" class="rac__list">
      <div v-if="store.loading && !messages.length" class="rac__empty">加载对话中…</div>
      <div v-else-if="!messages.length" class="rac__empty">
        会话只属于当前报告节点。描述要写/改的内容；AI 会先读 report-format skill，再通过 update_report_step 写入本节点（empty→draft→done）。
      </div>
      <template v-for="m in messages" :key="m.id">
        <div class="rac__msg" :class="`rac__msg--${m.role}`">
          <ReasoningCard
            v-if="m.role === 'assistant' && m.reasoning"
            :reasoning="m.reasoning"
            :streaming="!!m.streaming && loading"
          />
          <!-- 工具轨迹（run_python_code 验证 / skill / 记忆） -->
          <div v-if="m.role === 'assistant' && m.trace.length" class="rac__traces">
            <div v-for="t in m.trace" :key="t.id" class="rac__trace" :class="{ 'rac__trace--fail': t.ok === false }">
              <span class="rac__trace-name">
                {{ t.name === 'update_report_step' ? '更新报告' : t.name }}{{ t.running ? '…' : '' }}
              </span>
              <pre v-if="t.summary" class="rac__trace-summary">{{ t.summary }}</pre>
            </div>
          </div>
          <template v-for="(part, pi) in splitParts(m.content)" :key="pi">
            <div v-if="part.kind === 'text' && part.text.trim()" class="rac__text">{{ part.text }}</div>
            <div v-else-if="part.kind === 'code'" class="rac__codebox">
              <pre class="rac__code">{{ part.text }}</pre>
                          </div>
          </template>
          <!-- 错误 / 续跑 -->
          <div v-if="m.role === 'assistant' && m.error" class="rac__msgerr">
            {{ m.error }}
            <IButton v-if="store.canContinueTask && m === lastMsg" size="sm" @click="continueTask">继续</IButton>
          </div>
        </div>
      </template>
      <div v-if="loading && lastMsg && !assistantBubbleText(lastMsg.content) && !lastMsg.reasoning && !lastMsg.trace.length" class="rac__typing">
        思考中…
      </div>
    </div>

    <p v-if="store.error" class="rac__err">{{ store.error }}</p>

    <div class="rac__input">
      <textarea
        v-model="input"
        class="rac__textarea"
        rows="3"
        placeholder="描述报告撰写/修改需求（Enter 发送，Shift+Enter 换行）"
        :disabled="loading"
        @keydown.enter.exact.prevent="onSend"
      />
      <div class="rac__input-actions">
        <IButton v-if="loading" size="sm" @click="stop">停止</IButton>
        <IButton v-else variant="primary" size="sm" icon="send" :disabled="!canSend" @click="onSend">
          发送
        </IButton>
      </div>
    </div>
  </div>
</template>

<style scoped>
.rac {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.rac__head {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  border-bottom: 1px solid var(--is-border);
  background: var(--is-surface-hover);
  flex-shrink: 0;
  color: var(--is-accent);
}
.rac__title {
  flex: 1;
  font-size: 12px;
  font-weight: 600;
  color: var(--is-text);
}
.rac__scope {
  margin-left: 6px;
  font-size: 10px;
  font-weight: 500;
  color: var(--is-text-tertiary);
}
.rac__head-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 4px;
  color: var(--is-text-tertiary);
  cursor: pointer;
}
.rac__head-btn:hover:not(:disabled) {
  background: var(--is-surface);
  color: var(--is-text);
}
.rac__head-btn:disabled {
  opacity: 0.5;
  cursor: default;
}

.rac__list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.rac__empty {
  font-size: 12px;
  color: var(--is-text-tertiary);
  line-height: 1.6;
}
.rac__msg {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 12px;
  line-height: 1.6;
}
.rac__msg--user {
  align-self: flex-end;
  max-width: 92%;
  background: var(--is-accent-soft);
  border-radius: 8px;
  padding: 7px 10px;
  white-space: pre-wrap;
  word-break: break-word;
}
.rac__msg--assistant {
  align-self: stretch;
}
.rac__text {
  white-space: pre-wrap;
  word-break: break-word;
}
.rac__codebox {
  border: 1px solid var(--is-border);
  border-radius: 6px;
  overflow: hidden;
  background: var(--is-surface-muted, #f2f4f7);
}
.rac__code {
  margin: 0;
  padding: 8px;
  max-height: 180px;
  overflow: auto;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 11px;
  white-space: pre;
}
.rac__code-actions {
  display: flex;
  gap: 6px;
  padding: 6px 8px;
  border-top: 1px solid var(--is-border);
  background: var(--is-surface);
}
.rac__code-btn {
  font-size: 11px;
  padding: 3px 8px;
  border: 1px solid var(--is-border);
  border-radius: 4px;
  background: var(--is-surface);
  color: var(--is-text-secondary);
  cursor: pointer;
}
.rac__code-btn:hover {
  border-color: var(--is-accent);
  color: var(--is-accent);
  background: var(--is-accent-soft);
}
.rac__typing {
  font-size: 11px;
  color: var(--is-text-tertiary);
}

.rac__traces {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.rac__trace {
  border: 1px solid var(--is-border);
  border-radius: 6px;
  background: var(--is-surface);
  padding: 5px 8px;
}
.rac__trace--fail {
  border-color: var(--is-danger);
}
.rac__trace-name {
  font-size: 11px;
  font-weight: 600;
  color: var(--is-text-secondary);
}
.rac__trace--fail .rac__trace-name {
  color: var(--is-danger);
}
.rac__trace-summary {
  margin: 3px 0 0;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 10.5px;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 120px;
  overflow: auto;
  color: var(--is-text-secondary);
}

.rac__msgerr {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  color: var(--is-danger);
  background: var(--is-danger-soft);
  border-radius: 6px;
  padding: 6px 8px;
  white-space: pre-wrap;
  word-break: break-word;
}

.rac__err {
  margin: 0;
  padding: 6px 10px;
  font-size: 11px;
  color: var(--is-danger);
  background: var(--is-danger-soft);
}

.rac__input {
  flex-shrink: 0;
  border-top: 1px solid var(--is-border);
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.rac__textarea {
  width: 100%;
  resize: none;
  border: 1px solid var(--is-border);
  border-radius: 6px;
  padding: 6px 8px;
  font-size: 12px;
  font-family: inherit;
  color: var(--is-text);
  background: var(--is-surface);
}
.rac__textarea:focus {
  outline: 2px solid color-mix(in srgb, var(--is-accent) 40%, transparent);
  border-color: var(--is-accent);
}
.rac__input-actions {
  display: flex;
  justify-content: flex-end;
}
</style>
