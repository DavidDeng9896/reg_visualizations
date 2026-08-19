<script setup lang="ts">
/**
 * Custom Code 嵌入式多轮 AI 对话（由父组件以悬浮窗形式渲染在详情面板左侧）。
 * 复用 postChat / readSseStream 实现流式与中止；独立于全局 aiStore。
 */
import { computed, nextTick, ref, watch } from 'vue'
import { contentText, postChat, readSseStream, type ChatMessage } from '../../ai/client'
import { pythonPackagesPromptList } from '../pythonPackages'
import { IButton, IIcon } from '../../../ui'

interface ChatMsg {
  role: 'user' | 'assistant'
  content: string
}

interface MsgPart {
  kind: 'text' | 'code'
  text: string
}

const props = defineProps<{
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

const messages = ref<ChatMsg[]>([])
const input = ref('')
const loading = ref(false)
const errorMsg = ref('')
const listRef = ref<HTMLElement | null>(null)
let abort: AbortController | null = null

const canSend = computed(() => input.value.trim().length > 0 && !loading.value)
const lastMsg = computed(() => messages.value[messages.value.length - 1])

function systemPrompt(): string {
  return `你是 Custom Code（Python）代码助手。必须严格遵守平台契约。

## 契约
- 入口必须是：def custom_code(inputs: list[IOData], **kwargs) -> list[IOData]
- 即使单输出也必须返回 [IOData(...)]
- IOData(name, data)，data 只能是：pandas DataFrame（输出表）、BytesIO（输出文件）、plotly.graph_objects Figure（输出图表）
- inputs 按连线顺序传入；用 inputs[i].data 或按 name 引用

## 上游 inputs（当前连接）
${props.inputsSummary}

## 白名单包（仅可 import）
${pythonPackagesPromptList()}

## 硬约束
- 禁止 pip install / 网络请求 / 读写任意本地路径
- 如果用户当前脚本非空，优先在其基础上修改，保留有效逻辑

## 输出要求
- 当用户要求修改代码时，用 \`\`\`python 代码块给出完整代码
- 纯问答时简明回答
${props.lastError ? `\n## 最近一次执行错误\n${props.lastError}\n` : ''}
## 用户当前代码
${props.code || '（空）'}`
}

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

async function send(text: string) {
  const content = text.trim()
  if (!content || loading.value) return
  errorMsg.value = ''
  messages.value.push({ role: 'user', content })
  messages.value.push({ role: 'assistant', content: '' })
  input.value = ''
  loading.value = true
  abort = new AbortController()
  try {
    const history: ChatMessage[] = [
      { role: 'system', content: systemPrompt() },
      ...messages.value.slice(0, -1).map((m) => ({ role: m.role, content: m.content })),
    ]
    const last = messages.value[messages.value.length - 1]
    const res = await postChat({ messages: history }, abort.signal)
    const msg = await readSseStream(res, (t) => {
      last.content += t
      scrollBottom()
    })
    const finalText = contentText(msg.content)
    if (finalText) last.content = finalText
    if (!last.content.trim()) last.content = '（无返回内容）'
  } catch (e) {
    const last = messages.value[messages.value.length - 1]
    if (e instanceof Error && e.name === 'AbortError') {
      if (!last.content.trim()) last.content = '（已停止）'
    } else {
      errorMsg.value = e instanceof Error ? e.message : String(e)
      if (last.role === 'assistant' && !last.content.trim()) messages.value.pop()
    }
  } finally {
    loading.value = false
    abort = null
    scrollBottom()
  }
}

function onSend() {
  void send(input.value)
}

function stop() {
  abort?.abort()
}

function clear() {
  if (loading.value) stop()
  messages.value = []
  errorMsg.value = ''
}

/** 由父组件调用：把报错内容作为一条 user 消息发出。 */
function ingestError(text: string) {
  void send(`执行出错了，请帮我修复：\n${text}`)
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
      <div v-if="!messages.length" class="ccc__empty">
        描述你要做的处理，AI 会基于当前代码与上游输入生成 Custom Code；生成后可「应用」整段替换或「插入到光标」。
      </div>
      <div v-for="(m, i) in messages" :key="i" class="ccc__msg" :class="`ccc__msg--${m.role}`">
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
      </div>
      <div v-if="loading && lastMsg && !lastMsg.content" class="ccc__typing">正在生成…</div>
    </div>

    <p v-if="errorMsg" class="ccc__err">{{ errorMsg }}</p>

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
