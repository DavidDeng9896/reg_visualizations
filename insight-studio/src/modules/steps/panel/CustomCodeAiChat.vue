<script setup lang="ts">
/**
 * Custom Code 嵌入式 AI 对话（悬浮窗）：底层走 codeAiStore（主会话 agent-loop 内核）。
 * 能力：多轮工具调用（run_python_code 草稿验证 / skill / 记忆）、截断续写、检查点续跑、按步骤持久化。
 */
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useCodeAiStore } from '../../ai/codeAiStore'
import ReasoningCard from '../../ai/ReasoningCard.vue'
import { IButton, IIcon } from '../../../ui'

interface MsgPart {
  kind: 'text' | 'code'
  text: string
}

const props = defineProps<{
  stepId: string
  code: string
  inputsSummary: string
  lastError?: string
}>()

const emit = defineEmits<{
  (e: 'apply', code: string): void
  (e: 'insert', text: string): void
  (e: 'minimize'): void
  (e: 'close'): void
}>()

const store = useCodeAiStore()
const input = ref('')
const listRef = ref<HTMLElement | null>(null)

const messages = computed(() => store.messages)
const loading = computed(() => store.running)
const lastMsg = computed(() => messages.value[messages.value.length - 1])
const canSend = computed(() => input.value.trim().length > 0 && !loading.value)

function ctx() {
  return { inputsSummary: props.inputsSummary, lastError: props.lastError, code: props.code }
}

onMounted(() => {
  void store.open(props.stepId)
})
onUnmounted(() => {
  store.close()
})
watch(
  () => props.stepId,
  (id) => {
    void store.open(id)
  },
)

/** 把消息文本拆成普通文本与 ```python 代码块（流式中未闭合的围栏也按代码块处理）。 */
function splitParts(content: string): MsgPart[] {
  const parts: MsgPart[] = []
  const re = /```(?:python)?[ \t]*\r?\n?([\s\S]*?)(?:```|$)/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(content))) {
    if (m.index > last) parts.push({ kind: 'text', text: content.slice(last, m.index) })
    parts.push({ kind: 'code', text: m[1].replace(/\s+$/, '') })
    last = re.lastIndex
  }
  if (last < content.length) parts.push({ kind: 'text', text: content.slice(last) })
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
  void store.send(content, ctx())
}

function stop() {
  store.stop()
}

function clear() {
  if (loading.value) stop()
  void store.clear()
}

function continueTask() {
  void store.continueTask(ctx())
}

/** 由父组件调用：把报错内容作为一条 user 消息发出。 */
function ingestError(text: string) {
  void store.send(`执行出错了，请帮我修复：\n${text}`, ctx())
}

defineExpose({ ingestError })
</script>

<template>
  <div class="ccc">
    <header class="ccc__head">
      <IIcon name="sparkle" :size="14" />
      <span class="ccc__title">AI 助手</span>
      <button type="button" class="ccc__head-btn" title="清除对话" :disabled="loading" @click="clear">
        <IIcon name="trash" :size="13" />
      </button>
      <button type="button" class="ccc__head-btn" title="最小化" aria-label="最小化" @click="emit('minimize')">
        <IIcon name="minus" :size="13" />
      </button>
      <button type="button" class="ccc__head-btn" aria-label="关闭面板" @click="emit('close')">
        <IIcon name="close" :size="13" />
      </button>
    </header>

    <div ref="listRef" class="ccc__list">
      <div v-if="store.loading && !messages.length" class="ccc__empty">加载对话中…</div>
      <div v-else-if="!messages.length" class="ccc__empty">
        描述你要做的处理，AI 会基于当前代码与上游输入生成 Custom Code，自动运行验证；生成后可「应用」整段替换或「插入到光标」。
      </div>
      <template v-for="m in messages" :key="m.id">
        <div class="ccc__msg" :class="`ccc__msg--${m.role}`">
          <ReasoningCard
            v-if="m.role === 'assistant' && m.reasoning"
            :reasoning="m.reasoning"
            :streaming="!!m.streaming && loading"
          />
          <!-- 工具轨迹（run_python_code 验证 / skill / 记忆） -->
          <div v-if="m.role === 'assistant' && m.trace.length" class="ccc__traces">
            <div v-for="t in m.trace" :key="t.id" class="ccc__trace" :class="{ 'ccc__trace--fail': t.ok === false }">
              <span class="ccc__trace-name">
                {{ t.name === 'run_python_code' ? '运行验证' : t.name }}{{ t.running ? '…' : '' }}
              </span>
              <pre v-if="t.summary" class="ccc__trace-summary">{{ t.summary }}</pre>
            </div>
          </div>
          <template v-for="(part, pi) in splitParts(m.content)" :key="pi">
            <div v-if="part.kind === 'text' && part.text.trim()" class="ccc__text">{{ part.text }}</div>
            <div v-else-if="part.kind === 'code'" class="ccc__codebox">
              <pre class="ccc__code">{{ part.text }}</pre>
              <div class="ccc__code-actions">
                <button type="button" class="ccc__code-btn" @click="emit('apply', part.text)">应用</button>
                <button type="button" class="ccc__code-btn" @click="emit('insert', part.text)">插入到光标</button>
              </div>
            </div>
          </template>
          <!-- 错误 / 续跑 -->
          <div v-if="m.role === 'assistant' && m.error" class="ccc__msgerr">
            {{ m.error }}
            <IButton v-if="store.canContinueTask && m === lastMsg" size="sm" @click="continueTask">继续</IButton>
          </div>
        </div>
      </template>
      <div v-if="loading && lastMsg && !lastMsg.content && !lastMsg.reasoning && !lastMsg.trace.length" class="ccc__typing">
        思考中…
      </div>
    </div>

    <p v-if="store.error" class="ccc__err">{{ store.error }}</p>

    <div class="ccc__input">
      <textarea
        v-model="input"
        class="ccc__textarea"
        rows="3"
        placeholder="描述要做的修改（Enter 发送，Shift+Enter 换行）"
        :disabled="loading"
        @keydown.enter.exact.prevent="onSend"
      />
      <div class="ccc__input-actions">
        <IButton v-if="loading" size="sm" @click="stop">停止</IButton>
        <IButton v-else variant="primary" size="sm" icon="send" :disabled="!canSend" @click="onSend">
          发送
        </IButton>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ccc {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.ccc__head {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  border-bottom: 1px solid var(--is-border);
  background: var(--is-surface-hover);
  flex-shrink: 0;
  color: var(--is-accent);
}
.ccc__title {
  flex: 1;
  font-size: 12px;
  font-weight: 600;
  color: var(--is-text);
}
.ccc__head-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 4px;
  color: var(--is-text-tertiary);
  cursor: pointer;
}
.ccc__head-btn:hover:not(:disabled) {
  background: var(--is-surface);
  color: var(--is-text);
}
.ccc__head-btn:disabled {
  opacity: 0.5;
  cursor: default;
}

