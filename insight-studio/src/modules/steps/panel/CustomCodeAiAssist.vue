<script setup lang="ts">
/**
 * Custom Code 配置面板旁的 AI 写代码侧栏。
 * 不执行代码；仅生成 Python，由用户写入编辑器后 Save/Run。
 */
import { computed, ref } from 'vue'
import type { StepNode } from '../../../shared/types'
import { contentText, postChat, readSseStream, type ChatMessage } from '../../ai/client'
import { IButton, IIcon, ITextField } from '../../../ui'

const props = defineProps<{
  step: StepNode
  code: string
  inputsSummary: string
  lastError?: string
}>()

const emit = defineEmits<{ (e: 'apply', code: string): void }>()

const open = ref(true)
const prompt = ref('')
const loading = ref(false)
const draft = ref('')
const errorMsg = ref('')

const canSend = computed(() => prompt.value.trim().length > 0 && !loading.value)

function systemPrompt(): string {
  return `你是 Custom Code（Python）代码生成助手。必须严格遵守平台契约，只输出 Python 代码，不要解释。

## 契约
- 入口必须是：def custom_code(inputs: list[IOData], **kwargs) -> list[IOData]
- 即使单输出也必须返回 [IOData(...)]
- IOData(name, data)，data 只能是：pandas DataFrame（输出表）、BytesIO（输出文件）、plotly.graph_objects Figure（输出图表）
- inputs 按连线顺序传入；用 inputs[i].data 或按 name 引用

## 上游 inputs（当前连接）
${props.inputsSummary}

## 白名单包（仅可 import）
pandas, numpy, scipy, scikit-learn, rdkit, plotly, openpyxl, pydantic

## 硬约束
- 禁止 pip install / 网络请求 / 读写任意本地路径
- 代码需要能直接被 exec 后调用 custom_code；可省略 import pandas 若依赖 pd，但建议显式 import
- 如果用户当前脚本非空，优先在其基础上修改，保留有效逻辑

## 输出
只输出一个完整 Python 脚本代码块（\`\`\`python ... \`\`\`），不要额外文字。`
}

function extractCode(text: string): string {
  const m = text.match(/```python\s*([\s\S]*?)```/) ?? text.match(/```\s*([\s\S]*?)```/)
  if (m) return m[1].trim()
  return text.trim()
}

async function send() {
  if (!canSend.value) return
  loading.value = true
  errorMsg.value = ''
  draft.value = ''
  try {
    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt() },
      {
        role: 'user',
        content: [
          `需求：${prompt.value}`,
          props.code ? `\n当前脚本：\n${props.code}` : '',
          props.lastError ? `\n最近一次错误：\n${props.lastError}` : '',
        ].filter(Boolean).join('\n'),
      },
    ]
    const res = await postChat({ messages })
    const msg = await readSseStream(res, (t) => {
      draft.value += t
    })
    const finalText = contentText(msg.content) || draft.value
    draft.value = finalText || draft.value
    prompt.value = ''
  } catch (e) {
    errorMsg.value = e instanceof Error ? e.message : String(e)
  } finally {
    loading.value = false
  }
}

function apply() {
  const code = extractCode(draft.value)
  if (!code) return
  emit('apply', code)
}
</script>

<template>
  <section class="cca">
    <header class="cca__head">
      <button type="button" class="cca__toggle" :aria-expanded="open" @click="open = !open">
        <IIcon name="sparkle" :size="14" />
        <span>AI 写代码</span>
        <IIcon :name="open ? 'chevron-down' : 'chevron-right'" :size="12" />
      </button>
    </header>
    <div v-if="open" class="cca__body">
      <p class="cca__hint">描述你要做的处理；生成的代码需先写入编辑器，再 Save/Run 才会执行。</p>
      <div class="cca__row">
        <ITextField
          v-model="prompt"
          size="sm"
          placeholder="如：用 rdkit 按 smiles 列算分子量，输出新表"
          :disabled="loading"
          @keydown.enter.prevent="send"
        />
        <IButton variant="primary" size="sm" :disabled="!canSend" icon="send" @click="send">
          {{ loading ? '生成中…' : '生成' }}
        </IButton>
      </div>
      <p v-if="errorMsg" class="cca__err">{{ errorMsg }}</p>
      <div v-if="draft" class="cca__draft">
        <pre class="cca__pre">{{ draft }}</pre>
        <div class="cca__actions">
          <IButton size="sm" @click="apply">写入编辑器</IButton>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.cca {
  border: 1px solid var(--is-border);
  border-radius: var(--is-radius);
  overflow: hidden;
  margin-bottom: 10px;
}
.cca__toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 10px;
  font-size: var(--is-text-sm);
  font-weight: 600;
  color: var(--is-text);
}
.cca__toggle:hover {
  background: var(--is-surface-hover);
}
.cca__body {
  padding: 10px;
  border-top: 1px solid var(--is-border);
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.cca__hint {
  font-size: var(--is-text-xs);
  color: var(--is-text-tertiary);
}
.cca__row {
  display: flex;
  gap: 8px;
  align-items: center;
}
.cca__row :first-child {
  flex: 1;
}
.cca__err {
  font-size: var(--is-text-xs);
  color: var(--is-danger, #b42318);
}
.cca__draft {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.cca__pre {
  margin: 0;
  padding: 8px;
  max-height: 220px;
  overflow: auto;
  background: var(--is-surface-muted, #f2f4f7);
  border-radius: var(--is-radius-sm);
  font-size: 11px;
  white-space: pre-wrap;
}
.cca__actions {
  display: flex;
  gap: 8px;
}
</style>
