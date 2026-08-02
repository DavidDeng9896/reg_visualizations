import { defineStore } from 'pinia'
import { runAgent, MaxIterError, type ToolExecutor } from './agentLoop'
import { aiConfigApi, aiConvApi, type AiPublicConfig, type ConversationMeta } from './client'
import type { ChatMessage, ToolCall } from './client'
import { OPENAI_TOOLS } from './tools/registry'
import { execTool } from './tools/impl'
import { buildAnalysisContext, buildMentionContext, type MentionTarget } from './context'
import { SYSTEM_PROMPT } from './prompts'
import type { Artifact } from './types'
import { useAnalysisStore } from '../../stores/analysisStore'

export interface TraceItem {
  id: string
  name: string
  /** 原始参数（危险操作确认后重放用）。 */
  args?: Record<string, unknown>
  ok?: boolean
  running?: boolean
  summary: string
  artifact?: Artifact
  needsConfirmation?: boolean
  confirmed?: boolean
}

export interface UiMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  trace: TraceItem[]
  artifacts: Artifact[]
  planSteps?: string[]
  planDone?: number[]
  streaming?: boolean
  error?: string
  maxIter?: boolean
}

interface AiState {
  drawerOpen: boolean
  settingsOpen: boolean
  config: AiPublicConfig | null
  conversations: ConversationMeta[]
  currentId: string | null
  messages: UiMessage[]
  running: boolean
  abort: AbortController | null
}

let uid = 0
const nextId = () => `m-${Date.now()}-${++uid}`

