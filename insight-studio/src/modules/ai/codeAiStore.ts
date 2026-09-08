/**
 * Custom Code 步骤的 AI 场景（codeAiStore）：
 * 复用主会话的 agent-loop 内核（runAgent：多轮工具、续跑、防截断），
 * 工具集聚焦写代码：skill/记忆 + run_python_code 草稿执行验证；
 * 会话按 (analysisId, stepId) 挂到步骤并持久化。
 */
import { defineStore } from 'pinia'
import { runAgent, MaxIterError, AgentRunError, type AgentEvent, type ToolExecutor } from './agentLoop'
import {
  aiConfigApi,
  aiConvApi,
  aiMemoriesApi,
  aiSkillsApi,
  sanitizeModelError,
  type AiPublicConfig,
} from './client'
import type { ChatMessage, ToolCall } from './client'
import { makeOnEvent, type UiMessage } from './aiStore'
import { buildSkillsCatalogPrompt, buildMemoriesPrompt } from './prompts'
import { execRunPythonCode, type RunPythonCodeCtx } from './tools/pythonExec'
import { clearTransientProgress, applyUserAbortToMessages } from './userAbort'
import { continueTaskSystemMessage, planIncomplete } from './taskState'
import { AUTO_COMPRESS_AT, estimateTokens, estimateChatTokens, summarizeTurns } from './tokens'
import { pythonPackagesPromptList } from '../steps/pythonPackages'
import { useAnalysisStore } from '../../stores/analysisStore'

let uid = 0
const nextId = () => `cc-${Date.now()}-${++uid}`

