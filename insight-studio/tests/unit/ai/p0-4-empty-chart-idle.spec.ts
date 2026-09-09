import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import {
  clearAllPendingEmptyChartViews,
  hasChartConfigurePayload,
  sameTurnHasCompleteChartConfigure,
  sweepPendingEmptyChartViews,
  trackPendingEmptyChartView,
} from '../../../src/modules/ai/emptyChartViews'
import { execTool } from '../../../src/modules/ai/tools/impl'
import { createEmptyAnalysis, createTable, createViewNode } from '../../../src/shared/factories'
import { useAnalysisStore } from '../../../src/stores/analysisStore'
import { runAgent, type AgentEvent, type ToolExecutor } from '../../../src/modules/ai/agentLoop'
import type { ChatPayload, ToolCall } from '../../../src/modules/ai/client'
import { makeOnEvent, type UiMessage } from '../../../src/modules/ai/aiStore'
import { analysisPathForArtifact, latestOpenableWorkspaceArtifact } from '../../../src/modules/ai/openArtifact'
import type { Artifact } from '../../../src/modules/ai/types'

const ctx = { confirmDestructive: false, confirmWrite: false }

async function seedIris() {
  const store = useAnalysisStore()
  const analysis = createEmptyAnalysis('P0-4')
  const iris = createTable(
    'iris',
    [
      { field: 'sepal_length', title: 'sepal_length', dataType: 'number' },
      { field: 'sepal_width', title: 'sepal_width', dataType: 'number' },
      { field: 'species', title: 'species', dataType: 'string' },
    ],
    [
      { sepal_length: 5.1, sepal_width: 3.5, species: 'setosa' },
      { sepal_length: 4.9, sepal_width: 3.0, species: 'setosa' },
    ],
  )
  analysis.tables.push(iris)
  store.$patch({ current: analysis, dirty: false, selected: null, mode: 'workspace' })
  return { analysis, iris }
}

function sseOf(payload: { toolCalls?: ToolCall[]; content?: string }): Response {
  const delta: Record<string, unknown> = { role: 'assistant' }
  if (payload.toolCalls) delta.tool_calls = payload.toolCalls.map((c, i) => ({ index: i, ...c }))
  if (payload.content) delta.content = payload.content
  const body = `data: ${JSON.stringify({ choices: [{ index: 0, delta, finish_reason: 'stop' }] })}\n\ndata: [DONE]\n\n`
  return new Response(new ReadableStream({ start: (c) => { c.enqueue(new TextEncoder().encode(body)); c.close() } }))
}
function call(name: string, args: Record<string, unknown>, id = `call_${name}`): ToolCall {
  return { id, type: 'function', function: { name, arguments: JSON.stringify(args) } }
}

