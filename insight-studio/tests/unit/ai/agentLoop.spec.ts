import { describe, expect, it } from 'vitest'
import { runAgent, MaxIterError, type AgentEvent, type ToolExecutor } from '../../../src/modules/ai/agentLoop'
import type { ChatMessage, ChatPayload, ToolCall } from '../../../src/modules/ai/client'
import { OPENAI_TOOLS } from '../../../src/modules/ai/tools/registry'

/** 造一个 SSE Response：单 chunk 内含完整 tool_calls 或纯文本。 */
function sseOf(payload: { toolCalls?: ToolCall[]; content?: string; finishReason?: string }): Response {
  const delta: Record<string, unknown> = { role: 'assistant' }
  if (payload.toolCalls) delta.tool_calls = payload.toolCalls.map((c, i) => ({ index: i, ...c }))
  if (payload.content) delta.content = payload.content
  const choice: Record<string, unknown> = { index: 0, delta }
  if (payload.finishReason) choice.finish_reason = payload.finishReason
  const body = `data: ${JSON.stringify({ choices: [choice] })}\n\ndata: [DONE]\n\n`
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

  it('收束内部空节点清扫：无空壳时不抢 waitConfirm、不写入 messages', async () => {
    const names: string[] = []
    const post = async () => sseOf({ content: '直接回答' })
    const exec: ToolExecutor = async (c) => {
      names.push(c.function.name)
      return { ok: true, summary: '没有需要清理的失败空节点' }
    }
    const evts = events()
    const messages = await runAgent({
      messages: [{ role: 'user', content: 'q' }],
      tools: [],
      exec,
      maxIterations: 8,
      waitConfirm: async () => {
        throw new Error('should not waitConfirm')
      },
      onEvent: (e) => evts.push(e),
      postChatFn: post,
    })
    expect(names).toContain('cleanup_failed_ai_steps')
    expect(messages.filter((m) => m.role === 'tool')).toHaveLength(0)
    expect(evts.some((e) => e.type === 'tool_call' && e.call.function.name === 'cleanup_failed_ai_steps')).toBe(false)
    expect(evts.some((e) => e.type === 'done')).toBe(true)
  })

  it('收束内部空节点清扫：有删除结果时发出 tool_result', async () => {
    const post = async () => sseOf({ content: '完成' })
    const exec: ToolExecutor = async (c) => {
      if (c.function.name === 'cleanup_failed_ai_steps') {
        return { ok: true, summary: '已删除 1 个失败的空节点：空壳' }
      }
      return { ok: true, summary: 'ok' }
    }
    const evts = events()
    await runAgent({
      messages: [{ role: 'user', content: 'q' }],
      tools: [],
      exec,
      maxIterations: 8,
      onEvent: (e) => evts.push(e),
      postChatFn: post,
    })
    expect(
      evts.some(
        (e) => e.type === 'tool_result' && e.name === 'cleanup_failed_ai_steps' && e.summary.includes('已删除'),
      ),
    ).toBe(true)
  })

  it('planGate=false（Worker 子 loop）不调用 cleanup_failed_ai_steps', async () => {
    const names: string[] = []
    const post = async () => sseOf({ content: '子代理完成' })
    const exec: ToolExecutor = async (c) => {
      names.push(c.function.name)
      return { ok: true, summary: 'ok' }
    }
    await runAgent({
      messages: [{ role: 'user', content: 'q' }],
      tools: [],
      exec,
      maxIterations: 8,
      planGate: false,
      sweepFailedEmpty: false,
      onEvent: () => undefined,
      postChatFn: post,
    })
    expect(names).not.toContain('cleanup_failed_ai_steps')
  })

  it('ask 模式清扫批准后带 __confirmed 再执行', async () => {
    const calls: Array<{ name: string; args: Record<string, unknown> }> = []
    const post = async () => sseOf({ content: '完成' })
    const exec: ToolExecutor = async (c, args) => {
      calls.push({ name: c.function.name, args })
      if (c.function.name === 'cleanup_failed_ai_steps' && args.__confirmed !== true) {
        return { ok: false, needsConfirmation: true, summary: 'NEEDS_CONFIRMATION: 删除 1 个失败的空节点：空壳' }
      }
      return { ok: true, summary: '已删除 1 个失败的空节点：空壳' }
    }
    const evts = events()
    await runAgent({
      messages: [{ role: 'user', content: 'q' }],
      tools: [],
      exec,
      maxIterations: 8,
      waitConfirm: async (req) => {
        expect(req.id).toBe('ai-sweep-empty')
        return '用户已批准并执行该操作，执行结果：已删除'
      },
      onEvent: (e) => evts.push(e),
      postChatFn: post,
    })
    const sweep = calls.filter((c) => c.name === 'cleanup_failed_ai_steps')
    expect(sweep).toHaveLength(2)
    expect(sweep[1]?.args.__confirmed).toBe(true)
    expect(
      evts.some((e) => e.type === 'tool_result' && e.name === 'cleanup_failed_ai_steps' && e.summary.includes('已删除')),
    ).toBe(true)
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
        (m) => m.role === 'system' && typeof m.content === 'string' && m.content.includes('规划师'),
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
    expect(workerResult?.content).toContain('规划师')
    expect(workerResult?.content).toContain('要点')
    expect(evts.some((e) => e.type === 'done' && e.content === '主循环完成')).toBe(true)
  })
  it('finish_reason=length 截断 → 注入续写指令再来一轮，上限 2 次', async () => {
    const rounds: ChatPayload[] = []
    let n = 0
    const post = async (p: ChatPayload) => {
      rounds.push(p)
      n += 1
      // 前两轮均被截断，第三轮正常结束
      if (n <= 2) return sseOf({ content: `代码片段${n}`, finishReason: 'length' })
      return sseOf({ content: '代码片段3（完）' })
    }
    const evts = events()
    await runAgent({
      messages: [{ role: 'user', content: '写代码' }],
      tools: [],
      exec: async () => ({ ok: true, summary: 'x' }),
      maxIterations: 8,
      onEvent: (e) => evts.push(e),
      postChatFn: post,
    })
    expect(n).toBe(3)
    // 续写指令注入了 2 次
    const nudges = rounds[2].messages.filter(
      (m) => m.role === 'system' && typeof m.content === 'string' && m.content.includes('被截断'),
    )
    expect(nudges).toHaveLength(2)
    const done = evts.find((e) => e.type === 'done')
    expect(done && done.type === 'done' ? done.content : '').toBe('代码片段3（完）')
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
    expect(withTools?.content).toBeUndefined()
  })

  it('下一轮请求中 tool_calls assistant 省略空 content（勿发 null）', async () => {
    const seen: ChatPayload[] = []
    const post = async (p: ChatPayload) => {
      seen.push(p)
      const n = p.messages.filter((m) => m.role === 'tool').length
      if (n === 0) {
        return sseOf({
          content: '先看一眼表',
          toolCalls: [call('list_tables', {})],
        })
      }
      return sseOf({ content: '完成' })
    }
    await runAgent({
      messages: [{ role: 'user', content: 'q' }],
      tools: [],
      exec: async () => ({ ok: true, summary: 'ok' }),
      maxIterations: 4,
      planGate: false,
      onEvent: () => undefined,
      postChatFn: post,
    })
    expect(seen.length).toBeGreaterThanOrEqual(2)
    const asst = seen[1].messages.find((m) => m.role === 'assistant' && (m.tool_calls?.length ?? 0) > 0)
    expect(asst).toBeTruthy()
    expect(asst!).not.toHaveProperty('content')
  })

  it('submit_plan 空 steps 拒绝并提示重提', async () => {
    let n = 0
    const post = async () => {
      n += 1
      if (n === 1) return sseOf({ toolCalls: [call('submit_plan', { steps: [] })] })
      if (n === 2) return sseOf({ toolCalls: [call('submit_plan', { steps: ['A', 'B'] })] })
      if (n === 3) return sseOf({ toolCalls: [call('mark_step_done', { index: 0 })] })
      if (n === 4) return sseOf({ toolCalls: [call('mark_step_done', { index: 1 })] })
      return sseOf({ content: '完成' })
    }
    const messages = await runAgent({
      messages: [{ role: 'user', content: '任务' }],
      tools: [],
      exec: async () => ({ ok: true, summary: 'x' }),
      maxIterations: 10,
      onEvent: () => undefined,
      postChatFn: post,
    })
    const planResults = messages.filter((m) => m.role === 'tool' && m.name === 'submit_plan')
    expect(planResults[0]?.content).toContain('steps 为空')
    expect(planResults.some((m) => String(m.content).includes('已提交计划（2 步）'))).toBe(true)
  })

  it('submit_plan 兼容裸数组 / plan 字段 / 损坏 JSON 后仍可续跑', async () => {
    const seen: ChatPayload[] = []
    let n = 0
    const post = async (p: ChatPayload) => {
      seen.push(p)
      n += 1
      if (n === 1) {
        // 裸数组 arguments（非 {steps:...}）
        return sseOf({
          toolCalls: [
            {
              id: 'p0',
              type: 'function',
              function: { name: 'submit_plan', arguments: '["查看表","出图","总结"]' },
            },
          ],
        })
      }
      if (n === 2) return sseOf({ toolCalls: [call('mark_step_done', { index: 0 })] })
      if (n === 3) return sseOf({ toolCalls: [call('mark_step_done', { index: 1 })] })
      if (n === 4) return sseOf({ toolCalls: [call('mark_step_done', { index: 2 })] })
      return sseOf({ content: '完成' })
    }
    const evts: AgentEvent[] = []
    await runAgent({
      messages: [{ role: 'user', content: '任务' }],
      tools: [],
      exec: async () => ({ ok: true, summary: 'x' }),
      maxIterations: 10,
      onEvent: (e) => evts.push(e),
      postChatFn: post,
    })
    expect(evts.some((e) => e.type === 'plan' && e.steps.length === 3)).toBe(true)
    // 后续请求里 assistant.tool_calls.arguments 必须是可 JSON.parse 的对象字符串
    for (const p of seen.slice(1)) {
      for (const m of p.messages) {
        for (const c of m.tool_calls ?? []) {
          const parsed = JSON.parse(c.function.arguments)
          expect(parsed).toBeTypeOf('object')
        }
      }
    }
  })

  it('submit_plan 接受 plan 别名与换行字符串', async () => {
    let n = 0
    const post = async () => {
      n += 1
      if (n === 1) {
        return sseOf({
          toolCalls: [
            {
              id: 'p1',
              type: 'function',
              function: {
                name: 'submit_plan',
                arguments: JSON.stringify({ plan: '1. 看表\n2. 建视图\n3. 配图' }),
              },
            },
          ],
        })
      }
      if (n === 2) return sseOf({ toolCalls: [call('mark_step_done', { index: 0 })] })
      if (n === 3) return sseOf({ toolCalls: [call('mark_step_done', { index: 1 })] })
      if (n === 4) return sseOf({ toolCalls: [call('mark_step_done', { index: 2 })] })
      return sseOf({ content: 'ok' })
    }
    const evts: AgentEvent[] = []
    await runAgent({
      messages: [{ role: 'user', content: 'x' }],
      tools: [],
      exec: async () => ({ ok: true, summary: 'x' }),
      maxIterations: 10,
      onEvent: (e) => evts.push(e),
      postChatFn: post,
    })
    const plan = evts.find((e) => e.type === 'plan')
    expect(plan && plan.type === 'plan' ? plan.steps : []).toEqual(['看表', '建视图', '配图'])
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

  it('workerStrict：仅 schema 后空回复会催促继续 tool_calls', async () => {
    let n = 0
    const post = async (p: ChatPayload) => {
      n += 1
      const nudged = p.messages.some(
        (m) => m.role === 'system' && typeof m.content === 'string' && m.content.includes('任务未完成'),
      )
      if (!nudged && n === 1) return sseOf({ toolCalls: [call('get_table_schema', { tableId: 't1' })] })
      if (!nudged) return sseOf({ content: '' }) // 试图空收工
      // 被催促后真正落地
      if (nudged && p.messages.filter((m) => m.role === 'tool').length === 1) {
        return sseOf({ toolCalls: [call('create_view', { type: 'line', name: 'g' }, 'cv')] })
      }
      return sseOf({ content: '已建图' })
    }
    const exec: ToolExecutor = async (c) => ({ ok: true, summary: `ok ${c.function.name}` })
    const messages = await runAgent({
      messages: [{ role: 'user', content: '出图' }],
      tools: [],
      exec,
      maxIterations: 10,
      planGate: false,
      workerStrict: true,
      onEvent: () => {},
      postChatFn: post,
    })
    expect(messages.some((m) => m.role === 'tool' && m.name === 'create_view')).toBe(true)
    expect(messages.some((m) => m.role === 'assistant' && m.content === '已建图')).toBe(true)
  })

  it('workerStrict：已有落地工具后短总结可收工（不因文案短误催促）', async () => {
    let nudgeCount = 0
    const post = async (p: ChatPayload) => {
      if (p.messages.some((m) => m.role === 'system' && typeof m.content === 'string' && m.content.includes('任务未完成'))) {
        nudgeCount += 1
      }
      const tools = p.messages.filter((m) => m.role === 'tool').length
      if (tools === 0) return sseOf({ toolCalls: [call('create_view', { type: 'line' }, 'cv1')] })
      return sseOf({ content: '完成' }) // 短总结
    }
    const messages = await runAgent({
      messages: [{ role: 'user', content: '出图' }],
      tools: [],
      exec: async () => ({ ok: true, summary: 'ok' }),
      maxIterations: 6,
      planGate: false,
      workerStrict: true,
      onEvent: () => {},
      postChatFn: post,
    })
    expect(nudgeCount).toBe(0)
    expect(messages.some((m) => m.role === 'assistant' && m.content === '完成')).toBe(true)
  })
})

/* ------------------------------- SSE 解析 ------------------------------- */
import { readSseStream, sanitizeChatMessages, mergeStreamedToolName, mergeStreamedToolArguments, normalizeToolArguments } from '../../../src/modules/ai/client'
import { extractPlanSteps } from '../../../src/modules/ai/agentLoop'

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

  it('每帧重发完整 tool name 时不翻倍', async () => {
    const name = 'add_custom_code_step'
    const chunks = [
      {
        choices: [
          {
            delta: {
              role: 'assistant',
              tool_calls: [{ index: 0, id: 'call_x', type: 'function', function: { name, arguments: '{' } }],
            },
          },
        ],
      },
      { choices: [{ delta: { tool_calls: [{ index: 0, function: { name, arguments: '"a":1}' } }] } }] },
      { choices: [{ delta: { tool_calls: [{ index: 0, function: { name } }] } }] },
    ]
    const body = chunks.map((c) => `data: ${JSON.stringify(c)}\n\n`).join('') + 'data: [DONE]\n\n'
    const res = new Response(new ReadableStream({ start: (c) => { c.enqueue(new TextEncoder().encode(body)); c.close() } }))
    const msg = await readSseStream(res)
    expect(msg.tool_calls).toHaveLength(1)
    expect(msg.tool_calls![0].function.name).toBe('add_custom_code_step')
    expect(msg.tool_calls![0].function.arguments).toBe('{"a":1}')
  })

  it('finish_reason=length 被捕获到 finishReason', async () => {
    const body = `data: ${JSON.stringify({ choices: [{ index: 0, delta: { role: 'assistant', content: 'def f():' }, finish_reason: 'length' }] })}\n\ndata: [DONE]\n\n`
    const res = new Response(new ReadableStream({ start: (c) => { c.enqueue(new TextEncoder().encode(body)); c.close() } }))
    const msg = await readSseStream(res)
    expect(msg.finishReason).toBe('length')
  })

  it('正常结束无 finishReason 字段', async () => {
    const msg = await readSseStream(sseOf({ content: 'hi' }))
    expect(msg.finishReason).toBeUndefined()
  })

  it('每帧重发完整 arguments 时不翻倍损坏 JSON', async () => {
    const args = '{"steps":["列出表","清空"]}'
    const chunks = [
      {
        choices: [
          {
            delta: {
              tool_calls: [{ index: 0, id: 'c1', type: 'function', function: { name: 'submit_plan', arguments: args } }],
            },
          },
        ],
      },
      { choices: [{ delta: { tool_calls: [{ index: 0, function: { name: 'submit_plan', arguments: args } }] } }] },
    ]
    const body = chunks.map((c) => `data: ${JSON.stringify(c)}\n\n`).join('') + 'data: [DONE]\n\n'
    const res = new Response(new ReadableStream({ start: (c) => { c.enqueue(new TextEncoder().encode(body)); c.close() } }))
    const msg = await readSseStream(res)
    expect(msg.tool_calls![0].function.arguments).toBe(args)
    expect(JSON.parse(msg.tool_calls![0].function.arguments).steps).toEqual(['列出表', '清空'])
  })
})

