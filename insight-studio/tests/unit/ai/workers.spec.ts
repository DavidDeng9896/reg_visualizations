import { describe, expect, it } from 'vitest'
import {
  workerOnlyExplored,
  WORKER_SPECS,
  extractParentContextForWorker,
  runDelegateWorker,
} from '../../../src/modules/ai/tools/workers'
import type { ChatMessage, ChatPayload, ToolCall } from '../../../src/modules/ai/client'
import { CONTEXT_HEADER } from '../../../src/modules/ai/prompts'
import { OPENAI_TOOLS } from '../../../src/modules/ai/tools/registry'

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

describe('workerOnlyExplored', () => {
  it('无工具视为仅探路', () => {
    expect(workerOnlyExplored([{ role: 'user', content: 'x' }])).toBe(true)
  })

  it('仅 schema/list 视为仅探路', () => {
    const msgs: ChatMessage[] = [
      { role: 'tool', name: 'get_table_schema', content: 'cols', tool_call_id: '1' },
      { role: 'tool', name: 'list_tables', content: 't', tool_call_id: '2' },
    ]
    expect(workerOnlyExplored(msgs)).toBe(true)
  })

  it('有落地工具则不算仅探路', () => {
    const msgs: ChatMessage[] = [
      { role: 'tool', name: 'get_table_schema', content: 'cols', tool_call_id: '1' },
      { role: 'tool', name: 'add_custom_code_step', content: 'ok', tool_call_id: '2' },
    ]
    expect(workerOnlyExplored(msgs)).toBe(false)
  })
})

describe('WORKER_SPECS analysis', () => {
  it('分析师白名单含 custom code 与出图，且轮数充足', () => {
    const spec = WORKER_SPECS.delegate_analysis_worker
    expect(spec.role).toBe('分析师')
    expect(WORKER_SPECS.delegate_skill_worker.role).toBe('规划师')
    expect(WORKER_SPECS.delegate_mcp_worker.role).toBe('MCP 专家')
    expect(WORKER_SPECS.delegate_code_worker.role).toBe('工程师')
    expect(spec.allowBuiltin).toContain('add_custom_code_step')
    expect(spec.allowBuiltin).toContain('update_custom_code_step')
    expect(spec.allowBuiltin).toContain('create_view')
    expect(spec.allowBuiltin).toContain('set_chart_config')
    expect(spec.maxIterations).toBeGreaterThanOrEqual(30)
  })
})

describe('extractParentContextForWorker', () => {
  it('提取工作区上下文与主循环工具摘要', () => {
    const ctx = extractParentContextForWorker([
      { role: 'system', content: `${CONTEXT_HEADER}\n当前分析：细胞传代` },
      { role: 'user', content: '做生长曲线' },
      { role: 'tool', name: 'get_table_schema', content: 'field=天数', tool_call_id: '1' },
      { role: 'tool', name: 'delegate_analysis_worker', content: '旧分析师摘要', tool_call_id: '2' },
    ])
    expect(ctx).toContain('当前分析：细胞传代')
    expect(ctx).toContain('get_table_schema')
    expect(ctx).toContain('field=天数')
    expect(ctx).not.toContain('旧分析师摘要')
  })
})

describe('runDelegateWorker 工具过滤', () => {
  it('分析师请求里没有删除工具，且能落地 filter', async () => {
    const seen: string[][] = []
    const post = async (p: ChatPayload) => {
      seen.push((p.tools ?? []).map((t) => (t as { function: { name: string } }).function.name))
      const n = p.messages.filter((m) => m.role === 'tool').length
      if (n === 0) return sseOf({ toolCalls: [call('add_filter_step', { tableId: 't1' })] })
      return sseOf({ content: '已过滤 setosa' })
    }
    const res = await runDelegateWorker({
      workerName: 'delegate_analysis_worker',
      goal: '过滤 iris',
      parentTools: OPENAI_TOOLS,
      parent: {
        exec: async () => ({ ok: true, summary: '已创建过滤步骤' }),
        postChatFn: post,
      },
    })
    expect(res.ok, res.summary).toBe(true)
    expect(res.summary).toContain('分析师')
    expect(seen[0]).toContain('add_join_step')
    expect(seen[0]).not.toContain('delete_table')
    expect(seen[0]).not.toContain('delegate_code_worker')
  })

  it('MCP 专家无 mcp 工具时直接失败', async () => {
    const res = await runDelegateWorker({
      workerName: 'delegate_mcp_worker',
      goal: '查外部系统',
      parentTools: OPENAI_TOOLS,
      parent: {
        exec: async () => ({ ok: true, summary: 'x' }),
        postChatFn: async () => sseOf({ content: '不应发请求' }),
      },
    })
    expect(res.ok).toBe(false)
    expect(res.summary).toContain('无可用 MCP')
  })

  it('MCP 专家只看到 mcp_* 并调用后摘要回灌', async () => {
    const seen: string[][] = []
    const mcpTools = [
      {
        type: 'function' as const,
        function: { name: 'mcp_search', description: 'search', parameters: { type: 'object', properties: {} } },
      },
    ]
    const post = async (p: ChatPayload) => {
      seen.push((p.tools ?? []).map((t) => (t as { function: { name: string } }).function.name))
      const n = p.messages.filter((m) => m.role === 'tool').length
      if (n === 0) return sseOf({ toolCalls: [call('mcp_search', { q: 'x' })] })
      return sseOf({ content: '查到 2 条' })
    }
    const res = await runDelegateWorker({
      workerName: 'delegate_mcp_worker',
      goal: '搜索',
      parentTools: [...OPENAI_TOOLS, ...mcpTools],
      parent: {
        exec: async () => ({ ok: true, summary: 'hits' }),
        postChatFn: post,
      },
    })
    expect(res.ok, res.summary).toBe(true)
    expect(res.summary).toContain('MCP 专家')
    expect(seen[0]).toEqual(['mcp_search'])
  })
})