describe('P0-4 empty chart gate + idle', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    clearAllPendingEmptyChartViews()
  })

  it('hasChartConfigurePayload / sameTurnHasCompleteChartConfigure', () => {
    expect(hasChartConfigurePayload({})).toBe(false)
    expect(hasChartConfigurePayload({ configure: { x: { field: 'a' } } })).toBe(true)
    expect(hasChartConfigurePayload({ x_field: 'a' })).toBe(true)
    expect(sameTurnHasCompleteChartConfigure([{ name: 'set_chart_config' }])).toBe(false)
    expect(
      sameTurnHasCompleteChartConfigure([
        { name: 'set_chart_config', args: { configure: { x: { field: 'a' }, values: [{ field: 'b' }] } } },
      ]),
    ).toBe(true)
  })

  it('裸 create_view(chart) 拒绝且不留空图', async () => {
    const { iris } = await seedIris()
    const before = iris.views.length
    const bare = await execTool('create_view', { tableId: iris.id, type: 'scatter', name: '空散点链' }, ctx)
    expect(bare.ok).toBe(false)
    expect(bare.summary).toMatch(/create_chart|configure|空图/i)
    expect(iris.views.length).toBe(before)
    expect(iris.views.some((v) => v.name === '空散点链')).toBe(false)
  })

  it('同轮 set_chart_config 无 configure 载荷时 create_view(chart) 仍拒绝', async () => {
    const { iris } = await seedIris()
    const res = await execTool(
      'create_view',
      {
        tableId: iris.id,
        type: 'scatter',
        name: '假同轮',
        __remainingTurnCalls: [{ name: 'set_chart_config' }],
      },
      ctx,
    )
    expect(res.ok).toBe(false)
    expect(iris.views.some((v) => v.name === '假同轮')).toBe(false)
  })

  it('同轮壳 + set_chart_config 失败 → 删除空图，工作区不残留', async () => {
    const { iris } = await seedIris()
    const created = await execTool(
      'create_view',
      {
        tableId: iris.id,
        type: 'scatter',
        name: '半成品散点',
        __remainingTurnCalls: [
          {
            name: 'set_chart_config',
            args: { configure: { x: { field: 'nope' }, values: [{ field: 'sepal_width' }] } },
          },
        ],
      },
      ctx,
    )
    expect(created.ok, created.summary).toBe(true)
    const viewId = created.summary.match(/view id: ([0-9a-f-]+)/)?.[1]
    expect(viewId).toBeTruthy()
    expect(iris.views.some((v) => v.id === viewId)).toBe(true)

    const bad = await execTool(
      'set_chart_config',
      { tableId: iris.id, viewId, configure: { x: { field: 'nope' }, values: [{ field: 'sepal_width' }] } },
      ctx,
    )
    expect(bad.ok).toBe(false)
    expect(bad.summary).toMatch(/空图|已删除|create_chart/i)
    expect(iris.views.some((v) => v.id === viewId)).toBe(false)
  })

  it('plan 全部完成后强制 done（idle），并清理 pending 空图', async () => {
    const { analysis, iris } = await seedIris()
    const empty = createViewNode('scatter', '待清空散点')
    iris.views.push(empty)
    trackPendingEmptyChartView(empty.id)

    const evts: AgentEvent[] = []
    let n = 0
    const post = async (_p: ChatPayload) => {
      n += 1
      if (n === 1) return sseOf({ toolCalls: [call('submit_plan', { steps: ['出图'] })] })
      if (n === 2) return sseOf({ toolCalls: [call('mark_step_done', { index: 0 })] })
      return sseOf({ content: '不应再来' })
    }
    const exec: ToolExecutor = async (c, args) => {
      if (c.function.name === 'cleanup_empty_chart_views') {
        const removed = sweepPendingEmptyChartViews(analysis)
        return {
          ok: true,
          summary: removed.length ? `已删除 ${removed.length} 个空图：${removed.join('、')}` : '没有需要清理的空图',
        }
      }
      if (c.function.name === 'cleanup_failed_ai_steps') {
        return { ok: true, summary: '没有需要清理的失败空节点' }
      }
      return { ok: true, summary: `已执行 ${c.function.name}` }
    }

    await runAgent({
      messages: [{ role: 'user', content: 'hi' }],
      tools: [],
      exec,
      maxIterations: 8,
      onEvent: (e) => evts.push(e),
      postChatFn: post,
    })

    expect(evts.some((e) => e.type === 'done' && e.content.includes('计划已全部完成'))).toBe(true)
    expect(n).toBe(2)
    expect(iris.views.some((v) => v.id === empty.id)).toBe(false)
  })

  it('makeOnEvent done 立刻结束 streaming（离开「正在生成」）', () => {
    const assistant: UiMessage = {
      id: 'a1',
      role: 'assistant',
      content: '',
      trace: [{ id: 't1', name: 'create_chart', args: {}, running: true, summary: '' }],
      artifacts: [],
      streaming: true,
      at: Date.now(),
    }
    const onEvent = makeOnEvent(assistant, () => undefined)
    onEvent({ type: 'done', content: '计划已全部完成。' })
    expect(assistant.streaming).toBe(false)
    expect(assistant.trace.every((t) => t.running === false)).toBe(true)
    expect(assistant.content).toContain('计划已全部完成')
  })

  it('auto-open：优先图表，其次表产物路径', () => {
    const tableArt: Artifact = {
      kind: 'table',
      name: '汇总表',
      analysisId: 'a1',
      tableId: 't1',
    }
    const chartArt: Artifact = {
      kind: 'view',
      name: '散点',
      analysisId: 'a1',
      tableId: 't1',
      viewId: 'v1',
      viewType: 'scatter',
    }
    expect(analysisPathForArtifact(tableArt)).toBe('/analysis/a1?tableId=t1')
    expect(analysisPathForArtifact(chartArt)).toBe('/analysis/a1?tableId=t1&viewId=v1')
    expect(latestOpenableWorkspaceArtifact([tableArt, chartArt])?.viewId).toBe('v1')
    expect(latestOpenableWorkspaceArtifact([tableArt])?.kind).toBe('table')
  })
})
