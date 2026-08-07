import { defineStore } from 'pinia'
import { runAgent, MaxIterError, AgentRunError, type AgentEvent, type AskRequest, type ToolExecutor } from './agentLoop'
import {
  aiConfigApi,
  aiConvApi,
  aiFilesApi,
  aiMcpApi,
  aiMemoriesApi,
  aiSkillsApi,
  sanitizeModelError,
  type AiFileMeta,
  type AiPublicConfig,
  type ContentPart,
  type ConversationMeta,
} from './client'
import type { ChatMessage, ChatPayload, ToolCall } from './client'
import { OPENAI_TOOLS } from './tools/registry'
import { execTool } from './tools/impl'
import { buildAnalysisContext, buildMentionContext, type MentionTarget } from './context'
import {
  blobToDataUrl,
  buildAttachmentContext,
  importAttachmentAsTables,
  serializeAttachment,
  type ChatAttachment,
  type ChatAttachmentSnapshot,
} from './attachments'
import { SYSTEM_PROMPT, buildSkillsCatalogPrompt, buildMemoriesPrompt } from './prompts'
import { buildMcpToolsBundle } from './mcpTools'
import { AUTO_COMPRESS_AT, estimateChatTokens, estimateTokens, summarizeTurns } from './tokens'
import { continueTaskSystemMessage, planIncomplete } from './taskState'
import { applyUserAbortToMessages, clearTransientProgress } from './userAbort'
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
  /** ask_user 提问内容（交互卡片渲染用；结算后清空，结果写入正文）。 */
  ask?: { question: string; options: string[]; allowOther: boolean }
  /** 已结算的 ask，不再渲染卡片。 */
  askSettled?: boolean
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
  /** 计划门禁耗尽或超轮时仍有未完成步骤。 */
  incomplete?: boolean
  /** 用户主动关闭「继续任务」，不再提示续跑。 */
  planDismissed?: boolean
  /** 问答/批准等交互备注（普通文本）；done 时并入 content。 */
  interactionNotes?: string
  /** 本轮 runAgent 追加的模型可见消息尾（assistant/tool 交替），确认/拒绝后重入循环续轮用。 */
  rawTail?: ChatMessage[]
  /** 用户本轮附件快照（持久化）。 */
  attachments?: ChatAttachmentSnapshot[]
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
  /** 当前用户最近上传的附件列表（@ 引用用）。 */
  sessionFiles: AiFileMeta[]
  /** 输入条勾选：本轮任务完成后生成分析报告节点。 */
  wantReport: boolean
}