.ccc__list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.ccc__empty {
  font-size: 12px;
  color: var(--is-text-tertiary);
  line-height: 1.6;
}
.ccc__msg {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 12px;
  line-height: 1.6;
}
.ccc__msg--user {
  align-self: flex-end;
  max-width: 92%;
  background: var(--is-accent-soft);
  border-radius: 8px;
  padding: 7px 10px;
  white-space: pre-wrap;
  word-break: break-word;
}
.ccc__msg--assistant {
  align-self: stretch;
}
.ccc__text {
  white-space: pre-wrap;
  word-break: break-word;
}
.ccc__codebox {
  border: 1px solid var(--is-border);
  border-radius: 6px;
  overflow: hidden;
  background: var(--is-surface-muted, #f2f4f7);
}
.ccc__code {
  margin: 0;
  padding: 8px;
  max-height: 180px;
  overflow: auto;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 11px;
  white-space: pre;
}
.ccc__code-actions {
  display: flex;
  gap: 6px;
  padding: 6px 8px;
  border-top: 1px solid var(--is-border);
  background: var(--is-surface);
}
.ccc__code-btn {
  font-size: 11px;
  padding: 3px 8px;
  border: 1px solid var(--is-border);
  border-radius: 4px;
  background: var(--is-surface);
  color: var(--is-text-secondary);
  cursor: pointer;
}
.ccc__code-btn:hover {
  border-color: var(--is-accent);
  color: var(--is-accent);
  background: var(--is-accent-soft);
}
.ccc__typing {
  font-size: 11px;
  color: var(--is-text-tertiary);
}

.ccc__traces {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.ccc__trace {
  border: 1px solid var(--is-border);
  border-radius: 6px;
  background: var(--is-surface);
  padding: 5px 8px;
}
.ccc__trace--fail {
  border-color: var(--is-danger);
}
.ccc__trace-name {
  font-size: 11px;
  font-weight: 600;
  color: var(--is-text-secondary);
}
.ccc__trace--fail .ccc__trace-name {
  color: var(--is-danger);
}
.ccc__trace-summary {
  margin: 3px 0 0;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 10.5px;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 120px;
  overflow: auto;
  color: var(--is-text-secondary);
}

.ccc__msgerr {
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

.ccc__err {
  margin: 0;
  padding: 6px 10px;
  font-size: 11px;
  color: var(--is-danger);
  background: var(--is-danger-soft);
}

.ccc__input {
  flex-shrink: 0;
  border-top: 1px solid var(--is-border);
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.ccc__textarea {
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
.ccc__textarea:focus {
  outline: 2px solid color-mix(in srgb, var(--is-accent) 40%, transparent);
  border-color: var(--is-accent);
}
.ccc__input-actions {
  display: flex;
  justify-content: flex-end;
}
</style>
