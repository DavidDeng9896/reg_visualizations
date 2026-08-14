import type { AgentEvent } from '../../insight-studio/src/modules/ai/agentLoop'
import type { ToolExecResult } from '../../insight-studio/src/modules/ai/agentLoop'
import { execTool, type ToolCtx } from '../../insight-studio/src/modules/ai/tools/execCore'
import { runWithWorkspaceAsync } from '../../insight-studio/src/modules/ai/tools/workspace'
import { goRequestContext } from './fetchPatch.ts'
import { readyHttpWorkspace } from './httpWorkspace.ts'
import type { SessionRuntime } from './runtime.ts'

export type MockScenario = 'scatter' | 'delete' | 'ask' | 'pipeline' | 'quota' | 'abort' | 'generic'

export function detectMockScenario(text: string, prev?: string): MockScenario {
  if (/续跑检查点|从断点继续/.test(text) && prev) return prev as MockScenario
  if (/删除/.test(text)) return 'delete'
  if (/管道|Join|hits/.test(text)) return 'pipeline'
  if (/先看表再收尾|日配额/.test(text)) return 'quota'
  if (/看表再出图/.test(text)) return 'abort'
  if (/配一个散点图|着色分组/.test(text)) return 'ask'
  if (/散点|拟合|Weight-length/.test(text)) return 'scatter'
  return 'generic'
}

function extract(re: RegExp, text: string, label: string): string {
  const hit = text.match(re)
  if (!hit?.[1]) throw new Error(`mock 未找到 ${label}：${text.slice(0, 240)}`)
  return hit[1]
}

function tableIdOf(summary: string, name: string): string {
  return extract(new RegExp(`${name}（id: ([0-9a-f-]{8,})`), summary, `表 ${name}`)
}

async function emitToolCall(
  emit: (e: AgentEvent) => Promise<void>,
  id: string,
  name: string,
  args: Record<string, unknown>,
): Promise<void> {
  await emit({
    type: 'tool_call',
    running: true,
    call: {
      id,
      type: 'function',
      function: { name, arguments: JSON.stringify(args) },
    },
  })
}

async function runPlatformTool(
  runtime: SessionRuntime,
  emit: (e: AgentEvent) => Promise<void>,
  name: string,
  args: Record<string, unknown>,
  id: string,
): Promise<ToolExecResult> {
  if (runtime.aborted) throw new DOMException('已中止', 'AbortError')
  await emitToolCall(emit, id, name, args)
  const ctx: ToolCtx = {
    confirmDestructive: runtime.confirmDestructive,
    confirmWrite: runtime.confirmWrite,
  }
  const ws = await readyHttpWorkspace({
    analysisId: runtime.analysisId,
    sqlConnections: runtime.sqlConnections,
  })
  const result = await goRequestContext.run({ userId: runtime.userId }, () =>
    runWithWorkspaceAsync(ws, () => execTool(name, args, ctx)),
  )
  if (result.artifact?.analysisId) runtime.analysisId = result.artifact.analysisId
  else if (ws.current) runtime.analysisId = ws.current.id

  if (result.needsConfirmation) {
    const decision = await runtime.waitConfirm({ id, name, summary: result.summary })
    if (runtime.aborted || decision === 'reject') {
      await emit({ type: 'tool_result', id, name, ok: false, summary: '用户已拒绝执行该操作' })
      return { ok: false, summary: '用户已拒绝执行该操作' }
    }
    const confirmed = await goRequestContext.run({ userId: runtime.userId }, () =>
      runWithWorkspaceAsync(ws, () => execTool(name, { ...args, __confirmed: true }, ctx)),
    )
    if (confirmed.artifact?.analysisId) runtime.analysisId = confirmed.artifact.analysisId
    await emit({
      type: 'tool_result',
      id,
      name,
      ok: confirmed.ok,
      summary: confirmed.summary,
      artifact: confirmed.artifact,
      needsConfirmation: false,
    })
    return confirmed
  }

  await emit({
    type: 'tool_result',
    id,
    name,
    ok: result.ok,
    summary: result.summary,
    artifact: result.artifact,
    needsConfirmation: false,
  })
  return result
}

async function submitPlan(runtime: SessionRuntime, emit: (e: AgentEvent) => Promise<void>, steps: string[], id: string) {
  await emitToolCall(emit, id, 'submit_plan', { steps })
  runtime.planSteps = steps
  runtime.planDone = []
  await emit({ type: 'plan', steps })
  await emit({ type: 'tool_result', id, name: 'submit_plan', ok: true, summary: `已提交 ${steps.length} 步计划` })
}

