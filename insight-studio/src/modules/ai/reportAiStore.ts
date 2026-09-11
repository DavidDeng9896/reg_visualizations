/**
 * Report 步骤的 AI 场景（reportAiStore）：
 * 复用主会话的 agent-loop 内核（runAgent：多轮工具、续跑、防截断），
 * 工具白名单：list_skills / read_skill / update_report_step（锁定当前 stepId）
 *   + 可选 list_tables / get_table_schema；
 * 禁止 create_report_step 及其它分析/画图/代码工具；
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
import { pickStepConversation } from './conversationScope'
import { buildSkillsCatalogPrompt, buildMemoriesPrompt } from './prompts'
import { clearTransientProgress, applyUserAbortToMessages } from './userAbort'
import { continueTaskSystemMessage, planIncomplete } from './taskState'
import { AUTO_COMPRESS_AT, estimateChatTokens, summarizeTurns } from './tokens'
import { useAnalysisStore } from '../../stores/analysisStore'
import { execTool, type ToolCtx } from './tools/impl'
import { readReportConfig } from '../steps/report/reportModel'
import { formatSkillIdForTemplate } from '../steps/report/reportQuality'

let uid = 0
const nextId = () => `rpt-${Date.now()}-${++uid}`

/** 节点报告 AI 工具白名单（物理排除 create_report_step 等）。 */
export const REPORT_AI_ALLOWED_TOOLS = [
  'update_report_step',
  'list_skills',
  'read_skill',
  'list_tables',
  'get_table_schema',
] as const

export type ReportAiAllowedTool = (typeof REPORT_AI_ALLOWED_TOOLS)[number]

const REPORT_TOOL_CTX: ToolCtx = { confirmDestructive: true, confirmWrite: false }

const REPORT_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'update_report_step',
      description:
        '更新当前报告节点的内容（report JSON）或名称。stepId 由运行时锁定为当前节点。draft 可多轮更新；done=true 时须通过质量门。写/改前应已 read_skill(report-format-common) 与对应 template skill。',
      parameters: {
        type: 'object',
        properties: {
          stepId: { type: 'string', description: '报告步骤 id（将被锁定为当前节点）' },
          name: { type: 'string', description: '新名称（可选）' },
          report: { type: 'object', description: '完整 AnalysisReport JSON' },
          done: {
            type: 'boolean',
            description: '是否宣称完成。true 时必须通过内容质量门；默认 false（允许 draft）。',
          },
        },
        required: ['stepId'],
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
      description:
        '读取某个 Skill 的完整 SKILL.md 说明书正文。写报告前必须先读 report-format-common，再读 report-format-<templateId>。',
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
      name: 'list_tables',
      description: '列出当前分析中的所有表（id、名称、行数）。只读。',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_table_schema',
      description: '获取表的列信息与样例行，用于绑定真实 tableId/字段。只读。',
      parameters: {
        type: 'object',
        properties: { tableId: { type: 'string', description: '表 id（可省略则回退当前/唯一表）' } },
      },
    },
  },
]

/**
 * 供单测与 store 共用的白名单执行器：
 * - 拒绝 create_report_step 及任何非白名单工具
 * - update_report_step 强制 stepId = lockedStepId
 */
export function createReportAiToolExecutor(lockedStepId: string): ToolExecutor {
  const allowed = new Set<string>(REPORT_AI_ALLOWED_TOOLS)
  return async (call: ToolCall, args: Record<string, unknown>) => {
    const name = call.function.name
    if (name === 'create_report_step') {
      return {
        ok: false,
        summary:
          'FORBIDDEN: reportAiStore 不允许 create_report_step（禁止新建报告节点）。请用 update_report_step 更新当前节点。',
      }
    }
    if (!allowed.has(name)) {
      return {
        ok: false,
        summary: `FORBIDDEN: reportAiStore 工具白名单未包含「${name}」。可用：${REPORT_AI_ALLOWED_TOOLS.join(', ')}。`,
      }
    }
    try {
      if (name === 'list_skills') {
        const list = await aiSkillsApi.list()
        if (!list.length) return { ok: true, summary: '暂无已安装 Skill' }
        const lines = list.map(
          (s) => `- ${s.name}（id: ${s.id}，${s.enabled ? '启用' : '停用'}）：${s.description || '无描述'}`,
        )
        return { ok: true, summary: `已安装 ${list.length} 个 Skill：\n${lines.join('\n')}` }
      }
      if (name === 'read_skill') {
        const id = String(args.skillId ?? '').trim()
        if (!id) return { ok: false, summary: '缺少 skillId' }
        const d = await aiSkillsApi.get(id)
        return { ok: true, summary: `# ${d.name} (${d.id})\n\n${d.body}` }
      }
      if (name === 'update_report_step') {
        return await execTool('update_report_step', { ...args, stepId: lockedStepId }, REPORT_TOOL_CTX)
      }
      return await execTool(name, args, REPORT_TOOL_CTX)
    } catch (e) {
      return { ok: false, summary: `工具执行失败：${e instanceof Error ? e.message : String(e)}` }
    }
  }
}


