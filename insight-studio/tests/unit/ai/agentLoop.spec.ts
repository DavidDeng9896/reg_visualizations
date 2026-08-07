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

  it('needsConfirmation：挂起 waitConfirm，批准后同一 loop 续跑并收尾', async () => {
    let posts = 0
    const post = async (p: ChatPayload) => {
      posts += 1
      const tools = p.messages.filter((m) => m.role === 'tool')
      if (!tools.length) return sseOf({ toolCalls: [call('delete_table', { tableId: 't1' }, 'call_del')] })
      const last = tools[tools.length - 1]
      expect(String(last.content)).toContain('用户已批准')
      return sseOf({ content: '已删除并完成' })
    }
    const exec: ToolExecutor = async () => ({
      ok: false,
      needsConfirmation: true,
      summary: 'NEEDS_CONFIRMATION: 删除表',
    })
    const evts = events()
    let confirmSeen = false
    await runAgent({
      messages: [{ role: 'user', content: '删表' }],
      tools: [],
      exec,
      maxIterations: 8,
      waitConfirm: async (req) => {
        confirmSeen = true
        expect(req.id).toBe('call_del')
        expect(req.summary).toContain('NEEDS_CONFIRMATION')
        return '用户已批准并执行该操作，执行结果：已删除表'
      },
      onEvent: (e) => evts.push(e),
      postChatFn: post,
    })
    expect(confirmSeen).toBe(true)
    expect(posts).toBe(2)
    const confirms = evts.filter((e) => e.type === 'tool_result' && e.id === 'call_del')
    expect(confirms.length).toBe(2)
    expect(confirms[0].type === 'tool_result' && confirms[0].needsConfirmation).toBe(true)
    expect(confirms[1].type === 'tool_result' && confirms[1].needsConfirmation).toBe(false)
    expect(evts.some((e) => e.type === 'done' && e.content.includes('完成'))).toBe(true)
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
  it('计划门禁：未 mark_step_done 完就收尾 → 注入催促并续跑', async () => {
    let nudges = 0
    const post = async (p: ChatPayload) => {
      const n = p.messages.filter((m) => m.role === 'tool').length
      const hasNudge = p.messages.some(
        (m) => m.role === 'system' && typeof m.content === 'string' && m.content.includes('计划未完成'),
      )
      if (hasNudge) nudges += 1
      if (n === 0) return sseOf({ toolCalls: [call('submit_plan', { steps: ['A', 'B'] })] })
      if (nudges === 0) return sseOf({ content: '先到这里吧' }) // 假结束
      if (nudges === 1) return sseOf({ toolCalls: [call('mark_step_done', { index: 0 })] })
      if (nudges === 2) {
        // 仍未完成 B；再假结束一次会被第二次 nudge
        return sseOf({ content: '又想结束' })
      }
      // 第二次 nudge 后完成剩余
      const doneTools = p.messages.filter((m) => m.role === 'tool' && m.name === 'mark_step_done').length
      if (doneTools < 2) return sseOf({ toolCalls: [call('mark_step_done', { index: 1 })] })
      return sseOf({ content: '全部完成' })
    }
    const exec: ToolExecutor = async () => ({ ok: true, summary: 'x' })
    const evts = events()
    await runAgent({
      messages: [{ role: 'user', content: '任务' }],
      tools: [],
      exec,
      maxIterations: 20,
      maxPlanNudges: 3,
      onEvent: (e) => evts.push(e),
      postChatFn: post,
    })
    expect(nudges).toBeGreaterThanOrEqual(1)
    expect(evts.filter((e) => e.type === 'step_done').length).toBe(2)
    expect(evts.some((e) => e.type === 'done' && e.content === '全部完成')).toBe(true)
    expect(evts.some((e) => e.type === 'incomplete')).toBe(false)
  })

  it('计划门禁催促耗尽 → incomplete 事件', async () => {
    const post = async (p: ChatPayload) => {
      const n = p.messages.filter((m) => m.role === 'tool').length
      if (n === 0) return sseOf({ toolCalls: [call('submit_plan', { steps: ['只做一步'] })] })
      return sseOf({ content: '提前收工' })
    }
    const evts = events()
    await runAgent({
      messages: [{ role: 'user', content: 'q' }],
      tools: [],
      exec: async () => ({ ok: true, summary: 'x' }),
      maxIterations: 10,
      maxPlanNudges: 2,
      onEvent: (e) => evts.push(e),
      postChatFn: post,
    })
    expect(evts.some((e) => e.type === 'incomplete')).toBe(true)
    expect(evts.some((e) => e.type === 'done')).toBe(true)
  })

  it('超长 tool 结果回灌会被裁剪', async () => {
    const long = '字'.repeat(5000)
    const post = async (p: ChatPayload) => {
      const n = p.messages.filter((m) => m.role === 'tool').length
      return n === 0 ? sseOf({ toolCalls: [call('list_tables', {})] }) : sseOf({ content: 'ok' })
    }
    const messages = await runAgent({
      messages: [{ role: 'user', content: 'q' }],
      tools: [],
      exec: async () => ({ ok: true, summary: long }),
      maxIterations: 4,
      onEvent: () => undefined,
      postChatFn: post,
    })
    const tool = messages.find((m) => m.role === 'tool')
    expect(tool?.content?.length ?? 0).toBeLessThan(long.length)
    expect(tool?.content).toContain('省略')
  })

  it('delegate_skill_worker：嵌套短 loop 摘要回灌', async () => {
    let depth = 0
    const post = async (p: ChatPayload) => {
      const isWorker = p.messages.some(
        (m) => m.role === 'system' && typeof m.content === 'string' && m.content.includes('Skill 工人'),
      )
      if (isWorker) {
        depth += 1
        const tools = p.messages.filter((m) => m.role === 'tool')
        if (!tools.length) {
          return sseOf({ toolCalls: [call('read_skill', { skillId: 's1' }, 'w_read')] })
        }
        return sseOf({ content: '要点：先过滤再出图' })
      }
      const n = p.messages.filter((m) => m.role === 'tool').length
      if (n === 0) {
        return sseOf({
          toolCalls: [call('delegate_skill_worker', { goal: '读 skill 提炼要点' }, 'd1')],
        })
      }
      return sseOf({ content: '主循环完成' })
    }
    const exec: ToolExecutor = async (c) => {
      if (c.function.name === 'read_skill') return { ok: true, summary: 'skill body…' }
      return { ok: true, summary: 'x' }
    }
    const evts = events()
    const messages = await runAgent({
      messages: [{ role: 'user', content: 'q' }],
      tools: [
        {
          type: 'function',
          function: {
            name: 'read_skill',
            description: 'read',
            parameters: { type: 'object', properties: { skillId: { type: 'string' } } },
          },
        },
      ],
      exec,
      maxIterations: 8,
      planGate: false,
      onEvent: (e) => evts.push(e),
      postChatFn: post,
    })
    expect(depth).toBeGreaterThan(0)
    const workerResult = messages.find((m) => m.role === 'tool' && m.name === 'delegate_skill_worker')
    expect(workerResult?.content).toContain('Skill 工人')
    expect(workerResult?.content).toContain('要点')
    expect(evts.some((e) => e.type === 'done' && e.content === '主循环完成')).toBe(true)
  })
  it('工具轮：过程独白不写入回灌上下文', async () => {
    const post = async (p: ChatPayload) => {
      const n = p.messages.filter((m) => m.role === 'tool').length
      if (n === 0) {
        return sseOf({
          content: '好，让我先确认表结构再创建视图。'.repeat(5),
          toolCalls: [call('list_tables', {})],
        })
      }
      return sseOf({ content: '完成' })
    }
    const messages = await runAgent({
      messages: [{ role: 'user', content: 'q' }],
      tools: [],
      exec: async () => ({ ok: true, summary: 'ok' }),
      maxIterations: 4,
      planGate: false,
      onEvent: () => undefined,
      postChatFn: post,
    })
    const withTools = messages.find((m) => m.role === 'assistant' && (m.tool_calls?.length ?? 0) > 0)
    expect(withTools?.content ?? '').toBe('')
  })

  it('连续复读无工具 → 强制收束并 incomplete', async () => {
    const line = '好，让我直接调用 get_table_schema 确认表结构，然后创建视图。'
    const post = async (p: ChatPayload) => {
      const n = p.messages.filter((m) => m.role === 'tool').length
      if (n === 0) return sseOf({ toolCalls: [call('submit_plan', { steps: ['建图'] })] })
      return sseOf({ content: line })
    }
    const evts = events()
    await runAgent({
      messages: [{ role: 'user', content: '出图' }],
      tools: [],
      exec: async () => ({ ok: true, summary: 'x' }),
      maxIterations: 20,
      maxPlanNudges: 5,
      onEvent: (e) => evts.push(e),
      postChatFn: post,
    })
    expect(evts.some((e) => e.type === 'incomplete')).toBe(true)
    const done = evts.find((e) => e.type === 'done')
    expect(done && done.type === 'done' ? done.content : '').toMatch(/暂停|省略|继续任务|重复/)
  })

  it('续跑中重复 submit_plan 不重置已完成步骤', async () => {
    const post = async (p: ChatPayload) => {
      const tools = p.messages.filter((m) => m.role === 'tool')
      if (!tools.length) {
        return sseOf({ toolCalls: [call('submit_plan', { steps: ['A', 'B'] }, 'p1')] })
      }
      if (tools.length === 1) {
        return sseOf({ toolCalls: [call('mark_step_done', { index: 0 }, 'd0')] })
      }
      if (tools.length === 2) {
        // 模型试图重新 submit_plan
        return sseOf({ toolCalls: [call('submit_plan', { steps: ['A', 'B'] }, 'p2')] })
      }
      if (tools.length === 3) {
        return sseOf({ toolCalls: [call('mark_step_done', { index: 1 }, 'd1')] })
      }
      return sseOf({ content: '续跑完成' })
    }
    const evts = events()
    await runAgent({
      messages: [{ role: 'user', content: '续' }],
      tools: [],
      exec: async () => ({ ok: true, summary: 'x' }),
      maxIterations: 10,
      initialPlan: { steps: ['A', 'B'], done: [] },
      onEvent: (e) => evts.push(e),
      postChatFn: post,
    })
    // 不应因第二次 submit_plan 丢掉 step 0
    const dones = evts.filter((e) => e.type === 'step_done').map((e) => (e.type === 'step_done' ? e.index : -1))
    expect(dones).toEqual([0, 1])
    expect(evts.filter((e) => e.type === 'plan')).toHaveLength(1)
    expect(evts.some((e) => e.type === 'done' && e.content === '续跑完成')).toBe(true)
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