/** 该场景的工具定义（不含分析工具，防跑偏）。 */
const CODE_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'run_python_code',
      description:
        '在科研运行时中执行代码（草稿验证，不影响正式输出）。缺省执行用户当前编辑器中的最新代码；也可传入 code 先验证候选写法再给用户。返回 stdout、产物摘要与报错；失败时应根据报错修正后重跑，直到通过。',
      parameters: {
        type: 'object',
        properties: {
          code: { type: 'string', description: '要验证的完整 Python 代码（可选；缺省用当前编辑器代码）' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_skills',
      description: '列出已安装的 AI Skills（id、名称、描述、是否启用）。需要细节时再 read_skill。',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'read_skill',
      description: '读取某个 Skill 的完整 SKILL.md 说明书正文。',
      parameters: {
        type: 'object',
        properties: { skillId: { type: 'string', description: 'Skill id（来自 list_skills）' } },
        required: ['skillId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'save_memory',
      description: '将用户纠正过的写法/约定沉淀为记忆，供后续会话遵守。content 应是简短可复用的教训。',
      parameters: {
        type: 'object',
        properties: { content: { type: 'string', description: '教训正文' } },
        required: ['content'],
      },
    },
  },
]

interface CodeAiState {
  config: AiPublicConfig | null
  /** 当前挂接的步骤与分析。 */
  stepId: string | null
  analysisId: string | null
  conversationId: string | null
  messages: UiMessage[]
  running: boolean
  loading: boolean
  error: string
  abort: AbortController | null
}

export const useCodeAiStore = defineStore('codeAi', {
  state: (): CodeAiState => ({
    config: null,
    stepId: null,
    analysisId: null,
    conversationId: null,
    messages: [],
    running: false,
    loading: false,
    error: '',
    abort: null,
  }),

  getters: {
    resumableAssistant: (s): UiMessage | null => {
      for (let i = s.messages.length - 1; i >= 0; i -= 1) {
        const m = s.messages[i]
        if (m.role !== 'assistant' || m.planDismissed) continue
        if (m.planSteps?.length && (m.incomplete || planIncomplete(m.planSteps, m.planDone))) return m
        if (m.error && (m.rawTail?.length || m.trace.length)) return m
      }
      return null
    },
    canContinueTask(): boolean {
      return !this.running && !!this.resumableAssistant
    },
  },

  actions: {
    /** 打开某步骤的 AI 面板：加载其专属会话（无则待首次发送时创建）。 */
    async open(stepId: string): Promise<void> {
      if (this.stepId === stepId && !this.loading) return
      this.stop()
      this.stepId = stepId
      this.analysisId = useAnalysisStore().current?.id ?? null
      this.conversationId = null
      this.messages = []
      this.error = ''
      this.loading = true
      try {
        if (!this.config) {
          try {
            this.config = await aiConfigApi.get()
          } catch {
            this.config = null
          }
        }
        const list = await aiConvApi.list(stepId)
        if (list.length) {
          const doc = await aiConvApi.get(list[0].id)
          this.conversationId = doc.id
          this.messages = Array.isArray(doc.messages) ? (doc.messages as UiMessage[]) : []
          for (const m of this.messages) {
            if (!Array.isArray(m.trace)) m.trace = []
            if (!Array.isArray(m.artifacts)) m.artifacts = []
          }
          clearTransientProgress(this.messages)
        }
      } catch (e) {
        this.error = e instanceof Error ? e.message : String(e)
      } finally {
        this.loading = false
      }
    },

    /** 面板关闭：停掉进行中的循环并落盘。 */
    close(): void {
      this.stop()
      this.stepId = null
      this.analysisId = null
      this.conversationId = null
      this.messages = []
      this.error = ''
    },

    /** 场景 system 提示：契约 + 上游输入 + 白名单 + 当前代码（每轮重建，带最新上下文）。 */
    buildSystemPrompt(opts: { inputsSummary: string; lastError?: string; code: string }): string {
      return `你是 Custom Code（Python）代码助手，运行在带工具的 agent 循环中。必须严格遵守平台契约。

## 契约
- 入口必须是：def custom_code(inputs: list[IOData], **kwargs) -> list[IOData]
- 即使单输出也必须返回 [IOData(...)]
- IOData(name, data)，data 只能是：pandas DataFrame（输出表）、BytesIO（输出文件）、plotly.graph_objects Figure（输出图表）
- inputs 按连线顺序传入；用 inputs[i].data 或按 name 引用

## 上游 inputs（当前连接）
${opts.inputsSummary}

## 白名单包（仅可 import）
${pythonPackagesPromptList()}

## 硬约束
- 禁止 pip install / 网络请求 / 读写任意本地路径
- 如果用户当前脚本非空，优先在其基础上修改，保留有效逻辑

## 工作方式
- 写完或修改代码后，调用 run_python_code 验证（缺省执行用户当前代码；候选写法可传 code 先验）。
- 执行报错时根据报错修正并再次 run_python_code，直到通过；不要让用户自己去试错。
- 验证通过后，在回复中用 \`\`\`python 代码块给出完整最终代码；纯问答时简明回答。
- 用户要求修改代码时给出完整代码而非片段。
${opts.lastError ? `\n## 最近一次执行错误（用户侧）\n${opts.lastError}\n` : ''}
## 用户当前代码
${opts.code || '（空）'}`
    },

    async buildToolsAndExec(): Promise<{ tools: typeof CODE_TOOLS; exec: ToolExecutor }> {
      const stepId = this.stepId
      const exec: ToolExecutor = async (call: ToolCall, args: Record<string, unknown>) => {
        const name = call.function.name
        try {
          if (name === 'run_python_code') {
            const ctx: RunPythonCodeCtx = {
              stepId: stepId ?? '',
              getCode: () => String(useAnalysisStore().current?.steps.find((s) => s.id === stepId)?.config.code ?? ''),
            }
            return await execRunPythonCode(ctx, args)
          }
          if (name === 'list_skills') {
            const list = await aiSkillsApi.list()
            if (!list.length) return { ok: true, summary: '暂无已安装 Skill' }
            const lines = list.map((s) => `- ${s.name}（id: ${s.id}，${s.enabled ? '启用' : '停用'}）：${s.description || '无描述'}`)
            return { ok: true, summary: `已安装 ${list.length} 个 Skill：\n${lines.join('\n')}` }
          }
          if (name === 'read_skill') {
            const id = String(args.skillId ?? '').trim()
            if (!id) return { ok: false, summary: '缺少 skillId' }
            const d = await aiSkillsApi.get(id)
            return { ok: true, summary: `# ${d.name} (${d.id})\n\n${d.body}` }
          }
          if (name === 'save_memory') {
            const content = String(args.content ?? '').trim()
            if (!content) return { ok: false, summary: '缺少 content（请写入简短可复用的教训）' }
            const rec = await aiMemoriesApi.create(content)
            return { ok: true, summary: `已保存记忆（id: ${rec.id}）：${rec.content}` }
          }
          return { ok: false, summary: `未知工具：${name}` }
        } catch (e) {
          return { ok: false, summary: `工具执行失败：${e instanceof Error ? e.message : String(e)}` }
        }
      }
      return { tools: CODE_TOOLS, exec }
    },

    /** 组装本轮模型消息：场景 system + skill/记忆注入 + 历史。 */
    async buildChatMessages(
      assistantId: string,
      opts: { inputsSummary: string; lastError?: string; code: string; tail?: ChatMessage[]; resumeHint?: string },
    ): Promise<ChatMessage[]> {
      const messages: ChatMessage[] = [{ role: 'system', content: this.buildSystemPrompt(opts) }]
      // skill / 记忆注入（失败降级）
      try {
        const skills = await aiSkillsApi.list()
        const catalog = buildSkillsCatalogPrompt(
          skills.filter((s) => s.enabled).map((s) => ({ id: s.id, name: s.name, description: s.description })),
        )
        if (catalog) messages.push({ role: 'system', content: catalog })
      } catch {
        /* skip */
      }
      try {
        const memories = await aiMemoriesApi.list()
        const memPrompt = buildMemoriesPrompt(memories)
        if (memPrompt) messages.push({ role: 'system', content: memPrompt })
      } catch {
        /* skip */
      }
      for (const m of this.messages) {
        if (m.id === assistantId) continue
        if (m.role === 'system' && m.kind === 'context-summary') {
          messages.push({ role: 'system', content: m.content })
          continue
        }
        messages.push({ role: m.role, content: m.content })
      }
      if (opts.tail?.length) messages.push(...opts.tail)
      if (opts.resumeHint) messages.push({ role: 'system', content: opts.resumeHint })
      return messages
    },

    async ensureConversation(): Promise<void> {
      if (this.conversationId) return
      const doc = await aiConvApi.create({
        analysisId: this.analysisId,
        stepId: this.stepId,
        title: 'Custom Code AI',
      })
      this.conversationId = doc.id
    },

    async send(text: string, ctx: { inputsSummary: string; lastError?: string; code: string }): Promise<void> {
      const input = text.trim()
      if (!input || this.running) return
      this.error = ''
      clearTransientProgress(this.messages)
      await this.ensureConversation()
      if (estimateTokens(ctx.code) + estimateChatTokens(this.messages.map((m) => ({ role: m.role, content: m.content }))) > AUTO_COMPRESS_AT) {
        await this.compressContext()
      }

      this.messages.push({
        id: nextId(),
        role: 'user',
        content: input,
        trace: [],
        artifacts: [],
        at: Date.now(),
      })
      this.messages.push({ id: nextId(), role: 'assistant', content: '', trace: [], artifacts: [], streaming: true, at: Date.now() })
      const assistant = this.messages[this.messages.length - 1] as UiMessage

      this.running = true
      this.abort = new AbortController()
      const ac = this.abort
      const chatMessages = await this.buildChatMessages(assistant.id, ctx)
      const { tools, exec } = await this.buildToolsAndExec()

      const baseLen = chatMessages.length
      try {
        const finalMessages = await runAgent({
          messages: chatMessages,
          tools,
          exec,
          maxIterations: Math.min(20, this.config?.maxIterations ?? 20),
          signal: ac.signal,
          planGate: false,
          sweepFailedEmpty: false,
          onEvent: makeOnEvent(assistant, () => undefined),
        })
        assistant.rawTail = finalMessages.slice(baseLen)
      } catch (err) {
        this.handleRunError(err, assistant, baseLen)
      } finally {
        assistant.streaming = false
        if (this.abort === ac) {
          this.running = false
          this.abort = null
        }
        await this.persist()
      }
    },

    /** 从检查点续跑（错误中断后点「继续」）。 */
    async continueTask(ctx: { inputsSummary: string; lastError?: string; code: string }): Promise<void> {
      if (this.running) return
      const prev = this.resumableAssistant as UiMessage | null
      if (!prev) return
      await this.ensureConversation()

      const resumeHint = prev.planSteps?.length
        ? continueTaskSystemMessage(prev.planSteps, prev.planDone ?? [])
        : '【续跑检查点】上次因模型/网络错误中断。请从断点继续，复用已有工具结果，禁止重复已完成操作；直接调用工具，完成后给出最终代码。'

      this.messages.push({
        id: nextId(),
        role: 'assistant',
        content: '',
        trace: [],
        artifacts: [],
        streaming: true,
        at: Date.now(),
        ...(prev.planSteps ? { planSteps: [...prev.planSteps], planDone: [...(prev.planDone ?? [])] } : {}),
      })
      const assistant = this.messages[this.messages.length - 1] as UiMessage
      prev.error = undefined

      this.running = true
      this.abort = new AbortController()
      const ac = this.abort
      const chatMessages = await this.buildChatMessages(assistant.id, {
        ...ctx,
        tail: prev.rawTail?.length
          ? prev.rawTail
          : prev.content
            ? [{ role: 'assistant' as const, content: prev.content }]
            : [],
        resumeHint,
      })
      const { tools, exec } = await this.buildToolsAndExec()
      const baseLen = chatMessages.length
      try {
        const finalMessages = await runAgent({
          messages: chatMessages,
          tools,
          exec,
          maxIterations: Math.min(20, this.config?.maxIterations ?? 20),
          signal: ac.signal,
          planGate: false,
          sweepFailedEmpty: false,
          ...(prev.planSteps ? { initialPlan: { steps: prev.planSteps, done: prev.planDone ?? [] } } : {}),
          onEvent: makeOnEvent(assistant, () => undefined),
        })
        assistant.rawTail = finalMessages.slice(baseLen)
        prev.incomplete = false
      } catch (err) {
        this.handleRunError(err, assistant, baseLen)
      } finally {
        assistant.streaming = false
        if (this.abort === ac) {
          this.running = false
          this.abort = null
        }
        await this.persist()
      }
    },

    handleRunError(err: unknown, assistant: UiMessage, baseLen: number): void {
      if (err instanceof MaxIterError) {
        assistant.maxIter = true
        assistant.error = err.message
        assistant.incomplete = true
      } else if (err instanceof DOMException && err.name === 'AbortError') {
        assistant.error = '已中止'
        applyUserAbortToMessages(this.messages)
      } else if (err instanceof AgentRunError) {
        assistant.error = sanitizeModelError(err.message)
        assistant.rawTail = err.partialMessages.slice(baseLen)
        assistant.incomplete = true
      } else {
        assistant.error = sanitizeModelError(err instanceof Error ? err.message : String(err))
        assistant.incomplete = true
      }
    },

    /** 压缩历史：保留最近 2 个用户轮，更早折叠为摘要（代码上下文每轮重建，不担心丢细节）。 */
    async compressContext(): Promise<boolean> {
      const userIdxs = this.messages.map((m, i) => (m.role === 'user' ? i : -1)).filter((i) => i >= 0)
      if (userIdxs.length <= 2) return false
      const keepFrom = userIdxs[userIdxs.length - 2]
      const summary = summarizeTurns(this.messages.slice(0, keepFrom).map((m) => ({ role: m.role, content: m.content })))
      this.messages.splice(0, keepFrom, {
        id: nextId(),
        role: 'system',
        kind: 'context-summary',
        content: summary,
        trace: [],
        artifacts: [],
        at: Date.now(),
      })
      await this.persist()
      return true
    },

    stop(): void {
      this.abort?.abort()
      applyUserAbortToMessages(this.messages)
      this.running = false
      this.abort = null
      void this.persist()
    },

    /** 清空对话（删除后端会话）。 */
    async clear(): Promise<void> {
      this.stop()
      if (this.conversationId) {
        try {
          await aiConvApi.remove(this.conversationId)
        } catch {
          /* ignore */
        }
      }
      this.conversationId = null
      this.messages = []
      this.error = ''
    },

    async persist(): Promise<void> {
      if (!this.conversationId) return
      const messages = this.messages.map((m) => ({
        ...m,
        streaming: false,
        trace: (m.trace ?? []).map((t) => ({ ...t, running: false })),
      }))
      try {
        await aiConvApi.update(this.conversationId, { messages: messages as unknown[] })
      } catch {
        /* 持久化失败不打断 */
      }
    },
  },
})
