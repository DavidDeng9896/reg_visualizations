/**
 * Agent-loop（ReAct）：多轮 模型→工具→观察 循环，支持流式、中止、超轮、计划门禁。
 * 纯逻辑可测：postChat 注入。
 */
import {
  contentText,
  postChat,
  readSseStream,
  sanitizeChatMessages,
  type ChatMessage,
  type ChatPayload,
  type ToolCall,
} from './client'
import { clipToolResult, planIncomplete, planNudgeMessage, pendingPlanSteps } from './taskState'
import { isNearDuplicate, scrubVisibleContent } from './contentScrub'
import { isDelegateWorker, runDelegateWorker, workerOnlyExplored } from './tools/workers'

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
  | { type: 'tool_call'; call: ToolCall }
  | { type: 'tool_result'; id: string; name: string; ok: boolean; summary: string; artifact?: import('./types').Artifact; needsConfirmation?: boolean }
  | { type: 'ask'; id: string; question: string; options: string[]; allowOther: boolean }
  | { type: 'plan'; steps: string[] }
  | { type: 'step_done'; index: number }
  | { type: 'incomplete'; reason: string; pendingSteps: Array<{ index: number; text: string }> }
  | { type: 'done'; content: string }
  | { type: 'error'; message: string }
  /** 工人内部进展（用于 Trace 上显示「工人进行中：xxx」）。 */
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

function safeParseArgs(raw: string): Record<string, unknown> {
  try {
    const v = JSON.parse(raw || '{}') as unknown
    return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {}
  } catch {
    return {}
  }
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
   * 与 planGate 独立；工人子 loop 应开启。
   */
  workerStrict?: boolean
}

/**
 * 跑一轮完整 agent-loop；返回最终消息数组（含 tool 结果，可用于会话持久化）。
 * 中止时抛 DOMException(AbortError)；超轮抛 MaxIterError。
 */
export async function runAgent(opts: RunAgentOptions): Promise<ChatMessage[]> {
  const { exec, maxIterations, signal, onEvent } = opts
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
      // 空转复读：与上一轮高度相似且无工具 → 计 stall
      if (text && lastStallText && isNearDuplicate(text, lastStallText)) {
        stallRounds += 1
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
            content: '（计划未完成，请立即调用工具继续，禁止复述「让我/好的/开始执行」）',
          }
        }
        messages.push({
          role: 'system',
          content:
            planNudgeMessage(planSteps, planDone) +
            '\n【禁止独白】不要输出过程说明；本轮必须直接 tool_calls，不要再说「让我确认/开始创建」；不要重新 submit_plan。',
        })
        continue
      }

      // Worker：禁止只读 schema / 空回复就收工
      if (workerStrict && workerNudges < MAX_WORKER_NUDGES) {
        const onlyExplored = workerOnlyExplored(messages)
        const emptyOrWeak = !text || text.length < 24
        if (onlyExplored || emptyOrWeak) {
          workerNudges += 1
          const last = messages[messages.length - 1]
          if (last?.role === 'assistant') {
            messages[messages.length - 1] = { ...last, content: '（目标未落地，继续调用工具）' }
          }
          messages.push({
            role: 'system',
            content:
              '【工人未完成】目标尚未落地。请立即继续 tool_calls（加工/Custom Code/建图/配置），禁止只 list_tables/get_table_schema 就结束；不要复述目标长文。',
          })
          continue
        }
      }

      // 连续空转：强制收束，避免刷屏
      if (stallRounds >= MAX_STALL_ROUNDS && planGate && planIncomplete(planSteps, planDone)) {
        const scrubbed = scrubVisibleContent(text)
        emitIncompleteIfNeeded()
        onEvent({
          type: 'done',
          content: scrubbed
            ? `${scrubbed}\n\n（执行陷入重复说明，已暂停。可点击「继续任务」。）`
            : '执行陷入重复说明，已暂停。请点击「继续任务」或改述需求。',
        })
        return messages
      }

      emitIncompleteIfNeeded()
      onEvent({ type: 'done', content: scrubVisibleContent(contentText(assistant.content)) })
      return messages
    }

    // 有工具：本轮过程独白不进上下文（防下一轮继续复读）
    // content 必须用 null（不能 ""），否则部分上游报 Invalid request body
    stallRounds = 0
    lastStallText = ''
    if (contentText(assistant.content).trim()) {
      messages[messages.length - 1] = { ...assistant, content: null }
    }

    for (const call of calls) {
      throwIfAborted()
      onEvent({ type: 'tool_call', call })
      const args = safeParseArgs(call.function.arguments)
      const name = call.function.name

      // 协议级工具：计划与进展（不落到平台）
      if (name === 'submit_plan') {
        const steps = Array.isArray(args.steps) ? args.steps.map((s) => String(s)) : []
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
          result = { ok: false, summary: `工人执行失败：${e instanceof Error ? e.message : String(e)}` }
        }
        pushToolContent(call, name, result.summary, result)
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
