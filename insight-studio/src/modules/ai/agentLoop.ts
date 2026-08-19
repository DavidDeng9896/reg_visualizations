/**
 * Agent-loop（ReAct）：多轮 模型→工具→观察 循环，支持流式、中止、超轮、计划门禁。
 * 纯逻辑可测：postChat 注入。
 */
import {
  contentText,
  normalizeToolArguments,
  postChat,
  readSseStream,
  sanitizeChatMessages,
  type ChatMessage,
  type ChatPayload,
  type ToolCall,
} from './client'
import { clipToolResult, planIncomplete, planNudgeMessage, pendingPlanSteps } from './taskState'
import { coerceArrayToolArgs, coerceParsedToolArgs } from './toolArgs'
import { isNearDuplicate, isProcessMonologue, scrubVisibleContent } from './contentScrub'
import { isDelegateWorker, runDelegateWorker, workerOnlyExplored } from './tools/workers'

/** 让出到下一个宏任务，使 Vue 能绘制 tool_call 的进行中态后再执行工具。 */
export function yieldToUi(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0)
  })
}

/** 工具执行结果。 */
export interface ToolExecResult {
  ok: boolean
  /** 回灌给模型的 tool content。 */
  summary: string
  /** 产物引用（生成卡片用）。 */
  artifact?: import('./types').Artifact
  /** 需要用户确认后重放（危险操作）。 */
  needsConfirmation?: boolean
}

export type ToolExecutor = (call: ToolCall, args: Record<string, unknown>) => Promise<ToolExecResult>

/** ask_user 提问请求（交互卡片渲染 + 等待作答）。 */
export interface AskRequest {
  id: string
  question: string
  options: string[]
  allowOther: boolean
}

export type AgentEvent =
  | { type: 'token'; text: string }
  | { type: 'reasoning'; text: string }
  | { type: 'round'; n: number }
  | { type: 'tool_call'; call: ToolCall; running?: boolean }
  | { type: 'tool_result'; id: string; name: string; ok: boolean; summary: string; artifact?: import('./types').Artifact; needsConfirmation?: boolean }
  | { type: 'ask'; id: string; question: string; options: string[]; allowOther: boolean }
  | { type: 'plan'; steps: string[] }
  | { type: 'step_done'; index: number }
  | { type: 'incomplete'; reason: string; pendingSteps: Array<{ index: number; text: string }> }
  | { type: 'done'; content: string }
  | { type: 'error'; message: string }
  /** 子代理内部进展（用于 Trace 上显示「分析师进行中：xxx」）。 */
  | { type: 'worker_progress'; id: string; summary: string }

export class MaxIterError extends Error {
  constructor(public readonly iterations: number) {
    super(`已达到最大工具调用轮数（${iterations}）`)
    this.name = 'MaxIterError'
  }
}

/** 模型/网络等中途失败：携带已推进的 messages，供 UI 从检查点续跑。 */
export class AgentRunError extends Error {
  constructor(
    message: string,
    public readonly partialMessages: ChatMessage[],
  ) {
    super(message)
    this.name = 'AgentRunError'
  }
}

function safeParseArgs(raw: string, toolName?: string): Record<string, unknown> {
  const normalized = normalizeToolArguments(raw, toolName)
  try {
    const v = JSON.parse(normalized) as unknown
    if (Array.isArray(v)) return coerceArrayToolArgs(v, toolName)
    const obj = v && typeof v === 'object' ? (v as Record<string, unknown>) : {}
    return toolName ? coerceParsedToolArgs(toolName, obj) : obj
  } catch {
    return {}
  }
}

