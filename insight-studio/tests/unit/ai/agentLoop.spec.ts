import { describe, expect, it } from 'vitest'
import { runAgent, MaxIterError, type AgentEvent, type ToolExecutor } from '../../../src/modules/ai/agentLoop'
import type { ChatMessage, ChatPayload, ToolCall } from '../../../src/modules/ai/client'

/** 造一个 SSE Response：单 chunk 内含完整 tool_calls 或纯文本。 */
function sseOf(payload: { toolCalls?: ToolCall[]; content?: string }): Response {
  const delta: Record<string, unknown> = { role: 'assistant' }
  if (payload.toolCalls) delta.tool_calls = payload.toolCalls.map((c, i) => ({ index: i, ...c }))
  if (payload.content) delta.content = payload.content
  const body = `data: ${JSON.stringify({ choices: [{ index: 0, delta }] })}\n\ndata: [DONE]\n\n`
  return new Response(new ReadableStream({ start: (c) => { c.enqueue(new TextEncoder().encode(body)); c.close() } }))
}
function call(name: string, args: Record<string, unknown>, id = `call_${name}`): ToolCall {
  return { id, type: 'function', function: { name, arguments: JSON.stringify(args) } }
}

function events(): AgentEvent[] {
  return []
}

describe('agentLoop（ReAct 多轮循环）', () => {
  it('tool_calls → 执行回灌 → 最终文本，事件序列完整', async () => {
    const rounds: ChatPayload[] = []
    const post = async (p: ChatPayload) => {
      rounds.push(p)
      const toolMsgs = p.messages.filter((m) => m.role === 'tool').length
      if (toolMsgs === 0) return sseOf({ toolCalls: [call('submit_plan', { steps: ['看表', '出图'] })] })
      if (toolMsgs === 1) return sseOf({ toolCalls: [call('list_tables', {})] })
      if (toolMsgs === 2) return sseOf({ toolCalls: [call('mark_step_done', { index: 0 })] })
      if (toolMsgs === 3) return sseOf({ toolCalls: [call('mark_step_done', { index: 1 })] })
      return sseOf({ content: '完成' })
    }
    const exec: ToolExecutor = async (c) => ({ ok: true, summary: `已执行 ${c.function.name}` })
    const evts = events()
    const messages = await runAgent({
      messages: [{ role: 'user', content: 'hi' }],
      tools: [],
      exec,
      maxIterations: 8,
      onEvent: (e) => evts.push(e),
      postChatFn: post,
    })

    // 计划事件
    const plan = evts.find((e) => e.type === 'plan')
    expect(plan && plan.type === 'plan' ? plan.steps : null).toEqual(['看表', '出图'])
    // 两个 step_done
    expect(evts.filter((e) => e.type === 'step_done').map((e) => (e.type === 'step_done' ? e.index : -1))).toEqual([0, 1])
    // done 事件
    expect(evts.some((e) => e.type === 'done' && e.content === '完成')).toBe(true)
    // 循环 5 轮请求；tool 结果已回灌进 messages
    expect(rounds).toHaveLength(5)
    const toolResults = messages.filter((m) => m.role === 'tool')
    expect(toolResults.length).toBe(4)
    expect(toolResults[1].content).toBe('已执行 list_tables')
  })

  it('首轮即文本（无工具调用）→ 单轮结束', async () => {
    const post = async () => sseOf({ content: '直接回答' })
    const evts = events()
    const exec: ToolExecutor = async () => ({ ok: true, summary: 'x' })
    await runAgent({
      messages: [{ role: 'user', content: 'q' }],
      tools: [],
      exec,
      maxIterations: 8,
      onEvent: (e) => evts.push(e),
      postChatFn: post,
    })
    expect(evts.filter((e) => e.type === 'round')).toHaveLength(1)
    expect(evts.some((e) => e.type === 'done')).toBe(true)
  })

  it('超轮 → 无工具收尾轮直接给出总结（不硬报错）', async () => {
    const post = async (p: ChatPayload) => {
      // 收尾轮（消息里带「已达到最大工具调用轮数」system 提示）回纯文本
      const isWrapUp = p.messages.some((m) => m.role === 'system' && typeof m.content === 'string' && m.content.includes('已达到最大工具调用轮数'))
      return isWrapUp ? sseOf({ content: '基于已完成操作的总结' }) : sseOf({ toolCalls: [call('list_tables', {})] })
    }
    const exec: ToolExecutor = async () => ({ ok: true, summary: 'ok' })
    const evts = events()
    await runAgent({
      messages: [{ role: 'user', content: 'q' }],
      tools: [],
      exec,
      maxIterations: 2,
      onEvent: (e) => evts.push(e),
      postChatFn: post,
    })
    expect(evts.filter((e) => e.type === 'round')).toHaveLength(3)
    const done = evts.find((e) => e.type === 'done')
    expect(done && done.type === 'done' ? done.content : '').toBe('基于已完成操作的总结')
  })

  it('超轮收尾仍无文本 → MaxIterError', async () => {
    const post = async () => sseOf({ toolCalls: [call('list_tables', {})] })
    const exec: ToolExecutor = async () => ({ ok: true, summary: 'ok' })
    await expect(
      runAgent({
        messages: [{ role: 'user', content: 'q' }],
        tools: [],
        exec,
        maxIterations: 2,
        onEvent: () => undefined,
        postChatFn: post,
      }),
    ).rejects.toThrow(MaxIterError)
  })

  it('exec 抛错 → tool 结果标记失败并继续', async () => {
    const post = async (p: ChatPayload) => {
      const n = p.messages.filter((m) => m.role === 'tool').length
      return n === 0 ? sseOf({ toolCalls: [call('list_tables', {})] }) : sseOf({ content: '总结' })
    }
    const exec: ToolExecutor = async () => {
      throw new Error('boom')
    }
    const evts = events()
    await runAgent({
      messages: [{ role: 'user', content: 'q' }],
      tools: [],
      exec,
      maxIterations: 4,
      onEvent: (e) => evts.push(e),
      postChatFn: post,
    })
    const failed = evts.find((e) => e.type === 'tool_result' && !e.ok)
    expect(failed).toBeTruthy()
    expect(failed && failed.type === 'tool_result' ? failed.summary : '').toContain('boom')
    expect(evts.some((e) => e.type === 'done')).toBe(true)
  })

  it('ask_user：发出 ask 事件并暂停，作答作为 tool 结果回灌模型', async () => {
    const post = async (p: ChatPayload) => {
      const n = p.messages.filter((m) => m.role === 'tool').length
      return n === 0
        ? sseOf({ toolCalls: [call('ask_user', { question: '按哪个字段分组？', options: ['species', 'batch'], allowOther: true })] })
        : sseOf({ content: '收到，继续。' })
    }
    const exec: ToolExecutor = async () => ({ ok: true, summary: 'x' })
    const evts = events()
    const messages = await runAgent({
      messages: [{ role: 'user', content: 'q' }],
      tools: [],
      exec,
      maxIterations: 4,
      askUser: async (req) => {
        expect(req.question).toBe('按哪个字段分组？')
        expect(req.options).toEqual(['species', 'batch'])
        expect(req.allowOther).toBe(true)
        return 'species'
      },
      onEvent: (e) => evts.push(e),
      postChatFn: post,
    })
    expect(evts.some((e) => e.type === 'ask')).toBe(true)
    expect(messages.find((m) => m.role === 'tool')?.content).toBe('用户的回答：species')
    expect(evts.some((e) => e.type === 'done' && e.content === '收到，继续。')).toBe(true)
  })

  it('ask_user 无作答通道 → 兜底跳过不中断', async () => {
    const post = async (p: ChatPayload) => {
      const n = p.messages.filter((m) => m.role === 'tool').length
      return n === 0 ? sseOf({ toolCalls: [call('ask_user', { question: '继续吗？' })] }) : sseOf({ content: '好' })
    }
    const exec: ToolExecutor = async () => ({ ok: true, summary: 'x' })
    const messages = await runAgent({
      messages: [{ role: 'user', content: 'q' }],
      tools: [],
      exec,
      maxIterations: 4,
      onEvent: () => undefined,
      postChatFn: post,
    })
    expect(messages.find((m) => m.role === 'tool')?.content).toContain('未能作答')
  })
})