describe('sanitizeChatMessages / mergeStreamedToolName', () => {
  it('assistant+tool_calls 的空 content 省略字段（勿发 null）', () => {
    const out = sanitizeChatMessages([
      { role: 'user', content: 'hi' },
      {
        role: 'assistant',
        content: '',
        tool_calls: [{ id: 'c1', type: 'function', function: { name: 'list_tables', arguments: '{}' } }],
      },
      { role: 'tool', tool_call_id: 'c1', name: 'list_tables', content: 'ok' },
      { role: 'assistant', content: '   ' },
      { role: 'system', content: '' },
    ])
    expect(out).toHaveLength(3)
    expect(out[1]).not.toHaveProperty('content')
    expect(out[1].content).toBeUndefined()
    expect(out[1].tool_calls?.[0].function.name).toBe('list_tables')
    // JSON 序列化不应出现 "content":null
    expect(JSON.stringify(out[1])).not.toContain('"content"')
  })

  it('mergeStreamedToolName：重发/前缀/增量', () => {
    expect(mergeStreamedToolName('', 'list_tables')).toBe('list_tables')
    expect(mergeStreamedToolName('list_tables', 'list_tables')).toBe('list_tables')
    expect(mergeStreamedToolName('list_', 'list_tables')).toBe('list_tables')
    expect(mergeStreamedToolName('list_tables', 'list_')).toBe('list_tables')
    expect(mergeStreamedToolName('list_', 'tables')).toBe('list_tables')
  })

  it('mergeStreamedToolArguments：完整 JSON 重发不翻倍', () => {
    const a = '{"steps":["a"]}'
    expect(mergeStreamedToolArguments(a, a)).toBe(a)
    expect(mergeStreamedToolArguments('{"steps":', '["a"]}')).toBe('{"steps":["a"]}')
  })

  it('normalizeToolArguments：损坏/fence/对象 → 合法 JSON 字符串', () => {
    expect(normalizeToolArguments('')).toBe('{}')
    expect(normalizeToolArguments('not-json')).toBe('{}')
    expect(normalizeToolArguments('{"a":1}')).toBe('{"a":1}')
    expect(normalizeToolArguments('```json\n{"a":1}\n```')).toBe('{"a":1}')
    expect(normalizeToolArguments({ steps: ['x'] })).toBe(JSON.stringify({ steps: ['x'] }))
    expect(normalizeToolArguments('prefix {"steps":["a"]} trailing')).toBe('{"steps":["a"]}')
    expect(normalizeToolArguments('[{"field":"y"}]', 'set_chart_config')).toBe(
      JSON.stringify({ configure: { values: [{ field: 'y' }] } }),
    )
    // sanitize 后发给上游的 arguments 必须可 parse
    const out = sanitizeChatMessages([
      {
        role: 'assistant',
        tool_calls: [
          { id: 'c1', type: 'function', function: { name: 'submit_plan', arguments: 'broken{{' } },
        ],
      },
    ])
    expect(() => JSON.parse(out[0].tool_calls![0].function.arguments)).not.toThrow()
  })

  it('extractPlanSteps：steps/plan/裸数组/换行', () => {
    expect(extractPlanSteps({ steps: ['A', 'B'] })).toEqual(['A', 'B'])
    expect(extractPlanSteps({ plan: ['A', ' B '] })).toEqual(['A', 'B'])
    expect(extractPlanSteps({ steps: '1. 看表\n2. 出图' })).toEqual(['看表', '出图'])
    expect(extractPlanSteps({ steps: ['A', { text: 'B' }, { title: 'C' }] })).toEqual(['A', 'B', 'C'])
  })

  it('同一工具连续失败 → 注入停止空转提示', async () => {
    const rounds: ChatPayload[] = []
    const post = async (p: ChatPayload) => {
      rounds.push(p)
      if (p.messages.some((m) => m.role === 'system' && String(m.content ?? '').includes('已达到最大工具调用轮数'))) {
        return sseOf({ content: '收尾' })
      }
      const tools = p.messages.filter((m) => m.role === 'tool')
      if (!tools.length) return sseOf({ toolCalls: [call('submit_plan', { steps: ['配图', '总结'] })] })
      if (p.messages.some((m) => m.role === 'system' && String(m.content ?? '').includes('停止空转'))) {
        return sseOf({
          toolCalls: [call('mark_step_done', { index: 0 }, 'd0'), call('mark_step_done', { index: 1 }, 'd1')],
        })
      }
      if (tools.some((m) => m.name === 'mark_step_done')) {
        return sseOf({ content: '完成' })
      }
      return sseOf({
        toolCalls: [call('set_chart_config', { tableId: 't', viewId: 'v', configure: { x: { field: 'bad' } } })],
      })
    }
    const exec: ToolExecutor = async () => ({ ok: false, summary: '图表映射校验未通过' })
    await runAgent({
      messages: [{ role: 'user', content: '出图' }],
      tools: [],
      exec,
      maxIterations: 20,
      onEvent: () => {},
      postChatFn: post,
    })
    const spun = rounds.some((r) =>
      r.messages.some((m) => m.role === 'system' && String(m.content ?? '').includes('停止空转')),
    )
    expect(spun).toBe(true)
  })

  it('delegate_analysis_worker：分析师落地工具后摘要回灌主循环', async () => {
    const post = async (p: ChatPayload) => {
      const isWorker = p.messages.some(
        (m) => m.role === 'system' && typeof m.content === 'string' && m.content.includes('分析师'),
      )
      if (isWorker) {
        const tools = p.messages.filter((m) => m.role === 'tool')
        if (!tools.length) return sseOf({ toolCalls: [call('add_join_step', { leftTableId: 'a' }, 'w_join')] })
        return sseOf({ content: '已 Join 产出表 j1' })
      }
      const n = p.messages.filter((m) => m.role === 'tool').length
      if (n === 0) {
        return sseOf({ toolCalls: [call('delegate_analysis_worker', { goal: '把两表 join 后出图' }, 'd_an')] })
      }
      return sseOf({ content: '主循环收工' })
    }
    const exec: ToolExecutor = async (c) => {
      if (c.function.name === 'add_join_step') return { ok: true, summary: '已创建 Join' }
      return { ok: true, summary: 'x' }
    }
    const messages = await runAgent({
      messages: [{ role: 'user', content: 'join' }],
      tools: OPENAI_TOOLS,
      exec,
      maxIterations: 8,
      planGate: false,
      onEvent: () => undefined,
      postChatFn: post,
    })
    const workerResult = messages.find((m) => m.role === 'tool' && m.name === 'delegate_analysis_worker')
    expect(workerResult?.content).toContain('分析师')
    expect(workerResult?.content).toContain('Join')
  })

  it('delegate_code_worker：工程师写 Custom Code 后摘要回灌', async () => {
    const post = async (p: ChatPayload) => {
      const isWorker = p.messages.some(
        (m) => m.role === 'system' && typeof m.content === 'string' && m.content.includes('工程师'),
      )
      if (isWorker) {
        const tools = p.messages.filter((m) => m.role === 'tool')
        if (!tools.length) {
          return sseOf({ toolCalls: [call('add_custom_code_step', { tableId: 't' }, 'w_cc')] })
        }
        return sseOf({ content: '已写清洗脚本，step id 就绪' })
      }
      const n = p.messages.filter((m) => m.role === 'tool').length
      if (n === 0) {
        return sseOf({ toolCalls: [call('delegate_code_worker', { goal: '清洗 IC50' }, 'd_code')] })
      }
      return sseOf({ content: '主循环完成' })
    }
    const exec: ToolExecutor = async (c) => {
      if (c.function.name === 'add_custom_code_step') return { ok: true, summary: '已创建 Custom Code' }
      return { ok: true, summary: 'x' }
    }
    const messages = await runAgent({
      messages: [{ role: 'user', content: 'code' }],
      tools: OPENAI_TOOLS,
      exec,
      maxIterations: 8,
      planGate: false,
      onEvent: () => undefined,
      postChatFn: post,
    })
    const workerResult = messages.find((m) => m.role === 'tool' && m.name === 'delegate_code_worker')
    expect(workerResult?.content).toContain('工程师')
    expect(workerResult?.content).toContain('清洗')
  })
})