/** 从 submit_plan 参数中尽量抽出步骤列表（兼容 steps/plan/tasks、字符串、裸数组）。 */
export function extractPlanSteps(args: Record<string, unknown>): string[] {
  const asList = (v: unknown): string[] => {
    if (Array.isArray(v)) {
      return v
        .map((s) => {
          if (typeof s === 'string') return s.trim()
          if (s && typeof s === 'object' && 'text' in (s as object)) return String((s as { text: unknown }).text).trim()
          if (s && typeof s === 'object' && 'title' in (s as object)) return String((s as { title: unknown }).title).trim()
          return String(s ?? '').trim()
        })
        .filter(Boolean)
    }
    if (typeof v === 'string') {
      const t = v.trim()
      if (!t) return []
      try {
        const parsed = JSON.parse(t) as unknown
        if (Array.isArray(parsed)) return asList(parsed)
      } catch {
        /* 按行拆分：1. xxx / - xxx */
      }
      return t
        .split(/\n+/)
        .map((line) => line.replace(/^\s*(?:\d+[\.\)、]|[-*•])\s*/, '').trim())
        .filter(Boolean)
    }
    return []
  }

  for (const key of ['steps', 'plan', 'tasks', 'items']) {
    const got = asList(args[key])
    if (got.length) return got
  }
  return []
}

const DEFAULT_MAX_PLAN_NUDGES = 3

export interface RunAgentOptions {
  messages: ChatMessage[]
  tools: ChatPayload['tools']
  exec: ToolExecutor
  maxIterations: number
  /** 模型覆盖（输入条切换模型）；缺省由后端用配置的 model。 */
  model?: string
  signal?: AbortSignal
  onEvent: (e: AgentEvent) => void
  /** ask_user 作答通道：挂起直到用户作答/取消/中止；缺省时直接兜底跳过。 */
  askUser?: (req: AskRequest, signal?: AbortSignal) => Promise<string>
  /**
   * 危险操作确认通道：工具返回 needsConfirmation 时挂起 loop，
   * 直到用户批准/拒绝；返回值回灌为 tool 消息内容。缺省则视为拒绝。
   */
  waitConfirm?: (req: { id: string; name: string; summary: string }, signal?: AbortSignal) => Promise<string>
  /** 可注入用于测试；默认走后端代理。 */
  postChatFn?: (payload: ChatPayload, signal?: AbortSignal) => Promise<Response>
  /**
   * 计划门禁：无 tool_calls 但计划未完成时注入催促并续跑。
   * Worker 子 loop 应关闭。默认 true。
   */
  planGate?: boolean
  /** 续跑时恢复已有计划状态。 */
  initialPlan?: { steps: string[]; done: number[] }
  /** 计划催促最大次数；默认 3。 */
  maxPlanNudges?: number
  /**
   * Worker 严格模式：无 tool_calls / 仅探路就收工时催促继续。
   * 与 planGate 独立；分析师/工程师子 loop 应开启。
   */
  workerStrict?: boolean
  /**
   * 收束时清理 AI 失败空节点。Worker 子 loop 必须关闭，以免抢父循环 waitConfirm。
   * 默认：主循环开启（planGate 未关），子循环关闭。
   */
  sweepFailedEmpty?: boolean
}

/**
 * 跑一轮完整 agent-loop；返回最终消息数组（含 tool 结果，可用于会话持久化）。
 * 中止时抛 DOMException(AbortError)；超轮抛 MaxIterError。
 */