let uid = 0
const nextId = () => `m-${Date.now()}-${++uid}`
/** ask_user 挂起 Promise 的结算函数（作答/取消/中止/切会话共用）。 */
let pendingAskResolve: ((answer: string) => void) | null = null
/** 危险操作确认挂起：与 ask_user 同构，保持 agent-loop 存活直到用户决定。 */
let pendingConfirmResolve: ((resultText: string) => void) | null = null
let pendingConfirmId: string | null = null
/** 同会话连续自动续跑次数（用户新发送时清零）。 */
let autoContinueCount = 0
const MAX_AUTO_CONTINUE = 2
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
    sessionFiles: [],
    wantReport: false,
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
    /** 最近一条仍可续跑的助手消息（已关闭的检查点忽略）。含计划未完成，或模型错误且有进度。 */
    resumableAssistant: (s): UiMessage | null => {
      for (let i = s.messages.length - 1; i >= 0; i -= 1) {
        const m = s.messages[i]
        if (m.role !== 'assistant' || m.planDismissed) continue
        if (m.planSteps?.length && (m.incomplete || planIncomplete(m.planSteps, m.planDone))) return m
        // 模型错误中断：有工具轨迹或 rawTail 时允许从断点续跑
        if (m.error && (m.rawTail?.length || m.trace.length || m.planSteps?.length)) return m
      }
      return null
    },
    canContinueTask(): boolean {
      return !this.running && !!this.resumableAssistant
    },
    /**
     * 对话输入条权限模式：
     * - ask = 请求权限（写入/删除均需确认）
     * - allow = 全部允许（无需确认）
     * 历史混合配置（仅删需确认）归入 ask。
     */
    permissionMode: (s): 'ask' | 'allow' => {
      const write = s.config?.confirmWrite ?? false
      const destructive = s.config?.confirmDestructive ?? true
      return !write && !destructive ? 'allow' : 'ask'
    },
  },

  actions: {
    setModel(m: string | null) {
      this.modelOverride = m
      if (typeof localStorage !== 'undefined') {
        if (m) localStorage.setItem(MODEL_KEY, m)
        else localStorage.removeItem(MODEL_KEY)
      }
    },

    /** 在对话框内切换权限模式并持久化到 AI 配置。 */
    async setPermissionMode(mode: 'ask' | 'allow'): Promise<void> {
      const confirmWrite = mode === 'ask'
      const confirmDestructive = mode === 'ask'
      try {
        await aiConfigApi.put({ confirmWrite, confirmDestructive })
        if (this.config) {
          this.config = { ...this.config, confirmWrite, confirmDestructive }
        } else {
          await this.init()
        }
      } catch (e) {
        throw e instanceof Error ? e : new Error(String(e))
      }
    },

    async init() {
      try {
        this.config = await aiConfigApi.get()
      } catch {
        this.config = null
      }
      await this.refreshConversations()
      void this.refreshSessionFiles()
    },

    /** 打开抽屉时尽量复用已加载配置，避免重复请求拖慢二次打开。 */
    async warmInit() {
      if (this.config) {
        void this.refreshConversations()
        void this.refreshSessionFiles()
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

    async refreshSessionFiles() {
      try {
        this.sessionFiles = await aiFilesApi.list()
      } catch {
        this.sessionFiles = []
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
        // 回看时清理瞬态：历史回答绝不能带着 streaming/running 转圈
        for (const m of this.messages) {
          if (!Array.isArray(m.trace)) m.trace = []
          if (!Array.isArray(m.artifacts)) m.artifacts = []
        }
        clearTransientProgress(this.messages)
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

    /** 发送用户消息并跑 agent-loop。允许纯附件（无文字）。 */
    async send(text: string, mentions: MentionTarget[] = [], attachments: ChatAttachment[] = []): Promise<void> {
      const input = text.trim()
      const atts = attachments.slice()
      if ((!input && !atts.length) || this.running) return
      autoContinueCount = 0
      // 新一轮前先清掉历史消息上残留的 streaming/running，避免旧进展继续转圈
      clearTransientProgress(this.messages)
      await this.ensureConversation()
      // 上下文超过阈值（上限 80%）先自动压缩：最近 2 个用户轮保留，更早历史折叠为摘要
      if (this.contextTokens > AUTO_COMPRESS_AT) await this.compressContext()

      const userContent =
        input || (atts.length ? `（附件：${atts.map((a) => a.name).join('、')}）` : '')
      this.messages.push({
        id: nextId(),
        role: 'user',
        content: userContent,
        trace: [],
        artifacts: [],
        at: Date.now(),
        ...(atts.length ? { attachments: atts.map(serializeAttachment) } : {}),
      })
      // 必须经 store 的响应式数组取回 proxy 再改，直接改原始对象不触发视图更新
      this.messages.push({ id: nextId(), role: 'assistant', content: '', trace: [], artifacts: [], streaming: true, at: Date.now() })
      const assistant = this.messages[this.messages.length - 1] as UiMessage

      this.running = true
      this.abort = new AbortController()
      const ac = this.abort

      // 导入为分析表（失败写入助手错误，仍尽量继续）
      try {
        for (const att of atts) {
          if (att.importAsTable) await importAttachmentAsTables(att)
        }
      } catch (e) {
        assistant.error = e instanceof Error ? e.message : String(e)
        assistant.streaming = false
        this.running = false
        this.abort = null
        await this.persist()
        return
      }

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

      if (this.wantReport) {
        chatMessages.splice(chatMessages.length - 1, 0, {
          role: 'system',
          content:
            '【用户已勾选「完成后生成报告」】在分析相关步骤落地后，必须调用 create_report_step（或更新已有报告）生成科研风格 HTML 分析报告节点；报告须含摘要、关键图表引用（tableId/viewId）、结论。不要只在正文里贴长文代替报告节点。',
        })
      }

      try {
        const attachCtx = await buildAttachmentContext(atts)
        if (attachCtx) chatMessages.splice(chatMessages.length - 1, 0, { role: 'system', content: attachCtx })
      } catch {
        /* 附件上下文失败时跳过 */
      }

      // 图片走 vision：替换最后一条 user 消息为 multimodal
      const imageAtts = atts.filter((a) => a.kind === 'image' && a.forAi)
      if (imageAtts.length) {
        const parts: ContentPart[] = [
          { type: 'text', text: input || '请结合附图进行分析。' },
        ]
        for (const img of imageAtts) {
          try {
            const blob = await aiFilesApi.downloadBlob(img.id)
            const url = await blobToDataUrl(blob)
            parts.push({ type: 'image_url', image_url: { url } })
          } catch {
            /* 单张失败跳过 */
          }
        }
        for (let i = chatMessages.length - 1; i >= 0; i -= 1) {
          if (chatMessages[i].role === 'user') {
            chatMessages[i] = { role: 'user', content: parts }
            break
          }
        }
      }

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
      let aborted = false
      try {
        const finalMessages = await runAgent({
          messages: chatMessages,
          tools,
          exec,
          maxIterations: this.config?.maxIterations ?? 100,
          model: this.modelOverride ?? undefined,
          signal: ac.signal,
          askUser: this.makeAskUser(ac.signal),
          waitConfirm: this.makeWaitConfirm(ac.signal),
          onEvent: makeOnEvent(assistant, pushArtifact),
        })
        assistant.rawTail = finalMessages.slice(baseLen)
      } catch (err) {
        if (err instanceof MaxIterError) {
          assistant.maxIter = true
          assistant.error = err.message
          markErrorResumable(assistant)
        } else if (err instanceof DOMException && err.name === 'AbortError') {
          aborted = true
          assistant.error = '已中止'
          applyUserAbortToMessages(this.messages)
        } else if (err instanceof AgentRunError) {
          assistant.error = sanitizeModelError(err.message)
          assistant.rawTail = err.partialMessages.slice(baseLen)
          markErrorResumable(assistant)
        } else {
          assistant.error = sanitizeModelError(err instanceof Error ? err.message : String(err))
          markErrorResumable(assistant)
        }
      } finally {
        assistant.streaming = false
        // stop() 可能已提前清 running；仅本轮 ac 仍挂着时再清，避免误伤新一轮
        if (this.abort === ac) {
          this.running = false
          this.abort = null
        }
        await this.persist()
      }
      // 模型错误不自动续跑，交给用户点「继续任务」
      if (!aborted && !assistant.error) await this.maybeAutoContinue(assistant)
    },

    /**
     * 从检查点续跑：计划未完成，或模型错误中断（有 rawTail/trace）。
     * 不新增用户气泡；带上 rawTail 工具历史，避免重做已完成步骤。
     */
    async continueTask(opts?: { auto?: boolean }): Promise<void> {
      if (this.running) return
      const prev = this.resumableAssistant as UiMessage | null
      if (!prev || prev.planDismissed) return
      if (!opts?.auto) autoContinueCount = 0
      clearTransientProgress(this.messages)
      await this.ensureConversation()
      if (this.contextTokens > AUTO_COMPRESS_AT) await this.compressContext()

      const doneSnapshot = [...(prev.planDone ?? [])]
      const planSteps = prev.planSteps?.length ? [...prev.planSteps] : undefined
      // 清除旧错误态，准备新一轮续跑
      prev.error = undefined
      prev.incomplete = planSteps ? planIncomplete(planSteps, doneSnapshot) : true

      this.messages.push({
        id: nextId(),
        role: 'assistant',
        content: '',
        trace: [],
        artifacts: [],
        streaming: true,
        at: Date.now(),
        ...(planSteps ? { planSteps, planDone: [...doneSnapshot] } : {}),
      })
      const assistant = this.messages[this.messages.length - 1] as UiMessage

      this.running = true
      this.abort = new AbortController()
      const ac = this.abort

      const resumeHint = planSteps?.length
        ? continueTaskSystemMessage(planSteps, doneSnapshot)
        : '【续跑检查点】上次因模型/网络错误中断。请从断点继续，复用已有工具结果，禁止重复已完成操作；直接 tool_calls，全部完成后简短总结。'

      // 系统提示 + 检查点之前历史 + 上一轮工具轨迹 + 续跑指令
      const chatMessages: ChatMessage[] = [
        ...this.buildBase(prev),
        ...(prev.rawTail?.length
          ? prev.rawTail
          : prev.content
            ? [{ role: 'assistant' as const, content: prev.content }]
            : []),
        { role: 'system', content: resumeHint },
      ]

      try {
        const skills = await aiSkillsApi.list()
        const catalog = buildSkillsCatalogPrompt(
          skills.filter((s) => s.enabled).map((s) => ({ id: s.id, name: s.name, description: s.description })),
        )
        if (catalog) chatMessages.splice(1, 0, { role: 'system', content: catalog })
      } catch {
        /* skip */
      }
      try {
        const memories = await aiMemoriesApi.list()
        const memPrompt = buildMemoriesPrompt(memories)
        if (memPrompt) chatMessages.splice(1, 0, { role: 'system', content: memPrompt })
      } catch {
        /* skip */
      }

      const { tools, exec } = await this.buildToolsAndExec()
      const pushArtifact = (a?: Artifact) => {
        if (a && !assistant.artifacts.some((x) => x.name === a.name && x.kind === a.kind)) assistant.artifacts.push(a)
      }
      const baseLen = chatMessages.length
      let aborted = false
      try {
        const finalMessages = await runAgent({
          messages: chatMessages,
          tools,
          exec,
          maxIterations: this.config?.maxIterations ?? 100,
          model: this.modelOverride ?? undefined,
          signal: ac.signal,
          askUser: this.makeAskUser(ac.signal),
          waitConfirm: this.makeWaitConfirm(ac.signal),
          ...(planSteps ? { initialPlan: { steps: planSteps, done: doneSnapshot } } : {}),
          onEvent: makeOnEvent(assistant, pushArtifact),
        })
        assistant.rawTail = finalMessages.slice(baseLen)
        // 把进度合并回检查点，避免旧消息仍显示「可继续」导致死循环
        if (planSteps) syncPlanCheckpoint(prev, assistant)
        else {
          prev.incomplete = false
          prev.error = undefined
          assistant.incomplete = false
        }
      } catch (err) {
        if (err instanceof MaxIterError) {
          assistant.maxIter = true
          assistant.error = err.message
          markErrorResumable(assistant)
        } else if (err instanceof DOMException && err.name === 'AbortError') {
          aborted = true
          assistant.error = '已中止'
          applyUserAbortToMessages(this.messages)
        } else if (err instanceof AgentRunError) {
          assistant.error = sanitizeModelError(err.message)
          assistant.rawTail = err.partialMessages.slice(baseLen)
          markErrorResumable(assistant)
        } else {
          assistant.error = sanitizeModelError(err instanceof Error ? err.message : String(err))
          markErrorResumable(assistant)
        }
        // 用户中止后不再同步 incomplete，避免「继续任务」回弹
        if (!aborted && planSteps) syncPlanCheckpoint(prev, assistant)
        if (!aborted) {
          // 检查点也标记可续跑，输入条能找到 resumableAssistant
          markErrorResumable(prev)
          if (assistant.rawTail?.length) prev.rawTail = [...(prev.rawTail ?? []), ...assistant.rawTail]
        }
      } finally {
        assistant.streaming = false
        if (this.abort === ac) {
          this.running = false
          this.abort = null
        }
        await this.persist()
      }
      if (!aborted && !assistant.error) await this.maybeAutoContinue(assistant)
    },

    /** 用户关闭「继续任务」卡片，不再自动/手动提示续跑。 */
    dismissContinueTask(): void {
      const m = this.resumableAssistant as UiMessage | null
      if (!m) return
      m.planDismissed = true
      m.incomplete = false
      void this.persist()
    },

    /** 本轮结束后若仍 incomplete，自动续跑（同会话连续 ≤ MAX_AUTO_CONTINUE）。模型错误不自动续。 */
    async maybeAutoContinue(assistant: UiMessage): Promise<void> {
      if (assistant.error) return
      if (assistant.planDismissed) return
      if (!assistant.incomplete && !planIncomplete(assistant.planSteps, assistant.planDone)) return
      if (autoContinueCount >= MAX_AUTO_CONTINUE) return
      if (this.running) return
      autoContinueCount += 1
      await this.continueTask({ auto: true })
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
            return { ok: true, summary: text }
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
        appendPlainNote(assistant, `已批准并执行「${item.name}」：${res.summary}`)
      } else {
        item.rejected = true
        item.ok = false
        item.summary = '用户已拒绝执行该操作'
        item.needsConfirmation = false
        resultText = '用户已拒绝执行该操作。不要重试此操作；向用户简短说明并给出替代方案。'
        appendPlainNote(assistant, `已拒绝操作「${item.name}」`)
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
      const ac = this.abort
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
          signal: ac.signal,
          askUser: this.makeAskUser(ac.signal),
          waitConfirm: this.makeWaitConfirm(ac.signal),
          onEvent: makeOnEvent(assistant, (a) => pushArtifactSafe(assistant, a)),
        })
        assistant.rawTail = finalMessages.slice(baseLen)
      } catch (err) {
        if (err instanceof MaxIterError) {
          assistant.maxIter = true
          assistant.error = err.message
          markErrorResumable(assistant)
        } else if (err instanceof DOMException && err.name === 'AbortError') {
          assistant.error = '已中止'
          applyUserAbortToMessages(this.messages)
        } else if (err instanceof AgentRunError) {
          assistant.error = sanitizeModelError(err.message)
          assistant.rawTail = err.partialMessages.slice(baseLen)
          markErrorResumable(assistant)
        } else {
          assistant.error = sanitizeModelError(err instanceof Error ? err.message : String(err))
          markErrorResumable(assistant)
        }
      } finally {
        assistant.streaming = false
        if (this.abort === ac) {
          this.running = false
          this.abort = null
        }
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

    /** ask_user 提问卡作答；answer 为空表示用户取消。结果写入正文，不再保留特殊卡片。 */
    answerAsk(id: string, answer: string | null): void {
      if (!this.pendingAsk || this.pendingAsk.id !== id) return
      const assistant = [...this.messages]
        .reverse()
        .find((m) => m.role === 'assistant' && m.trace.some((t) => t.id === id))
      const item = assistant?.trace.find((t) => t.id === id)
      const question = item?.ask?.question ?? this.pendingAsk.question
      const trimmed = answer?.trim()
      if (assistant && item) {
        item.askSettled = true
        item.ask = undefined
        if (trimmed) {
          appendPlainNote(assistant, `问：${question}\n答：${trimmed}`)
        } else {
          appendPlainNote(assistant, `（已取消提问：${question}）`)
        }
      }
      this.settleAsk(trimmed ? trimmed : '（用户取消了本次提问）')
      void this.persist()
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

    /** 用户主动结束：中止 loop/子代理，立刻停掉进行中 UI，关闭「继续任务」提示。 */
    stop() {
      const ac = this.abort
      ac?.abort()
      this.settleAsk('（用户中止了本次生成）')
      this.settleConfirm('用户中止了本次生成，危险操作未执行。')
      this.pendingAsk = null
      autoContinueCount = 0
      applyUserAbortToMessages(this.messages)
      // 立刻结束全局「正在生成」态（光影/转圈/停止按钮），不等 finally
      this.running = false
      if (this.abort === ac) this.abort = null
      void this.persist()
    },

    async retry(): Promise<void> {
      const lastUser = [...this.messages].reverse().find((m) => m.role === 'user')
      const lastAssistant = this.messages[this.messages.length - 1]
      if (!lastUser || this.running) return
      if (lastAssistant?.role === 'assistant') this.messages.pop()
      this.messages.pop() // 去掉原 user 消息，重发
      const atts: ChatAttachment[] = (lastUser.attachments ?? []).map((a) => ({
        id: a.id,
        name: a.name,
        mime: a.mime,
        sizeBytes: a.sizeBytes,
        kind: a.kind,
        forAi: a.forAi,
        importAsTable: a.importAsTable,
        selectedSheets: a.selectedSheets ? [...a.selectedSheets] : undefined,
      }))
      // 重试时避免重复导入表
      for (const a of atts) a.importAsTable = false
      await this.send(lastUser.content, [], atts)
    },

    async persist(): Promise<void> {
      if (!this.currentId) return
      const firstUser = this.messages.find((m) => m.role === 'user')
      const title = firstUser ? firstUser.content.slice(0, 24) : '新会话'
      // 落盘时去掉 streaming/running，避免历史回看仍转圈
      const messages = this.messages.map((m) => ({
        ...m,
        streaming: false,
        trace: (m.trace ?? []).map((t) => ({ ...t, running: false })),
      }))
      try {
        await aiConvApi.update(this.currentId, { title, messages: messages as unknown[] })
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
    if (e.type === 'round') {
      // 每轮重新累计可见正文；工具轮独白会在 tool_call 时清空，避免多轮复读堆进气泡
      assistant.content = ''
    } else if (e.type === 'token') {
      assistant.content += e.text
    } else if (e.type === 'reasoning') {
      assistant.reasoning = (assistant.reasoning ?? '') + e.text
    } else if (e.type === 'tool_call') {
      // 本轮若进入工具调用，过程独白不展示（进展看 TraceCard）
      assistant.content = ''
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
      assistant.incomplete = false
    } else if (e.type === 'step_done') {
      if (!assistant.planDone) assistant.planDone = []
      if (!assistant.planDone.includes(e.index)) assistant.planDone.push(e.index)
      if (assistant.planSteps && !planIncomplete(assistant.planSteps, assistant.planDone)) {
        assistant.incomplete = false
      }
    } else if (e.type === 'incomplete') {
      assistant.incomplete = true
    } else if (e.type === 'worker_progress') {
      const item =
        assistant.trace.find((t) => t.id === e.id && t.running) ??
        assistant.trace.find((t) => t.id === e.id)
      if (item) item.summary = e.summary
    } else if (e.type === 'done') {
      const body = (e.content || '').trim()
      const notes = (assistant.interactionNotes ?? '').trim()
      assistant.content = [notes, body].filter(Boolean).join('\n\n')
      assistant.interactionNotes = undefined
    }
  }
}

/** 续跑后把进度合并回检查点消息，避免旧 incomplete 一直可点。 */
function syncPlanCheckpoint(prev: UiMessage, assistant: UiMessage): void {
  const merged = new Set<number>([...(prev.planDone ?? []), ...(assistant.planDone ?? [])])
  prev.planDone = [...merged].sort((a, b) => a - b)
  if (assistant.planSteps?.length) prev.planSteps = [...assistant.planSteps]
  const still = planIncomplete(prev.planSteps, prev.planDone)
  prev.incomplete = still
  assistant.incomplete = still ? !!assistant.incomplete || still : false
  if (!still) {
    prev.incomplete = false
    assistant.incomplete = false
  }
}

/** 模型/超轮错误后标记可续跑（用户点「继续任务」，不自动续）。 */
function markErrorResumable(msg: UiMessage): void {
  msg.planDismissed = false
  msg.incomplete = true
}

/** 交互结果以普通对话文本落盘（非特殊卡片）；写入 notes，避免被 round 清空。 */
function appendPlainNote(msg: UiMessage, note: string): void {
  const n = note.trim()
  if (!n) return
  msg.interactionNotes = msg.interactionNotes?.trim() ? `${msg.interactionNotes.trim()}\n\n${n}` : n
}

function pushArtifactSafe(msg: UiMessage, a?: Artifact): void {
  if (a && !msg.artifacts.some((x) => x.name === a.name && x.kind === a.kind)) msg.artifacts.push(a)
}
