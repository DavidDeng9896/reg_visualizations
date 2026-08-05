/**
 * Agent-loop（ReAct）：多轮 模型→工具→观察 循环，支持流式、中止、超轮。
 * 纯逻辑可测：postChat 注入。
 */
import { postChat, readSseStream, type ChatMessage, type ChatPayload, type ToolCall } from './client'

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
  | { type: 'done'; content: string }
  | { type: 'error'; message: string }

export class MaxIterError extends Error {
  constructor(public readonly iterations: number) {
    super(`已达到最大工具调用轮数（${iterations}）`)
    this.name = 'MaxIterError'
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
}

/**
 * 跑一轮完整 agent-loop；返回最终消息数组（含 tool 结果，可用于会话持久化）。
 * 中止时抛 DOMException(AbortError)；超轮抛 MaxIterError。
 */
export async function runAgent(opts: RunAgentOptions): Promise<ChatMessage[]> {
  const { exec, maxIterations, signal, onEvent } = opts
  const post = opts.postChatFn ?? postChat
  const messages = [...opts.messages]

  const throwIfAborted = () => {
    if (signal?.aborted) throw new DOMException('已中止', 'AbortError')
  }

  for (let round = 1; round <= maxIterations; round += 1) {
    throwIfAborted()
    onEvent({ type: 'round', n: round })

    const res = await post({ messages, tools: opts.tools, ...(opts.model ? { model: opts.model } : {}) }, signal)
    const streamed = await readSseStream(
      res,
      (text) => onEvent({ type: 'token', text }),
      (text) => onEvent({ type: 'reasoning', text }),
    )
    // reasoning 只用于 UI 展示，不回灌上游（兼容模式对未知字段可能 400）
    const { reasoning: _reasoning, ...assistant } = streamed
    messages.push(assistant)

    const calls = assistant.tool_calls ?? []
    if (!calls.length) {
      onEvent({ type: 'done', content: assistant.content ?? '' })
      return messages
    }

    for (const call of calls) {
      throwIfAborted()
      onEvent({ type: 'tool_call', call })
      const args = safeParseArgs(call.function.arguments)
      const name = call.function.name

      // 协议级工具：计划与进展（不落到平台）
      if (name === 'submit_plan') {
        const steps = Array.isArray(args.steps) ? args.steps.map((s) => String(s)) : []
        onEvent({ type: 'plan', steps })
        onEvent({ type: 'tool_result', id: call.id, name, ok: true, summary: `已提交计划（${steps.length} 步）` })
        messages.push({ role: 'tool', tool_call_id: call.id, name, content: 'ok' })
        continue
      }
      if (name === 'mark_step_done') {
        const index = Number(args.index ?? 0)
        onEvent({ type: 'step_done', index })
        onEvent({ type: 'tool_result', id: call.id, name, ok: true, summary: `步骤 ${index + 1} 完成` })
        messages.push({ role: 'tool', tool_call_id: call.id, name, content: 'ok' })
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
        const summary = `用户的回答：${answer}`
        onEvent({ type: 'tool_result', id: call.id, name, ok: true, summary })
        messages.push({ role: 'tool', tool_call_id: call.id, name, content: summary })
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
        onEvent({
          type: 'tool_result',
          id: call.id,
          name,
          ok,
          summary: resolved,
          needsConfirmation: false,
        })
        messages.push({ role: 'tool', tool_call_id: call.id, name, content: resolved })
        continue
      }

      onEvent({
        type: 'tool_result',
        id: call.id,
        name,
        ok: result.ok,
        summary: result.summary,
        artifact: result.artifact,
        needsConfirmation: result.needsConfirmation,
      })
      messages.push({ role: 'tool', tool_call_id: call.id, name, content: result.summary })
    }
  }

  // 超轮兜底：不带工具再请一轮，让模型基于已有结果直接收尾（避免硬报错）
  throwIfAborted()
  onEvent({ type: 'round', n: maxIterations + 1 })
  const wrapUp = await post(
    {
      messages: [
        ...messages,
        { role: 'system', content: '已达到最大工具调用轮数。请不要再调用任何工具，直接根据以上工具执行结果，用中文给出简洁的完成总结。' },
      ],
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
    onEvent({ type: 'done', content: finalMsg.content })
    return messages
  }
  throw new MaxIterError(maxIterations)
}
