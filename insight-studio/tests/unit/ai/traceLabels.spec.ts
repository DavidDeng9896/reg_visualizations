import { describe, expect, it } from 'vitest'
import { briefOpLabel, fullArgs, fullSummary } from '../../../src/modules/ai/traceLabels'
import type { TraceItem } from '../../../src/modules/ai/aiStore'

function item(partial: Partial<TraceItem> & Pick<TraceItem, 'id' | 'name'>): TraceItem {
  return { summary: '', ...partial }
}

describe('traceLabels', () => {
  it('briefOpLabel：内置工具给出精简中文', () => {
    expect(briefOpLabel(item({ id: '1', name: 'get_table_schema', args: { tableId: 'abc-123' } }))).toContain(
      '查看表结构',
    )
    expect(briefOpLabel(item({ id: '2', name: 'create_view', args: { type: 'bar', name: '负载分布' } }))).toContain(
      'bar',
    )
    expect(briefOpLabel(item({ id: '3', name: 'delegate_mcp_worker', args: { goal: '拉取工单详情' } }))).toContain(
      '拉取工单详情',
    )
  })

  it('briefOpLabel：MCP 工单类给出业务语义', () => {
    expect(briefOpLabel(item({ id: '4', name: 'mcp_jira_get_issue', args: { issueKey: 'PROJ-12' } }))).toBe(
      '拉取工单详情 PROJ-12',
    )
    expect(briefOpLabel(item({ id: '4b', name: 'mcp_jira_search_issues', args: { jql: 'status=Open' } }))).toContain(
      '搜索工单',
    )
  })

  it('fullArgs / fullSummary：展开不截断', () => {
    const long = '结果'.repeat(200)
    const t = item({
      id: '5',
      name: 'list_tables',
      args: { analysisId: 'a1', extra: { nested: true } },
      summary: long,
    })
    expect(fullArgs(t)).toContain('"analysisId"')
    expect(fullArgs(t)).toContain('"nested"')
    expect(fullSummary(t)).toBe(long)
  })
})
