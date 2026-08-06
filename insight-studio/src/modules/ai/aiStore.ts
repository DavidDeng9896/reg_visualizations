import { defineStore } from 'pinia'
import { runAgent, MaxIterError, type AgentEvent, type AskRequest, type ToolExecutor } from './agentLoop'
import { aiConfigApi, aiConvApi, aiMcpApi, aiMemoriesApi, aiSkillsApi, type AiPublicConfig, type ConversationMeta } from './client'
import type { ChatMessage, ChatPayload, ToolCall } from './client'
import { OPENAI_TOOLS } from './tools/registry'
import { execTool } from './tools/impl'
import { buildAnalysisContext, buildMentionContext, type MentionTarget } from './context'
import { SYSTEM_PROMPT, buildSkillsCatalogPrompt, buildMemoriesPrompt } from './prompts'
import { buildMcpToolsBundle } from './mcpTools'
import { AUTO_COMPRESS_AT, estimateChatTokens, estimateTokens, summarizeTurns } from './tokens'
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
  /** 用户已拒绝该操作（与 needsConfirmation 配对）。 */
  rejected?: boolean
  /** ask_user 提问内容（交互卡片渲染用）。 */
  ask?: { question: string; options: string[]; allowOther: boolean }
}

export interface UiMessage {
  id: string
  /** system 仅用于上下文压缩摘要（kind=context-summary），渲染为分隔条而非气泡。 */
  role: 'user' | 'assistant' | 'system'
  /** 消息种类：context-summary = 上下文压缩摘要。 */
  kind?: 'context-summary'
  content: string
  trace: TraceItem[]
  artifacts: Artifact[]
  /** 推理模型的思考全文（reasoning_content 聚合）。 */
  reasoning?: string
  /** 发送/生成时间（epoch ms），历史消息可能缺省。 */
  at?: number
  planSteps?: string[]
  planDone?: number[]
  streaming?: boolean
  error?: string
  maxIter?: boolean
  /** 本轮 runAgent 追加的模型可见消息尾（assistant/tool 交替），确认/拒绝后重入循环续轮用。 */
  rawTail?: ChatMessage[]
}

interface AiState {
  drawerOpen: boolean
  settingsOpen: boolean
  config: AiPublicConfig | null
  conversations: ConversationMeta[]
  currentId: string | null
  messages: UiMessage[]
  running: boolean
  /** 切换 / 新建会话加载中 */
  switching: boolean
  /** 输入条模型覆盖（优先于 config.model，localStorage 持久）。 */
  modelOverride: string | null
  abort: AbortController | null
  /** ask_user 待答问题（卡片渲染；作答经模块级 resolver 回灌 agent-loop）。 */
  pendingAsk: { id: string; question: string; options: string[]; allowOther: boolean } | null
  /** 对话窗模式：停靠 | 悬浮（与 AiDrawer 同步，供 FAB 显隐）。 */
  panelMode: 'docked' | 'floating'
}

let uid = 0
const nextId = () => `m-${Date.now()}-${++uid}`
/** ask_user 挂起 Promise 的结算函数（作答/取消/中止/切会话共用）。 */
let pendingAskResolve: ((answer: string) => void) | null = null
/** 危险操作确认挂起：与 ask_user 同构，保持 agent-loop 存活直到用户决定。 */
let pendingConfirmResolve: ((resultText: string) => void) | null = null
let pendingConfirmId: string | null = null
const MODEL_KEY = 'insight.ai.model'

