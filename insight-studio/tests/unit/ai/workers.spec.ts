import { describe, expect, it } from 'vitest'
import { workerOnlyExplored, WORKER_SPECS } from '../../../src/modules/ai/tools/workers'
import type { ChatMessage } from '../../../src/modules/ai/client'

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
  it('分析工人白名单含 custom code 与出图', () => {
    const allow = WORKER_SPECS.delegate_analysis_worker.allowBuiltin
    expect(allow).toContain('add_custom_code_step')
    expect(allow).toContain('update_custom_code_step')
    expect(allow).toContain('create_view')
    expect(allow).toContain('set_chart_config')
  })
})
