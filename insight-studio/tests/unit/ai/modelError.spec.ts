import { describe, expect, it, vi, afterEach } from 'vitest'
import { sanitizeModelError, postChat, CHAT_RETRY } from '../../../src/modules/ai/client'
import { AgentRunError, runAgent, type ToolExecutor } from '../../../src/modules/ai/agentLoop'
import type { ToolCall } from '../../../src/modules/ai/client'

function sseOf(payload: { toolCalls?: ToolCall[]; content?: string }): Response {
  const delta: Record<string, unknown> = { role: 'assistant' }
  if (payload.toolCalls) delta.tool_calls = payload.toolCalls.map((c, i) => ({ index: i, ...c }))
  if (payload.content) delta.content = payload.content
  const body = `data: ${JSON.stringify({ choices: [{ index: 0, delta }] })}\n\ndata: [DONE]\n\n`
  return new Response(
    new ReadableStream({
      start: (c) => {
        c.enqueue(new TextEncoder().encode(body))
        c.close()
      },
    }),
  )
}

function call(name: string, args: Record<string, unknown>, id = `call_${name}`): ToolCall {
  return { id, type: 'function', function: { name, arguments: JSON.stringify(args) } }
}

describe('sanitizeModelError', () => {
  it('去掉不可打印噪声', () => {
    const messy = `模型请求失败（502）：\u001f\u008b\u0008abc正常中文`
    const out = sanitizeModelError(messy)
    expect(out).not.toMatch(/[\u0000-\u0008]/)
    expect(out.length).toBeGreaterThan(0)
  })

  it('空串有兜底文案', () => {
    expect(sanitizeModelError('\u0000\u0001')).toContain('无法解析')
  })
})

describe('AgentRunError 保留进度', () => {
  it('失败前已有 tool 结果时 partialMessages 含 tool', async () => {
    let n = 0
    const post = async () => {
      n += 1
      if (n === 1) return sseOf({ toolCalls: [call('list_tables', {})] })
      throw new Error('模型请求失败（502）：oops')
    }
    const exec: ToolExecutor = async () => ({ ok: true, summary: 'tables' })
    try {
      await runAgent({
        messages: [{ role: 'user', content: 'hi' }],
        tools: [],
        exec,
        maxIterations: 8,
        onEvent: () => {},
        postChatFn: post,
      })
      expect.fail('should throw')
    } catch (e) {
      expect(e).toBeInstanceOf(AgentRunError)
      const err = e as AgentRunError
      expect(err.partialMessages.some((m) => m.role === 'tool')).toBe(true)
      expect(err.message).toContain('502')
    }
  })
})

describe('postChat 对 RPM 502 重试', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    CHAT_RETRY.minDelayMs = 400
  })

  it('上游 max RPM 502 后重试直至成功', async () => {
    CHAT_RETRY.minDelayMs = 0
    let n = 0
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        n += 1
        if (n < 3) {
          return new Response(
            JSON.stringify({
              message: 'request reached organization max RPM: 3, please try again after 1 seconds',
            }),
            { status: 502, headers: { 'Content-Type': 'application/json' } },
          )
        }
        return new Response('data: [DONE]\n\n', { status: 200, headers: { 'Content-Type': 'text/event-stream' } })
      }),
    )
    const res = await postChat({ messages: [{ role: 'user', content: 'hi' }] })
    expect(res.ok).toBe(true)
    expect(n).toBe(3)
  })
})