interface ReportAiState {
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

export const useReportAiStore = defineStore('reportAi', {
  state: (): ReportAiState => ({
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
      const analysisId = useAnalysisStore().current?.id ?? null
      if (this.stepId === stepId && this.analysisId === analysisId && !this.loading) return
      this.stop()
      this.stepId = stepId
      this.analysisId = analysisId
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
        const mine = pickStepConversation(list, stepId)
        if (mine) {
          const doc = await aiConvApi.get(mine.id)
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

    /** 场景 system 提示：契约 + 白名单 + 当前报告（每轮重建）。 */
    buildSystemPrompt(): string {
      const step = useAnalysisStore().current?.steps.find((s) => s.id === this.stepId)
      const report = step ? readReportConfig(step.config as Record<string, unknown>) : null
      const templateId = String(report?.templateId || report?.theme || 'research')
      const formatSkill = formatSkillIdForTemplate(templateId)
      const json = report ? JSON.stringify(report, null, 2) : '（空）'
      return `你是分析报告撰写助手，运行在带工具的 agent 循环中。只改写**当前报告节点**，禁止新建流程图节点。

## 硬约束
- 唯一写入工具：update_report_step（运行时已锁定 stepId=${this.stepId}）
- **禁止** create_report_step、删表、建图流水线、run_python_code、delegate_*
- 状态机：empty → draft → done；draft 可多轮 update；宣称完成时必须 done=true 且通过质量门
- 写/改正文前必须：read_skill("report-format-common")，再 read_skill("${formatSkill}")
- 禁止未读 format skill 凭记忆编造结构；禁止占位套话；图/表须真实 id + caption + 紧跟解读

## 当前节点
- stepId: ${this.stepId}
- templateId/theme: ${templateId}
- 标题: ${report?.title || step?.name || '（空）'}
- 章节数: ${report?.sections?.length ?? 0}

## 当前报告 JSON
${json}

## 工作方式
1. 先 list_skills / read_skill 加载格式 skill（common + 模板）
2. 需要绑图/表时用 list_tables、get_table_schema 核对真实 id
3. 用 update_report_step 写入 draft；可多轮打磨
4. 自检通过后再 update_report_step({ done: true, report })`
    },

    async buildToolsAndExec(): Promise<{ tools: typeof REPORT_TOOLS; exec: ToolExecutor }> {
      const stepId = this.stepId ?? ''
      return { tools: REPORT_TOOLS, exec: createReportAiToolExecutor(stepId) }
    },

    /** 组装本轮模型消息：场景 system + skill/记忆注入 + 历史。 */
    async buildChatMessages(
      assistantId: string,
      opts: { tail?: ChatMessage[]; resumeHint?: string } = {},
    ): Promise<ChatMessage[]> {
      const messages: ChatMessage[] = [{ role: 'system', content: this.buildSystemPrompt() }]
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
        title: 'Report AI',
      })
      this.conversationId = doc.id
    },

    async send(text: string): Promise<void> {
      const input = text.trim()
      if (!input || this.running) return
      this.error = ''
      clearTransientProgress(this.messages)
      await this.ensureConversation()
      if (estimateChatTokens(this.messages.map((m) => ({ role: m.role, content: m.content }))) > AUTO_COMPRESS_AT) {
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
      const chatMessages = await this.buildChatMessages(assistant.id)
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
    async continueTask(): Promise<void> {
      if (this.running) return
      const prev = this.resumableAssistant as UiMessage | null
      if (!prev) return
      await this.ensureConversation()

      const resumeHint = prev.planSteps?.length
        ? continueTaskSystemMessage(prev.planSteps, prev.planDone ?? [])
        : '【续跑检查点】上次因模型/网络错误中断。请从断点继续，复用已有工具结果，禁止重复已完成操作；继续用 update_report_step 打磨当前报告。'

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