/* ------------------------------- SSE 解析 ------------------------------- */
import { readSseStream } from '../../../src/modules/ai/client'

describe('readSseStream（OpenAI SSE 聚合）', () => {
  it('分片 tool_calls 聚合：id/name/arguments 拼接', async () => {
    const chunks = [
      { choices: [{ delta: { role: 'assistant', tool_calls: [{ index: 0, id: 'call_1', type: 'function', function: { name: 'list_ta' } }] } }] },
      { choices: [{ delta: { tool_calls: [{ index: 0, function: { name: 'bles', arguments: '{"a"' } }] } }] },
      { choices: [{ delta: { tool_calls: [{ index: 0, function: { arguments: ':1}' } }] } }] },
      { choices: [{ delta: { content: '你好' } }] },
    ]
    const body = chunks.map((c) => `data: ${JSON.stringify(c)}\n\n`).join('') + 'data: [DONE]\n\n'
    const res = new Response(new ReadableStream({ start: (c) => { c.enqueue(new TextEncoder().encode(body)); c.close() } }))
    const tokens: string[] = []
    const msg = await readSseStream(res, (t) => tokens.push(t))
    expect(msg.role).toBe('assistant')
    expect(msg.content).toBe('你好')
    expect(msg.tool_calls).toHaveLength(1)
    expect(msg.tool_calls![0].function.name).toBe('list_tables')
    expect(msg.tool_calls![0].function.arguments).toBe('{"a":1}')
  })
})