export const useAiStore = defineStore('ai', {
  state: (): AiState => ({
    drawerOpen: false,
    settingsOpen: false,
    config: null,
    conversations: [],
    currentId: null,
    messages: [],
    running: false,
    abort: null,
  }),

  getters: {
    configured: (s) => !!s.config?.configured,
  },

  actions: {
    async init() {
      try {
        this.config = await aiConfigApi.get()
      } catch {
        this.config = null
      }
      await this.refreshConversations()
    },

    async refreshConversations() {
      try {
        this.conversations = await aiConvApi.list()
      } catch {
        this.conversations = []
      }
    },

    async newConversation() {
      const analysis = useAnalysisStore().current
      const doc = await aiConvApi.create({ analysisId: analysis?.id ?? null, title: '新会话' })
      this.currentId = doc.id
      this.messages = []
      await this.refreshConversations()
    },

    async selectConversation(id: string) {
      const doc = await aiConvApi.get(id)
      this.currentId = doc.id
      this.messages = (doc.messages as UiMessage[]) ?? []
      // 回看时清理瞬态
      for (const m of this.messages) {
        m.streaming = false
        for (const t of m.trace) t.running = false
      }
    },

    async ensureConversation(): Promise<void> {
      if (this.currentId) return
      await this.newConversation()
    },

    toggleDrawer() {
      this.drawerOpen = !this.drawerOpen
      if (this.drawerOpen) void this.init()
    },

    /** 发送用户消息并跑 agent-loop。 */
    async send(text: string, mentions: MentionTarget[] = []): Promise<void> {
      const input = text.trim()
      if (!input || this.running) return
      await this.ensureConversation()

      this.messages.push({ id: nextId(), role: 'user', content: input, trace: [], artifacts: [] })
      // 必须经 store 的响应式数组取回 proxy 再改，直接改原始对象不触发视图更新
      this.messages.push({ id: nextId(), role: 'assistant', content: '', trace: [], artifacts: [], streaming: true })
      const assistant = this.messages[this.messages.length - 1] as UiMessage

      this.running = true
      this.abort = new AbortController()

      const analysis = useAnalysisStore().current
      const chatMessages: ChatMessage[] = [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'system', content: buildAnalysisContext(analysis) },
        ...this.messages
          .filter((m) => m.id !== assistant.id)
          .map((m) => ({ role: m.role, content: m.content }) as ChatMessage),
      ]
      const mentionCtx = buildMentionContext(analysis, mentions)
      if (mentionCtx) chatMessages.splice(chatMessages.length - 1, 0, { role: 'system', content: mentionCtx })

      const confirmDestructive = this.config?.confirmDestructive ?? true
      const exec: ToolExecutor = async (call: ToolCall, args: Record<string, unknown>) => {
        const res = await execTool(call.function.name, args, { confirmDestructive })
        return res
      }

      const pushArtifact = (a?: Artifact) => {
        if (a && !assistant.artifacts.some((x) => x.name === a.name && x.kind === a.kind)) assistant.artifacts.push(a)
      }

      try {
        await runAgent({
          messages: chatMessages,
          tools: OPENAI_TOOLS,
          exec,
          maxIterations: this.config?.maxIterations ?? 8,
          signal: this.abort.signal,
          onEvent: (e) => {
            if (e.type === 'token') {
              assistant.content += e.text
            } else if (e.type === 'tool_call') {
              let args: Record<string, unknown> = {}
              try {
                args = JSON.parse(e.call.function.arguments || '{}') as Record<string, unknown>
              } catch {
                /* ignore */
              }
              assistant.trace.push({
                id: e.call.id,
                name: e.call.function.name,
                args,
                running: true,
                summary: '',
              })
            } else if (e.type === 'tool_result') {
              // 同 id 重复（模型偶发复用 call id）时优先匹配仍在 running 的那条
              const item =
                assistant.trace.find((t) => t.id === e.id && t.running) ??
                assistant.trace.find((t) => t.id === e.id) ??
                assistant.trace[assistant.trace.length - 1]
              if (item) {
                item.running = false
                item.ok = e.ok
                item.summary = e.summary
                item.artifact = e.artifact
                item.needsConfirmation = e.needsConfirmation
              }
              pushArtifact(e.artifact)
            } else if (e.type === 'plan') {
              assistant.planSteps = e.steps
              assistant.planDone = []
            } else if (e.type === 'step_done') {
              if (assistant.planDone && !assistant.planDone.includes(e.index)) assistant.planDone.push(e.index)
            } else if (e.type === 'done') {
              assistant.content = e.content || assistant.content
            }
          },
        })
      } catch (err) {
        if (err instanceof MaxIterError) {
          assistant.maxIter = true
          assistant.error = err.message
        } else if (err instanceof DOMException && err.name === 'AbortError') {
          assistant.error = '已中止'
        } else {
          assistant.error = err instanceof Error ? err.message : String(err)
        }
      } finally {
        assistant.streaming = false
        this.running = false
        this.abort = null
        await this.persist()
      }
    },

    /** 危险操作确认：重放该工具调用（带 __confirmed 与原始参数）。 */
    async confirmAndResume(traceId: string, name: string, description: string): Promise<void> {
      const assistant = this.messages[this.messages.length - 1]
      const item = assistant?.trace.find((t) => t.id === traceId)
      if (!assistant || !item || !item.needsConfirmation || item.confirmed) return
      item.confirmed = true
      item.running = true
      item.summary = `已确认：${description}`
      const res = await execTool(name, { ...(item.args ?? {}), __confirmed: true }, { confirmDestructive: false })
      item.running = false
      item.ok = res.ok
      item.summary = res.summary
      if (res.artifact) pushArtifactSafe(assistant, res.artifact)
      await this.persist()
    },

    stop() {
      this.abort?.abort()
    },

    async retry(): Promise<void> {
      const lastUser = [...this.messages].reverse().find((m) => m.role === 'user')
      const lastAssistant = this.messages[this.messages.length - 1]
      if (!lastUser || this.running) return
      if (lastAssistant?.role === 'assistant') this.messages.pop()
      this.messages.pop() // 去掉原 user 消息，重发
      await this.send(lastUser.content)
    },

    async persist(): Promise<void> {
      if (!this.currentId) return
      const firstUser = this.messages.find((m) => m.role === 'user')
      const title = firstUser ? firstUser.content.slice(0, 24) : '新会话'
      try {
        await aiConvApi.update(this.currentId, { title, messages: this.messages as unknown[] })
        await this.refreshConversations()
      } catch {
        /* 持久化失败不打断 */
      }
    },

    async removeConversation(id: string): Promise<void> {
      await aiConvApi.remove(id)
      if (this.currentId === id) {
        this.currentId = null
        this.messages = []
      }
      await this.refreshConversations()
    },
  },
})

function pushArtifactSafe(msg: UiMessage, a?: Artifact): void {
  if (a && !msg.artifacts.some((x) => x.name === a.name && x.kind === a.kind)) msg.artifacts.push(a)
}
