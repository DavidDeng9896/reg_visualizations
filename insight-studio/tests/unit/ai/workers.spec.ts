import { describe, expect, it } from 'vitest'
import {
  workerOnlyExplored,
  WORKER_SPECS,
  extractParentContextForWorker,
} from '../../../src/modules/ai/tools/workers'
import type { ChatMessage } from '../../../src/modules/ai/client'
import { CONTEXT_HEADER } from '../../../src/modules/ai/prompts'

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
