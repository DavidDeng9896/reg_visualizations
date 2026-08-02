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

export type AgentEvent =
  | { type: 'token'; text: string }
  | { type: 'round'; n: number }
  | { type: 'tool_call'; call: ToolCall }
  | { type: 'tool_result'; id: string; name: string; ok: boolean; summary: string; artifact?: import('./types').Artifact; needsConfirmation?: boolean }
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
  signal?: AbortSignal
  onEvent: (e: AgentEvent) => void
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

    const res = await post({ messages, tools: opts.tools }, signal)
    const assistant = await readSseStream(res, (text) => onEvent({ type: 'token', text }))
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

      let result: ToolExecResult
      try {
        result = await exec(call, args)
      } catch (e) {
        result = { ok: false, summary: `工具执行失败：${e instanceof Error ? e.message : String(e)}` }
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
  throw new MaxIterError(maxIterations)
}