export const useAiStore = defineStore('ai', {
  state: (): AiState => ({
    drawerOpen: false,
    settingsOpen: false,
    config: null,
    conversations: [],
    currentId: null,
    messages: [],
    running: false,
    switching: false,
    modelOverride: typeof localStorage !== 'undefined' ? localStorage.getItem(MODEL_KEY) : null,
    abort: null,
    pendingAsk: null,
    panelMode: 'docked',
  }),

  getters: {
    configured: (s) => !!s.config?.configured,
    /** 实际生效的模型：覆盖 > 配置。 */
    effectiveModel: (s) => s.modelOverride || s.config?.model || '',
    /** 可压缩：历史超过最近 2 个用户轮。 */
    compressible: (s) => s.messages.filter((m) => m.role === 'user').length > 2,
    /** 模型可见上下文估算 token（系统提示词 + 摘要/历史）。 */
    contextTokens: (s) =>
      estimateTokens(SYSTEM_PROMPT) + estimateChatTokens(s.messages.map((m) => ({ role: m.role, content: m.content }))),
  },

  actions: {
    setModel(m: string | null) {
      this.modelOverride = m
      if (typeof localStorage !== 'undefined') {
        if (m) localStorage.setItem(MODEL_KEY, m)
        else localStorage.removeItem(MODEL_KEY)
      }
    },

    async init() {
      try {
        this.config = await aiConfigApi.get()
      } catch {
        this.config = null
      }
      await this.refreshConversations()
    },

    /** 打开抽屉时尽量复用已加载配置，避免重复请求拖慢二次打开。 */
    async warmInit() {
      if (this.config) {
        void this.refreshConversations()
        return
      }
      await this.init()
    },

    async refreshConversations() {
      try {
        this.conversations = await aiConvApi.list()
      } catch {
        this.conversations = []
      }
    },

    async newConversation() {
      this.switching = true
      try {
        const analysis = useAnalysisStore().current
        const doc = await aiConvApi.create({ analysisId: analysis?.id ?? null, title: '新会话' })
        this.currentId = doc.id
        this.messages = []
        await this.refreshConversations()
      } finally {
        this.switching = false
      }
    },

    async selectConversation(id: string) {
      if (this.currentId === id) return
      this.switching = true
      try {
        this.settleAsk('（会话已切换，提问已取消）')
        this.settleConfirm('用户切换了会话，危险操作未执行。')
        // 切换前先落盘当前会话，避免历史里点回来丢消息
        await this.persist()
        const doc = await aiConvApi.get(id)
        this.currentId = doc.id
        this.messages = Array.isArray(doc.messages) ? (doc.messages as UiMessage[]) : []
        // 回看时清理瞬态
        for (const m of this.messages) {
          m.streaming = false
          if (!Array.isArray(m.trace)) m.trace = []
          if (!Array.isArray(m.artifacts)) m.artifacts = []
          for (const t of m.trace) t.running = false
        }
      } catch (e) {
        console.error('[aiStore.selectConversation]', e)
        throw e
      } finally {
        this.switching = false
      }
    },

    async ensureConversation(): Promise<void> {
      if (this.currentId) return
      await this.newConversation()
    },

    toggleDrawer() {
      this.drawerOpen = !this.drawerOpen
      if (this.drawerOpen) void this.warmInit()
    },

    setPanelMode(mode: 'docked' | 'floating') {
      this.panelMode = mode
    },

    /** 发送用户消息并跑 agent-loop。 */
    async send(text: string, mentions: MentionTarget[] = []): Promise<void> {
      const input = text.trim()
      if (!input || this.running) return
      await this.ensureConversation()
      // 上下文超过阈值（上限 80%）先自动压缩：最近 2 个用户轮保留，更早历史折叠为摘要
      if (this.contextTokens > AUTO_COMPRESS_AT) await this.compressContext()

      this.messages.push({ id: nextId(), role: 'user', content: input, trace: [], artifacts: [], at: Date.now() })
      // 必须经 store 的响应式数组取回 proxy 再改，直接改原始对象不触发视图更新
      this.messages.push({ id: nextId(), role: 'assistant', content: '', trace: [], artifacts: [], streaming: true, at: Date.now() })
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

      // Skills 目录摘要（失败时降级为空，不影响内置工具）
      try {
        const skills = await aiSkillsApi.list()
        const catalog = buildSkillsCatalogPrompt(
          skills.filter((s) => s.enabled).map((s) => ({ id: s.id, name: s.name, description: s.description })),
        )
        if (catalog) chatMessages.splice(1, 0, { role: 'system', content: catalog })
      } catch {
        /* skills 不可用时跳过 */
      }
      // 用户分析记忆：始终注入（失败降级）
      try {
        const memories = await aiMemoriesApi.list()
        const memPrompt = buildMemoriesPrompt(memories)
        if (memPrompt) chatMessages.splice(1, 0, { role: 'system', content: memPrompt })
      } catch {
        /* memories 不可用时跳过 */
      }
      const { tools, exec } = await this.buildToolsAndExec()

      const pushArtifact = (a?: Artifact) => {
        if (a && !assistant.artifacts.some((x) => x.name === a.name && x.kind === a.kind)) assistant.artifacts.push(a)
      }

      const baseLen = chatMessages.length
      try {
        const finalMessages = await runAgent({
          messages: chatMessages,
          tools,
          exec,
          maxIterations: this.config?.maxIterations ?? 100,
          model: this.modelOverride ?? undefined,
          signal: this.abort.signal,
          askUser: this.makeAskUser(this.abort.signal),
          waitConfirm: this.makeWaitConfirm(this.abort.signal),
          onEvent: makeOnEvent(assistant, pushArtifact),
        })
        assistant.rawTail = finalMessages.slice(baseLen)
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

    /** 构建工具集与执行器（内置 + MCP）。 */
    async buildToolsAndExec(): Promise<{ tools: ChatPayload['tools']; exec: ToolExecutor }> {
      let mcpBundle = buildMcpToolsBundle([])
      try {
        const mcpTools = await aiMcpApi.listTools()
        mcpBundle = buildMcpToolsBundle(mcpTools)
      } catch {
        /* mcp 不可用时跳过 */
      }
      const tools = [...OPENAI_TOOLS, ...mcpBundle.tools]

      const confirmDestructive = this.config?.confirmDestructive ?? true
      const confirmWrite = this.config?.confirmWrite ?? false
      const exec: ToolExecutor = async (call: ToolCall, args: Record<string, unknown>) => {
        const mcpRef = mcpBundle.resolve(call.function.name)
        if (mcpRef) {
          try {
            const res = await aiMcpApi.callTool({
              serverId: mcpRef.serverId,
              name: mcpRef.name,
              arguments: args,
            })
            const text = JSON.stringify(res.result ?? res)
            return { ok: true, summary: text.length > 1200 ? `${text.slice(0, 1200)}…` : text }
          } catch (e) {
            return { ok: false, summary: e instanceof Error ? e.message : String(e) }
          }
        }
        return execTool(call.function.name, args, { confirmDestructive, confirmWrite })
      }
      return { tools, exec }
    },

    /**
     * 确认 / 拒绝待确认的危险操作。
     * - 若 agent-loop 正挂起等待（waitConfirm）：结算 Promise，同一 loop 内继续（不中断会话）。
     * - 否则回退到 resumeLoop（兼容旧会话 / rawTail 重入）。
     */
    async decideTrace(traceId: string, decision: 'confirm' | 'reject'): Promise<void> {
      const assistant = [...this.messages]
        .reverse()
        .find((m) => m.role === 'assistant' && m.trace.some((t) => t.id === traceId))
      const item = assistant?.trace.find((t) => t.id === traceId)
      if (!assistant || !item || !item.needsConfirmation || item.confirmed || item.rejected) return
      // 正在跑其他任务且并非等待本条确认时，忽略
      if (this.running && pendingConfirmId !== traceId) return

      let resultText: string
      if (decision === 'confirm') {
        item.confirmed = true
        item.running = true
        const res = await execTool(item.name, { ...(item.args ?? {}), __confirmed: true }, { confirmDestructive: false, confirmWrite: false })
        item.running = false
        item.ok = res.ok
        item.summary = res.summary
        item.needsConfirmation = false
        if (res.artifact) pushArtifactSafe(assistant, res.artifact)
        resultText = `用户已批准并执行该操作，执行结果：${res.summary}`
      } else {
        item.rejected = true
        item.ok = false
        item.summary = '用户已拒绝执行该操作'
        item.needsConfirmation = false
        resultText = '用户已拒绝执行该操作。不要重试此操作；向用户简短说明并给出替代方案。'
      }
      await this.persist()

      // 优先：挂起中的 loop 直接续跑
      if (pendingConfirmResolve && pendingConfirmId === traceId) {
        const resolve = pendingConfirmResolve
        pendingConfirmResolve = null
        pendingConfirmId = null
        resolve(resultText)
        return
      }

      // 回退：loop 已结束时用 rawTail 重入
      await this.resumeLoop(assistant, traceId, resultText)
    },

    /** 把确认/拒绝结果写回对应 tool 消息、截掉过时的收尾 assistant 消息，重入 runAgent 继续生成。 */
    async resumeLoop(assistant: UiMessage, traceId: string, resultText: string): Promise<void> {
      const tail = assistant.rawTail
      const toolIdx = tail ? tail.findIndex((m) => m.role === 'tool' && m.tool_call_id === traceId) : -1
      if (!tail || toolIdx < 0) return
      const continued = tail
        .slice(0, toolIdx + 1)
        .map((m) => (m.tool_call_id === traceId ? { ...m, content: resultText } : { ...m }))
      assistant.rawTail = continued
      const messages = [...this.buildBase(assistant), ...continued]

      this.running = true
      this.abort = new AbortController()
      assistant.streaming = true
      const { tools, exec } = await this.buildToolsAndExec()
      const baseLen = messages.length
      try {
        const finalMessages = await runAgent({
          messages,
          tools,
          exec,
          maxIterations: this.config?.maxIterations ?? 100,
          model: this.modelOverride ?? undefined,
          signal: this.abort.signal,
          askUser: this.makeAskUser(this.abort.signal),
          waitConfirm: this.makeWaitConfirm(this.abort.signal),
          onEvent: makeOnEvent(assistant, (a) => pushArtifactSafe(assistant, a)),
        })
        assistant.rawTail = finalMessages.slice(baseLen)
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

    /** 续轮时模型可见上下文：system + 分析上下文 + 该 assistant 消息之前的历史。 */
    buildBase(assistant: UiMessage): ChatMessage[] {
      const analysis = useAnalysisStore().current
      const idx = this.messages.indexOf(assistant)
      const prior = idx >= 0 ? this.messages.slice(0, idx) : this.messages
      return [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'system', content: buildAnalysisContext(analysis) },
        ...prior.map((m) => ({ role: m.role, content: m.content }) as ChatMessage),
      ]
    },

    /** 结算挂起的 ask_user 等待（作答/取消/中止/切换会话共用）。 */
    settleAsk(answer: string): void {
      pendingAskResolve?.(answer)
    },

    /** ask_user 作答通道：挂起 agent-loop 直到用户作答；中止/切会话时兜底结算。 */
    makeAskUser(signal?: AbortSignal): (req: AskRequest) => Promise<string> {
      return (req) =>
        new Promise<string>((resolve) => {
          this.pendingAsk = { id: req.id, question: req.question, options: req.options, allowOther: req.allowOther }
          pendingAskResolve = (answer) => {
            pendingAskResolve = null
            this.pendingAsk = null
            resolve(answer)
          }
          signal?.addEventListener('abort', () => pendingAskResolve?.('（用户中止了本次生成）'), { once: true })
        })
    },

    /** ask_user 提问卡作答；answer 为空表示用户取消。 */
    answerAsk(id: string, answer: string | null): void {
      if (!this.pendingAsk || this.pendingAsk.id !== id) return
      this.settleAsk(answer?.trim() ? answer.trim() : '（用户取消了本次提问）')
    },

    /** 危险操作确认通道：挂起 agent-loop 直到用户批准/拒绝（保持 running，会话不中断）。 */
    makeWaitConfirm(signal?: AbortSignal): (req: { id: string; name: string; summary: string }) => Promise<string> {
      return (req) =>
        new Promise<string>((resolve) => {
          pendingConfirmId = req.id
          pendingConfirmResolve = (resultText) => {
            pendingConfirmResolve = null
            pendingConfirmId = null
            resolve(resultText)
          }
          signal?.addEventListener(
            'abort',
            () => {
              if (pendingConfirmId === req.id) {
                pendingConfirmResolve?.('用户中止了本次生成，危险操作未执行。')
              }
            },
            { once: true },
          )
        })
    },

    settleConfirm(resultText: string): void {
      pendingConfirmResolve?.(resultText)
    },

    /** 压缩上下文：最近 2 个用户轮保留，更早历史折叠为一条摘要消息（随会话持久化）。 */
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

    stop() {
      this.abort?.abort()
      this.settleAsk('（用户中止了本次生成）')
      this.settleConfirm('用户中止了本次生成，危险操作未执行。')
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

    /** Header 切换模拟用户：中止进行中对话，清空当前会话并重载列表。 */
    async onUserSwitch(): Promise<void> {
      this.stop()
      this.currentId = null
      this.messages = []
      this.conversations = []
      await this.refreshConversations()
    },
  },
})

/** agent-loop 事件聚合到 assistant 消息（send 与确认续轮共用）。 */
function makeOnEvent(assistant: UiMessage, pushArtifact: (a?: Artifact) => void): (e: AgentEvent) => void {
  return (e) => {
    if (e.type === 'token') {
      assistant.content += e.text
    } else if (e.type === 'reasoning') {
      assistant.reasoning = (assistant.reasoning ?? '') + e.text
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
    } else     if (e.type === 'tool_result') {
      // 同 id 重复（模型偶发复用 call id）时优先匹配仍在 running 的那条；
      // 确认通道会二次发 tool_result（先 needsConfirmation，再最终结果）。
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
        if (e.needsConfirmation === false && item.confirmed) {
          /* 保持 confirmed */
        }
      }
      pushArtifact(e.artifact)
    } else if (e.type === 'ask') {
      const item = assistant.trace.find((t) => t.id === e.id)
      if (item) item.ask = { question: e.question, options: e.options, allowOther: e.allowOther }
    } else if (e.type === 'plan') {
      assistant.planSteps = e.steps
      assistant.planDone = []
    } else if (e.type === 'step_done') {
      if (assistant.planDone && !assistant.planDone.includes(e.index)) assistant.planDone.push(e.index)
    } else if (e.type === 'done') {
      assistant.content = e.content || assistant.content
    }
  }
}

function pushArtifactSafe(msg: UiMessage, a?: Artifact): void {
  if (a && !msg.artifacts.some((x) => x.name === a.name && x.kind === a.kind)) msg.artifacts.push(a)
}