export async function runAgent(opts: RunAgentOptions): Promise<ChatMessage[]> {
  const { exec, maxIterations, signal, onEvent } = opts
  const waitConfirm = opts.waitConfirm
  const shouldSweep = opts.sweepFailedEmpty ?? opts.planGate !== false

  const sweepFailedEmptyAiNodes = async () => {
    if (!shouldSweep) return
    const call: ToolCall = {
      id: 'ai-sweep-empty',
      type: 'function',
      function: { name: 'cleanup_failed_ai_steps', arguments: '{}' },
    }
    try {
      const result = await exec(call, {})
      const summary = String(result.summary ?? '')
      if (result.needsConfirmation && !summary.includes('失败的空节点')) return
      if (!result.needsConfirmation && !summary.includes('已删除') && !summary.includes('空节点')) return
      if (!result.needsConfirmation && /没有需要清理/.test(summary)) return
      onEvent({ type: 'tool_call', call, running: false })
      onEvent({
        type: 'tool_result',
        id: call.id,
        name: 'cleanup_failed_ai_steps',
        ok: result.ok,
        summary: result.summary,
        needsConfirmation: result.needsConfirmation,
      })
      if (!result.needsConfirmation) return
      const resolved = waitConfirm
        ? await waitConfirm({ id: call.id, name: 'cleanup_failed_ai_steps', summary: result.summary }, signal)
        : '用户未确认该危险操作（前端未接入确认通道）。不要重试；请改用其他方案。'
      const approved = !resolved.includes('拒绝') && !resolved.includes('未确认')
      if (approved) {
        const done = await exec(call, { __confirmed: true })
        onEvent({
          type: 'tool_result',
          id: call.id,
          name: 'cleanup_failed_ai_steps',
          ok: done.ok,
          summary: done.summary,
          needsConfirmation: false,
        })
        return
      }
      onEvent({
        type: 'tool_result',
        id: call.id,
        name: 'cleanup_failed_ai_steps',
        ok: false,
        summary: resolved,
        needsConfirmation: false,
      })
    } catch {
      /* 测试 mock exec 或环境无分析时忽略 */
    }
  }
  const post = opts.postChatFn ?? postChat
  const messages = [...opts.messages]
  const planGate = opts.planGate !== false
  const workerStrict = !!opts.workerStrict
  const maxNudges = opts.maxPlanNudges ?? DEFAULT_MAX_PLAN_NUDGES

  let planSteps: string[] = opts.initialPlan?.steps ? [...opts.initialPlan.steps] : []
  let planDone: number[] = opts.initialPlan?.done ? [...opts.initialPlan.done] : []
  let planNudges = 0
  let workerNudges = 0
  const MAX_WORKER_NUDGES = 4
  /** 连续「无工具 / 空转复读」轮数；用于打断死循环独白。 */
  let stallRounds = 0
  let lastStallText = ''
  const MAX_STALL_ROUNDS = 3
  /** 同一工具连续失败或同参成功重复次数；打断 set_chart_config 等空转。 */
  let toolSpinCount = 0
  let lastToolSpinKey = ''
  const MAX_TOOL_SPIN = 3
  let toolSpinNudges = 0
  const MAX_TOOL_SPIN_NUDGES = 2

  const noteToolSpin = (name: string, args: Record<string, unknown>, result: ToolExecResult) => {
    const argKey = JSON.stringify(args ?? {})
    const key = result.ok ? `ok:${name}:${argKey}` : `fail:${name}`
    if (key === lastToolSpinKey) toolSpinCount += 1
    else {
      lastToolSpinKey = key
      toolSpinCount = 1
    }
    if (toolSpinCount < MAX_TOOL_SPIN || toolSpinNudges >= MAX_TOOL_SPIN_NUDGES) return
    toolSpinNudges += 1
    toolSpinCount = 0
    lastToolSpinKey = ''
    const chartHint =
      name === 'read_skill' || name === 'list_skills'
        ? '配图参数已在系统提示与 set_chart_config 工具描述中，禁止再读 Skill；立刻 set_chart_config（含 x 与 Y）。'
        : '若已返回成功/配置完成：立刻 mark_step_done 并做下一步；若失败：换字段或 ask_user，禁止再用相同参数重试。'
    messages.push({
      role: 'system',
      content: `【停止空转】工具「${name}」已连续重复。${chartHint}禁止过程独白。`,
    })
  }

  const throwIfAborted = () => {
    if (signal?.aborted) throw new DOMException('已中止', 'AbortError')
  }

  const emitIncompleteIfNeeded = () => {
    if (!planGate || !planIncomplete(planSteps, planDone)) return false
    onEvent({
      type: 'incomplete',
      reason: 'plan_incomplete',
      pendingSteps: pendingPlanSteps(planSteps, planDone),
    })
    return true
  }

  const pushToolContent = (call: ToolCall, name: string, content: string, extra?: Partial<ToolExecResult>) => {
    const clipped = clipToolResult(content)
    onEvent({
      type: 'tool_result',
      id: call.id,
      name,
      ok: extra?.ok !== false,
      summary: clipped,
      artifact: extra?.artifact,
      needsConfirmation: extra?.needsConfirmation,
    })
    messages.push({ role: 'tool', tool_call_id: call.id, name, content: clipped })
  }

  for (let round = 1; round <= maxIterations; round += 1) {
    throwIfAborted()
    onEvent({ type: 'round', n: round })

    let streamed: Awaited<ReturnType<typeof readSseStream>>
    try {
      const res = await post(
        {
          messages: sanitizeChatMessages(messages),
          tools: opts.tools,
          ...(opts.model ? { model: opts.model } : {}),
        },
        signal,
      )
      streamed = await readSseStream(
        res,
        (text) => onEvent({ type: 'token', text }),
        (text) => onEvent({ type: 'reasoning', text }),
      )
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') throw err
      const msg = err instanceof Error ? err.message : String(err)
      emitIncompleteIfNeeded()
      onEvent({ type: 'error', message: msg })
      throw new AgentRunError(msg, messages)
    }
    // reasoning 只用于 UI 展示，不回灌上游（兼容模式对未知字段可能 400）
    const { reasoning: _reasoning, ...assistant } = streamed
    messages.push(assistant)

    const calls = assistant.tool_calls ?? []
    if (!calls.length) {
      const text = contentText(assistant.content).trim()
      // 空转复读 / 过程独白：无工具 → 计 stall
      if (text && lastStallText && isNearDuplicate(text, lastStallText)) {
        stallRounds += 1
      } else if (text && isProcessMonologue(text)) {
        stallRounds += 1
        lastStallText = text
      } else if (text) {
        stallRounds = planIncomplete(planSteps, planDone) ? stallRounds + 1 : 0
        lastStallText = text
      }

      // P0 计划门禁：假结束 → 催促续跑（并压缩独白，避免上下文越读越复读）
      if (planGate && planIncomplete(planSteps, planDone) && planNudges < maxNudges && stallRounds < MAX_STALL_ROUNDS) {
        planNudges += 1
        const last = messages[messages.length - 1]
        if (last?.role === 'assistant') {
          messages[messages.length - 1] = {
            ...last,
            content: '（计划未完成，请立即调用工具继续，禁止复述「让我/好的/开始执行/读技能」）',
          }
        }
        messages.push({
          role: 'system',
          content:
            planNudgeMessage(planSteps, planDone) +
            '\n【禁止独白】不要输出过程说明；本轮必须直接 tool_calls（配图直接 set_chart_config，禁止再 read_skill）；不要重新 submit_plan。',
        })
        continue
      }

      // Worker：禁止只读探路就收工；已有落地工具时允许短总结结束（勿因文案<24字误催促）
      if (workerStrict && workerNudges < MAX_WORKER_NUDGES) {
        const onlyExplored = workerOnlyExplored(messages)
        const noToolsYet = !messages.some((m) => m.role === 'tool')
        if (onlyExplored || (noToolsYet && !text)) {
          workerNudges += 1
          const last = messages[messages.length - 1]
          if (last?.role === 'assistant') {
            messages[messages.length - 1] = { ...last, content: '（目标未落地，继续调用工具）' }
          }
          messages.push({
            role: 'system',
            content:
              '【任务未完成】目标尚未落地。请立即继续 tool_calls（加工/Custom Code/建图/配置），禁止只 list_tables/get_table_schema 就结束；不要复述目标长文。',
          })
          continue
        }
      }

      // 连续空转：强制收束，避免刷屏
      if (stallRounds >= MAX_STALL_ROUNDS && planGate && planIncomplete(planSteps, planDone)) {
        const scrubbed = scrubVisibleContent(text)
        emitIncompleteIfNeeded()
        await sweepFailedEmptyAiNodes()
        onEvent({
          type: 'done',
          content: scrubbed
            ? `${scrubbed}\n\n（执行陷入重复说明，已暂停。可点击「继续任务」。）`
            : '执行陷入重复说明，已暂停。请点击「继续任务」或改述需求。',
        })
        return messages
      }

      emitIncompleteIfNeeded()
      await sweepFailedEmptyAiNodes()
      onEvent({ type: 'done', content: scrubVisibleContent(contentText(assistant.content)) })
      return messages
    }

    // 有工具：本轮过程独白不进上下文（防下一轮继续复读）
    // 空 content 省略字段（勿用 null：豆包会 Invalid request body / MissingParameter）
    stallRounds = 0
    lastStallText = ''
    if (contentText(assistant.content).trim()) {
      const scrubbed: ChatMessage = { ...assistant }
      delete scrubbed.content
      messages[messages.length - 1] = scrubbed
    }

    // 本轮工具先全部挂上轨迹（queued），再逐条标 running 并让出一帧给 UI。
    // 否则 tool_call + 同步 exec 落在同一轮 microtask，浏览器来不及绘制进行中态。
    for (const call of calls) {
      call.function.arguments = normalizeToolArguments(call.function.arguments, call.function.name)
      onEvent({ type: 'tool_call', call, running: false })
    }
    await yieldToUi()

    for (const call of calls) {
      throwIfAborted()
      const name = call.function.name
      onEvent({ type: 'tool_call', call, running: true })
      await yieldToUi()
      const args = safeParseArgs(call.function.arguments, name)

      // 协议级工具：计划与进展（不落到平台）
      if (name === 'submit_plan') {
        const steps = extractPlanSteps(args).slice(0, 8)
        if (!steps.length) {
          pushToolContent(
            call,
            name,
            'error：计划 steps 为空或无法解析。请重新 submit_plan，提交 3-6 条具体步骤（字符串数组）。',
            { ok: false },
          )
          continue
        }
        // 回写规范化后的 arguments，保证后续 sanitize 一定是合法 JSON
        call.function.arguments = JSON.stringify({ steps })
        const sameAsCurrent =
          planSteps.length > 0 &&
          planSteps.length === steps.length &&
          planSteps.every((s, i) => s === steps[i])
        // 续跑中禁止重置：已有进度时忽略重复 submit_plan
        if (planDone.length > 0 && (sameAsCurrent || opts.initialPlan?.steps?.length)) {
          pushToolContent(
            call,
            name,
            `ok：续跑中沿用已有计划（已完成 ${planDone.length}/${planSteps.length || steps.length} 步）。请勿重新规划，直接执行未完成步骤并 mark_step_done。`,
          )
          continue
        }
        planSteps = steps
        planDone = []
        onEvent({ type: 'plan', steps })
        pushToolContent(call, name, `ok：已提交计划（${steps.length} 步）`)
        continue
      }
      if (name === 'mark_step_done') {
        const index = Number(args.index ?? 0)
        if (Number.isFinite(index) && index >= 0 && !planDone.includes(index)) planDone.push(index)
        onEvent({ type: 'step_done', index })
        pushToolContent(call, name, `ok：步骤 ${index + 1} 完成`)
        continue
      }
      // 协议级工具：向用户提问（暂停循环等待作答，回答回灌模型）
      if (name === 'ask_user') {
        const question = String(args.question ?? '').trim()
        const options = Array.isArray(args.options) ? args.options.map((o) => String(o)).filter(Boolean).slice(0, 4) : []
        const allowOther = args.allowOther !== false
        onEvent({ type: 'ask', id: call.id, question, options, allowOther })
        const answer = opts.askUser
          ? await opts.askUser({ id: call.id, question, options, allowOther }, signal)
          : '（前端未接入提问交互，用户未能作答）'
        throwIfAborted()
        pushToolContent(call, name, `用户的回答：${answer}`)
        continue
      }

      // P1：派发 Worker（嵌套短 loop）
      if (isDelegateWorker(name)) {
        const goal = String(args.goal ?? '').trim()
        let result: ToolExecResult
        try {
          result = await runDelegateWorker({
            workerName: name,
            goal,
            parentTools: opts.tools,
            parentMessages: messages,
            parent: {
              exec,
              model: opts.model,
              signal,
              askUser: opts.askUser,
              waitConfirm: opts.waitConfirm,
              postChatFn: opts.postChatFn,
            },
            onProgress: (summary) => onEvent({ type: 'worker_progress', id: call.id, summary }),
          })
        } catch (e) {
          if (e instanceof DOMException && e.name === 'AbortError') throw e
          result = { ok: false, summary: `子代理执行失败：${e instanceof Error ? e.message : String(e)}` }
        }
        pushToolContent(call, name, result.summary, result)
        noteToolSpin(name, { goal }, result)
        continue
      }

      let result: ToolExecResult
      try {
        result = await exec(call, args)
      } catch (e) {
        result = { ok: false, summary: `工具执行失败：${e instanceof Error ? e.message : String(e)}` }
      }

      // 危险操作：先通知 UI 展示确认按钮，再挂起 loop 等待用户决定（与 ask_user 同构）
      if (result.needsConfirmation) {
        onEvent({
          type: 'tool_result',
          id: call.id,
          name,
          ok: false,
          summary: result.summary,
          artifact: result.artifact,
          needsConfirmation: true,
        })
        const resolved = opts.waitConfirm
          ? await opts.waitConfirm({ id: call.id, name, summary: result.summary }, signal)
          : '用户未确认该危险操作（前端未接入确认通道）。不要重试；请改用其他方案。'
        throwIfAborted()
        const ok = !resolved.includes('拒绝') && !resolved.includes('未确认')
        pushToolContent(call, name, resolved, { ok, needsConfirmation: false })
        continue
      }

      pushToolContent(call, name, result.summary, result)
      noteToolSpin(name, args, result)
    }
  }

  // 超轮兜底：不带工具再请一轮，让模型基于已有结果直接收尾（避免硬报错）
  throwIfAborted()
  onEvent({ type: 'round', n: maxIterations + 1 })
  const wrapUpHint = planGate && planIncomplete(planSteps, planDone)
    ? '已达到最大工具调用轮数，且计划仍有未完成步骤。请不要再调用任何工具，用中文说明已完成与未完成项，并提示用户可点「继续任务」。'
    : '已达到最大工具调用轮数。请不要再调用任何工具，直接根据以上工具执行结果，用中文给出简洁的完成总结。'
  try {
    const wrapUp = await post(
      {
        messages: sanitizeChatMessages([
          ...messages,
          { role: 'system', content: wrapUpHint },
        ]),
        ...(opts.model ? { model: opts.model } : {}),
      },
      signal,
    )
    const finalStream = await readSseStream(
      wrapUp,
      (text) => onEvent({ type: 'token', text }),
      (text) => onEvent({ type: 'reasoning', text }),
    )
    const { reasoning: _r2, ...finalMsg } = finalStream
    messages.push(finalMsg)
    if (finalMsg.content) {
      emitIncompleteIfNeeded()
      await sweepFailedEmptyAiNodes()
      onEvent({ type: 'done', content: scrubVisibleContent(contentText(finalMsg.content)) })
      return messages
    }
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err
    const msg = err instanceof Error ? err.message : String(err)
    emitIncompleteIfNeeded()
    onEvent({ type: 'error', message: msg })
    throw new AgentRunError(msg, messages)
  }
  throw new MaxIterError(maxIterations)
}