async function markDone(runtime: SessionRuntime, emit: (e: AgentEvent) => Promise<void>, index: number, id: string) {
  await emitToolCall(emit, id, 'mark_step_done', { index })
  if (!runtime.planDone.includes(index)) runtime.planDone.push(index)
  await emit({ type: 'step_done', index })
  await emit({ type: 'tool_result', id, name: 'mark_step_done', ok: true, summary: `已完成步骤 ${index}` })
}

function sleep(ms: number, runtime: SessionRuntime): Promise<void> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => {
      if (runtime.aborted) reject(new DOMException('已中止', 'AbortError'))
      else resolve()
    }, ms)
    const check = setInterval(() => {
      if (!runtime.aborted) return
      clearTimeout(t)
      clearInterval(check)
      reject(new DOMException('已中止', 'AbortError'))
    }, 50)
    setTimeout(() => clearInterval(check), ms + 20)
  })
}

let seq = 0
const nextId = (name: string) => `call_${name}_${++seq}`

/** 无 LLM 的脚本编排：真实执行平台工具，事件协议与生产 dsh 一致（供 e2e / 本地联调）。 */
export async function runMockTurn(
  text: string,
  runtime: SessionRuntime,
  emit: (e: AgentEvent) => Promise<void>,
): Promise<void> {
  const scenario = detectMockScenario(text, runtime.scenario)
  runtime.scenario = scenario
  runtime.aborted = false

  if (/续跑检查点|从断点继续/.test(text)) {
    if (scenario === 'quota') {
      await markDone(runtime, emit, 0, nextId('mark_step_done'))
      await markDone(runtime, emit, 1, nextId('mark_step_done'))
      await emit({ type: 'done', content: '已从检查点续跑完成。' })
      return
    }
    if (scenario === 'abort') {
      await emit({ type: 'done', content: '中止后续跑已完成。' })
      return
    }
    await emit({ type: 'done', content: '已从检查点续跑完成。' })
    return
  }

  if (scenario === 'scatter') {
    await submitPlan(runtime, emit, ['查看当前表结构', '创建散点视图并配置映射', '加线性拟合与拟合注释'], nextId('submit_plan'))
    const listed = await runPlatformTool(runtime, emit, 'list_tables', {}, nextId('list_tables'))
    const tableId = tableIdOf(listed.summary, 'Weight-length study')
    const created = await runPlatformTool(
      runtime,
      emit,
      'create_view',
      { tableId, type: 'scatter', name: 'AI 散点分析' },
      nextId('create_view'),
    )
    const viewId = extract(/view id: ([0-9a-f-]+)/i, created.summary, 'view id')
    await runPlatformTool(
      runtime,
      emit,
      'set_chart_config',
      {
        tableId,
        viewId,
        chartType: 'scatter',
        configure: { x: { field: 'weight_kg' }, values: [{ field: 'length_cm' }], regression: { model: 'linear' } },
        style: { fitAnnotation: true },
      },
      nextId('set_chart_config'),
    )
    await markDone(runtime, emit, 0, nextId('mark_step_done'))
    await markDone(runtime, emit, 1, nextId('mark_step_done'))
    await markDone(runtime, emit, 2, nextId('mark_step_done'))
    await emit({ type: 'reasoning', text: '用户要散点图与拟合，我已按步骤完成视图创建与配置。' })
    await emit({
      type: 'done',
      content:
        '已完成：\n- 查看了当前表结构\n- 创建了散点视图「AI 散点分析」并配置 X=weight_kg、Y=length_cm\n- 加了线性拟合与拟合注释\n\n产物已在下方卡片中，可直接点击打开继续编辑。',
    })
    return
  }

  if (scenario === 'delete') {
    const listed = await runPlatformTool(runtime, emit, 'list_tables', {}, nextId('list_tables'))
    const tableId = tableIdOf(listed.summary, 'Iris measurements')
    await runPlatformTool(runtime, emit, 'delete_table', { tableId }, nextId('delete_table'))
    await emit({ type: 'done', content: '已按您的确认删除表，任务完成。' })
    return
  }

  if (scenario === 'ask') {
    await runPlatformTool(runtime, emit, 'list_tables', {}, nextId('list_tables'))
    const askId = nextId('ask_user')
    await emitToolCall(emit, askId, 'ask_user', {
      question: '散点图按哪个字段着色分组？',
      options: ['按 species 分组', '按 batch 分组', '不着色'],
      allowOther: true,
    })
    const answer = await runtime.waitAsk({
      id: askId,
      question: '散点图按哪个字段着色分组？',
      options: ['按 species 分组', '按 batch 分组', '不着色'],
      allowOther: true,
    })
    await emit({ type: 'tool_result', id: askId, name: 'ask_user', ok: true, summary: answer })
    await emit({ type: 'done', content: '收到，按你的选择继续配置图表。' })
    return
  }

  if (scenario === 'pipeline') {
    await submitPlan(runtime, emit, ['导入并过滤', 'Join 与派生列', '报告与出图', '放到看板'], nextId('submit_plan'))
    await runPlatformTool(
      runtime,
      emit,
      'import_csv_text',
      { tableName: 'hits', csv: 'id,score\n1,10\n2,1\n3,8' },
      nextId('import_csv_text'),
    )
    await runPlatformTool(
      runtime,
      emit,
      'import_csv_text',
      { tableName: 'meta', csv: 'id,batch\n1,A\n2,B\n3,A' },
      nextId('import_csv_text'),
    )
    const listed = await runPlatformTool(runtime, emit, 'list_tables', {}, nextId('list_tables'))
    const hitsId = tableIdOf(listed.summary, 'hits')
    const metaId = tableIdOf(listed.summary, 'meta')
    const filtered = await runPlatformTool(
      runtime,
      emit,
      'add_filter_step',
      { tableId: hitsId, conditions: [{ column: 'score', operator: 'gt', value: 5 }] },
      nextId('add_filter_step'),
    )
    const filterTable = extract(/产出表 id: ([0-9a-f-]+)/, filtered.summary, 'filter 表')
    const joined = await runPlatformTool(
      runtime,
      emit,
      'add_join_step',
      {
        leftTableId: filterTable,
        rightTableId: metaId,
        joinType: 'inner',
        keys: [{ left: 'id', right: 'id' }],
      },
      nextId('add_join_step'),
    )
    const joinTable = extract(/产出表 id: ([0-9a-f-]+)/, joined.summary, 'join 表')
    const computed = await runPlatformTool(
      runtime,
      emit,
      'add_computed_column_step',
      { tableId: joinTable, name: 'score2', expression: 'score * 2' },
      nextId('add_computed_column_step'),
    )
    const computedTable = extract(/产出表 id: ([0-9a-f-]+)/, computed.summary, 'computed 表')
    const hidden = await runPlatformTool(
      runtime,
      emit,
      'add_hide_columns_step',
      { tableId: computedTable, columns: ['batch'] },
      nextId('add_hide_columns_step'),
    )
    const hideTable = extract(/产出表 id: ([0-9a-f-]+)/, hidden.summary, 'hide 表')
    await runPlatformTool(runtime, emit, 'create_report_step', { name: '管道报告' }, nextId('create_report_step'))
    const view = await runPlatformTool(
      runtime,
      emit,
      'create_view',
      { tableId: hideTable, type: 'bar', name: '管道柱状' },
      nextId('create_view'),
    )
    const viewId = extract(/view id: ([0-9a-f-]+)/i, view.summary, 'view id')
    await runPlatformTool(
      runtime,
      emit,
      'set_chart_config',
      { viewId, configure: { x: { field: 'id' }, y: { field: 'score', aggregation: 'sum' } } },
      nextId('set_chart_config'),
    )
    const dash = await runPlatformTool(
      runtime,
      emit,
      'create_dashboard',
      { name: '管道看板' },
      nextId('create_dashboard'),
    )
    const dashboardId = extract(/id: ([0-9a-f-]+)/, dash.summary, '看板 id')
    await runPlatformTool(
      runtime,
      emit,
      'add_dashboard_widget',
      {
        dashboardId,
        analysisId: runtime.analysisId,
        tableId: hideTable,
        viewId,
      },
      nextId('add_dashboard_widget'),
    )
    await markDone(runtime, emit, 0, nextId('mark_step_done'))
    await markDone(runtime, emit, 1, nextId('mark_step_done'))
    await markDone(runtime, emit, 2, nextId('mark_step_done'))
    await markDone(runtime, emit, 3, nextId('mark_step_done'))
    await emit({ type: 'done', content: '管道已完成：过滤、Join、派生列、报告、柱状图与看板均已落地。' })
    return
  }

  if (scenario === 'quota') {
    await submitPlan(runtime, emit, ['看表', '收尾'], nextId('submit_plan'))
    await runPlatformTool(runtime, emit, 'list_tables', {}, nextId('list_tables'))
    await emit({
      type: 'error',
      message: '模型日配额已用尽（502）：token per day limit reached: current: 1509374, limit: 1500000。请明天再试或更换 Key；继续任务不会自动重试。',
    })
    return
  }

  if (scenario === 'abort') {
    await submitPlan(runtime, emit, ['看表', '出图'], nextId('submit_plan'))
    await sleep(8_000, runtime)
    await runPlatformTool(runtime, emit, 'list_tables', {}, nextId('list_tables'))
    await emit({ type: 'done', content: '已看表。' })
    return
  }

  await runPlatformTool(runtime, emit, 'list_tables', {}, nextId('list_tables'))
  await emit({ type: 'done', content: '已处理。' })
}
