/**
 * Agent 工具实现：操作 analysisStore / dashboardStore / repository。
 * 返回 ToolExecResult；危险操作支持「需确认」模式（前端确认后带 __confirmed 重放）。
 */
import Papa from 'papaparse'
import type { Analysis, AnalysisTable, ChartConfig, DashboardWidget, Filter, Row, StepNode, StepType } from '../../../shared/types'
import { createEmptyAnalysis, createTable, createViewNode, defaultViewName, createDashboard, createDashboardWidget, sealRows } from '../../../shared/factories'
import { uuid } from '../../../shared/id'
import { analysisRepository } from '../../../shared/repository'
import { dashboardRepository } from '../../../shared/dashboardRepository'
import { findTable, findView, findViewParent, findCombineDependents } from '../../../shared/tree'
import { inferColumnTypes } from '../../table/csv'
import { validateChartMapping } from '../../charts/registry'
import { runStep, runStepAsync } from '../../steps/exec'
import { createStepNode } from '../../steps/factory'
import { CUSTOM_CODE_DEFAULT_TEMPLATE } from '../../steps/customCodeTemplate'
import { rerunStaleSteps, hasStaleSteps } from '../../steps/rerun'
import { useAnalysisStore } from '../../../stores/analysisStore'
import { useDashboardStore } from '../../../stores/dashboardStore'
import type { ToolExecResult } from '../agentLoop'
import type { Artifact } from '../types'
import { aiSkillsApi, aiMemoriesApi } from '../client'

export interface ToolCtx {
  confirmDestructive: boolean
}

function ok(summary: string, artifact?: Artifact): ToolExecResult {
  return { ok: true, summary, artifact }
}
function fail(summary: string): ToolExecResult {
  return { ok: false, summary }
}
function needConfirm(action: string): ToolExecResult {
  return {
    ok: false,
    needsConfirmation: true,
    summary: `NEEDS_CONFIRMATION: ${action}。界面已出现确认按钮；会话会挂起等待用户批准，批准后自动继续，不要重试该危险操作。`,
  }
}

function store() {
  return useAnalysisStore()
}
function dashStore() {
  return useDashboardStore()
}

function requireAnalysis(): Analysis {
  const a = store().current
  if (!a) throw new Error('当前没有打开的分析，请先用 create_analysis 或在工作区打开一个分析')
  return a
}

function requireTable(tableId: string): AnalysisTable {
  const t = findTable(requireAnalysis(), tableId)
  if (!t) throw new Error(`表不存在：${tableId}（可先用 list_tables 查看）`)
  return t
}

/** 找到产出某表的步骤（输入连线的上游）；源表缺产出步骤时补一个 upload-csv 源步骤（与 migrateSteps 同构）。 */
function producingStep(a: Analysis, tableId: string): StepNode {
  const t = findTable(a, tableId)
  if (!t) throw new Error(`表不存在：${tableId}（可先用 list_tables 查看）`)
  let step = t.stepId ? a.steps.find((s) => s.id === t.stepId) : undefined
  if (!step) {
    step = {
      id: uuid(),
      type: 'upload-csv',
      name: t.name,
      inputs: [],
      config: { tableName: t.name },
      status: 'configured',
      output: { tables: [t.id], files: [], views: [] },
    }
    t.source = 'step'
    t.stepId = step.id
    a.steps.push(step)
  }
  return step
}

/** 新建并执行一个产表步骤。 */
function appendStep(opts: {
  type: StepType
  name: string
  fromTableIds: string[]
  config: Record<string, unknown>
  portNames?: string[]
}): { step: StepNode; table: AnalysisTable } {
  let out: { step: StepNode; table: AnalysisTable } | null = null
  store().mutate((a) => {
    const inputs = opts.fromTableIds.map((tid, i) => {
      const up = producingStep(a, tid)
      const port = opts.portNames?.[i] ?? (opts.fromTableIds.length > 1 ? (i === 0 ? 'Left table' : 'Right table') : 'Input dataset')
      return { port, from: { nodeId: up.id, port: 'Output dataset' } }
    })
    const step: StepNode = {
      id: uuid(),
      type: opts.type,
      name: opts.name,
      inputs,
      config: opts.config,
      status: 'pending',
      output: { tables: [], files: [], views: [] },
    }
    a.steps.push(step)
    const result = runStep(a, step)
    if (result.status !== 'configured' || !result.outputTables?.length) {
      a.steps = a.steps.filter((s) => s.id !== step.id)
      throw new Error(result.error ?? '步骤执行失败')
    }
    out = { step, table: result.outputTables[0] }
  })
  if (!out) throw new Error('步骤执行失败')
  return out
}

function artifactOf(kind: Artifact['kind'], name: string, extra: Partial<Artifact> = {}): Artifact {
  const a = store().current
  return { kind, name, analysisId: a?.id, ...extra }
}

function toConditions(args: Record<string, unknown>): Filter[] {
  const list = Array.isArray(args.conditions) ? args.conditions : []
  if (!list.length) throw new Error('conditions 不能为空')
  return [
    {
      id: uuid(),
      combinator: 'and',
      conditions: list.map((c) => {
        const cond = c as { column?: string; operator?: string; value?: unknown; value2?: unknown }
        if (!cond.column || !cond.operator) throw new Error('过滤条件缺少 column/operator')
        return {
          id: uuid(),
          column: cond.column,
          operator: cond.operator as Filter['conditions'][number]['operator'],
          ...(cond.value !== undefined ? { value: cond.value as Filter['conditions'][number]['value'] } : {}),
          ...(cond.value2 !== undefined ? { value2: cond.value2 as Filter['conditions'][number]['value2'] } : {}),
        }
      }),
    },
  ]
}

/* ------------------------------- 各工具实现 ------------------------------- */

const impl: Record<string, (args: Record<string, unknown>, ctx: ToolCtx) => Promise<ToolExecResult> | ToolExecResult> = {
  async list_analyses() {
    const list = await analysisRepository.list()
    if (!list.length) return ok('平台还没有任何分析。')
    const lines = list.map((a) => `- ${a.name}（id: ${a.id}，${a.tables.length} 张表${a.project ? `，项目 ${a.project}` : ''}）`)
    return ok(`共 ${list.length} 个分析：\n${lines.join('\n')}`)
  },

  list_tables(args) {
    const a = args.analysisId ? null : store().current
    if (!a && !args.analysisId) return fail('未指定 analysisId 且当前没有打开的分析')
    const analysis = a ?? requireAnalysis()
    void args
    if (!analysis.tables.length) return ok('当前分析还没有表，可以用 import_csv_text 导入数据。')
    const lines = analysis.tables.map((t) => `- ${t.name}（id: ${t.id}，${t.rows.length} 行，${t.columns.length} 列${t.stepId ? '，步骤产出' : '，源表'}）`)
    return ok(`分析「${analysis.name}」的表：\n${lines.join('\n')}`)
  },

  get_table_schema(args) {
    const t = requireTable(String(args.tableId ?? ''))
    const cols = t.columns.map((c) => `${c.title}(${c.dataType})`).join('、')
    const sample = t.rows.slice(0, 5).map((r) => t.columns.map((c) => String(r[c.field] ?? '')).join(' | '))
    return ok(`表「${t.name}」（${t.rows.length} 行）：\n列：${cols}\n样例：\n${sample.join('\n')}`)
  },

  async create_analysis(args) {
    const name = String(args.name ?? '').trim()
    if (!name) return fail('name 不能为空')
    const a = createEmptyAnalysis(name, {
      project: typeof args.project === 'string' ? args.project : undefined,
      department: typeof args.department === 'string' ? args.department : undefined,
    })
    await analysisRepository.put(a)
    await store().load(a.id)
    return ok(`已创建并打开分析「${name}」（id: ${a.id}）`, artifactOf('analysis', name, { analysisId: a.id }))
  },

  import_csv_text(args) {
    const a = requireAnalysis()
    const tableName = String(args.tableName ?? '').trim() || '导入数据'
    const csv = String(args.csv ?? '')
    if (!csv.trim()) return fail('csv 内容为空')
    const parsed = Papa.parse<string[]>(csv.trim(), { skipEmptyLines: true })
    if (parsed.errors.length && parsed.data.length < 2) return fail(`CSV 解析失败：${parsed.errors[0]?.message ?? '格式错误'}`)
    const [headers, ...dataRows] = parsed.data as unknown as [string[], ...string[][]]
    if (!headers?.length) return fail('CSV 缺少表头')
    const columns = inferColumnTypes(headers, dataRows)
    const rows: Row[] = dataRows.map((cells) => {
      const row: Row = {}
      headers.forEach((h, i) => {
        const col = columns[i]
        row[h] = col && col.dataType === 'number' ? (Number(cells[i]) || null) : ((cells[i] ?? '') as string)
      })
      return row
    })
    const table = createTable(tableName, columns, sealRows(rows), 'demo')
    const step: StepNode = {
      id: uuid(),
      type: 'upload-csv',
      name: tableName,
      inputs: [],
      config: { tableName },
      status: 'configured',
      output: { tables: [table.id], files: [], views: [] },
    }
    table.stepId = step.id
    store().mutate((analysis) => {
      analysis.tables.push(table)
      analysis.steps.push(step)
    })
    return ok(
      `已导入表「${tableName}」（${rows.length} 行 × ${columns.length} 列）到分析「${a.name}」`,
      artifactOf('table', tableName, { tableId: table.id, stepId: step.id }),
    )
  },

  add_filter_step(args) {
    const t = requireTable(String(args.tableId ?? ''))
    const filters = toConditions(args)
    const { step, table } = appendStep({
      type: 'filter',
      name: `Filter table`,
      fromTableIds: [t.id],
      config: { filters },
    })
    return ok(`已创建过滤步骤（step id: ${step.id}，产出表 id: ${table.id}，${table.rows.length} 行）`, artifactOf('table', table.name, { tableId: table.id, stepId: step.id }))
  },

  add_join_step(args) {
    const left = requireTable(String(args.leftTableId ?? ''))
    const right = requireTable(String(args.rightTableId ?? ''))
    const joinType = String(args.joinType ?? 'left')
    const keys = (Array.isArray(args.keys) ? args.keys : []) as { left: string; right: string }[]
    if (!keys.length) return fail('keys 不能为空')
    const { step, table } = appendStep({
      type: 'join',
      name: `Join tables`,
      fromTableIds: [left.id, right.id],
      config: { joinType, keys, suffixes: ['_x', '_y'] },
    })
    return ok(`已创建 Join（step id: ${step.id}，产出表 id: ${table.id}，${table.rows.length} 行）`, artifactOf('table', table.name, { tableId: table.id, stepId: step.id }))
  },

  add_union_step(args) {
    const ids = (Array.isArray(args.tableIds) ? args.tableIds : []).map(String)
    if (ids.length < 2) return fail('tableIds 至少需要 2 张表')
    for (const id of ids) requireTable(id)
    const { step, table } = appendStep({
      type: 'union',
      name: `Union tables`,
      fromTableIds: ids,
      config: {},
      portNames: ids.map(() => 'Input tables'),
    })
    return ok(`已创建 Union（step id: ${step.id}，产出表 id: ${table.id}，${table.rows.length} 行）`, artifactOf('table', table.name, { tableId: table.id, stepId: step.id }))
  },

  add_computed_column_step(args) {
    const t = requireTable(String(args.tableId ?? ''))
    const name = String(args.name ?? '').trim()
    const expression = String(args.expression ?? '').trim()
    if (!name || !expression) return fail('name 与 expression 不能为空')
    const { step, table } = appendStep({
      type: 'computed-column',
      name: `Computed column`,
      fromTableIds: [t.id],
      config: { name, expression },
    })
    return ok(`已创建派生列「${name}」（step id: ${step.id}，产出表 id: ${table.id}）`, artifactOf('table', table.name, { tableId: table.id, stepId: step.id }))
  },

  add_hide_columns_step(args) {
    const t = requireTable(String(args.tableId ?? ''))
    const columns = (Array.isArray(args.columns) ? args.columns : []).map(String)
    if (!columns.length) return fail('columns 不能为空')
    const { step, table } = appendStep({
      type: 'hide-columns',
      name: `Hide columns`,
      fromTableIds: [t.id],
      config: { columns },
    })
    return ok(`已隐藏 ${columns.length} 列（step id: ${step.id}，产出表 id: ${table.id}，剩 ${table.columns.length} 列）`, artifactOf('table', table.name, { tableId: table.id, stepId: step.id }))
  },

  async add_custom_code_step(args) {
    const t = requireTable(String(args.tableId ?? ''))
    const code = typeof args.code === 'string' && args.code.trim() ? String(args.code) : CUSTOM_CODE_DEFAULT_TEMPLATE
    const name = typeof args.name === 'string' && args.name.trim() ? String(args.name).trim() : 'Custom code'
    let stepId = ''
    store().mutate((a) => {
      const up = producingStep(a, t.id)
      const step = createStepNode('custom-code', name)
      step.inputs = [{ port: 'Input datasets', from: { nodeId: up.id, port: 'Output dataset' } }]
      step.config.code = code
      a.steps.push(step)
      stepId = step.id
    })
    const a = requireAnalysis()
    const step = a.steps.find((s) => s.id === stepId)
    if (!step) return fail('创建 Custom Code 步骤失败')
    const result = await runStepAsync(a, step)
    store().mutate(() => {})
    if (result.status !== 'configured') {
      return fail(result.error ?? 'Custom Code 执行失败')
    }
    const outId = step.output.tables[0]
    const out = outId ? findTable(a, outId) : undefined
    const resultSummary = out
      ? `已创建 Custom Code「${step.name}」（step id: ${step.id}，产出表 id: ${out.id}，${out.rows.length} 行）`
      : `已创建 Custom Code「${step.name}」（step id: ${step.id}）`
    return ok(resultSummary, out ? artifactOf('table', out.name, { tableId: out.id, stepId: step.id }) : undefined)
  },

  async update_custom_code_step(args) {
    const a = requireAnalysis()
    const step = a.steps.find((s) => s.id === String(args.stepId ?? ''))
    if (!step || step.type !== 'custom-code') return fail('Custom Code 步骤不存在')
    store().mutate((analysis) => {
      const target = analysis.steps.find((s) => s.id === step.id)
      if (!target) return
      if (typeof args.code === 'string') target.config.code = args.code
      if (typeof args.name === 'string' && args.name.trim()) target.name = args.name.trim()
    })
    const latest = requireAnalysis().steps.find((s) => s.id === step.id)!
    const result = await runStepAsync(requireAnalysis(), latest)
    store().mutate(() => {})
    if (result.status !== 'configured') return fail(result.error ?? '执行失败')
    return ok(`已更新并执行 Custom Code「${latest.name}」`)
  },

  async run_step(args) {
    const a = requireAnalysis()
    const step = a.steps.find((s) => s.id === String(args.stepId ?? ''))
    if (!step) return fail(`步骤不存在：${String(args.stepId ?? '')}`)
    const target = requireAnalysis().steps.find((s) => s.id === step.id)
    if (!target) return fail('步骤不存在')
    await runStepAsync(requireAnalysis(), target)
    store().mutate(() => {})
    return ok(`步骤「${step.name}」已重新执行`)
  },

  rerun_stale_steps() {
    const a = requireAnalysis()
    if (!hasStaleSteps(a)) return ok('没有需要重跑的 stale 步骤')
    let n = 0
    store().mutate((analysis) => {
      n = rerunStaleSteps(analysis)
    })
    return ok(`已重跑 ${n} 个 stale 步骤`)
  },

  create_view(args) {
    const t = requireTable(String(args.tableId ?? ''))
    const type = String(args.type ?? '') as Parameters<typeof createViewNode>[0]
    const name = typeof args.name === 'string' && args.name.trim() ? args.name.trim() : defaultViewName(type, t.views)
    const view = createViewNode(type, name)
    store().mutate((a) => {
      findTable(a, t.id)?.views.push(view)
    })
    return ok(`已在表「${t.name}」上创建视图「${name}」（view id: ${view.id}，${type}）`, artifactOf('view', name, { tableId: t.id, viewId: view.id, viewType: type }))
  },

  set_chart_config(args) {
    const t = requireTable(String(args.tableId ?? ''))
    const v = findView(t.views, String(args.viewId ?? ''))
    if (!v?.chart) return fail('该视图不是图表视图')
    const chartType = typeof args.chartType === 'string' ? args.chartType : undefined
    const configure = (args.configure ?? {}) as Partial<ChartConfig['configure']>
    const style = (args.style ?? {}) as Partial<ChartConfig['style']>
    store().mutate((a) => {
      const table = findTable(a, t.id)
      const view = table ? findView(table.views, v.id) : null
      if (!view?.chart) return
      if (chartType) view.chart.chartType = chartType as ChartConfig['chartType']
      Object.assign(view.chart.configure, configure)
      Object.assign(view.chart.style, style)
    })
    // 校验映射完整性
    const updated = findView(requireTable(t.id).views, v.id)
    const errors = validateChartMapping(updated!.chart!, requireTable(t.id).columns)
    if (errors.length) {
      const msgs = errors.map((e) => e.message).join('；')
      return ok(`配置已写入，但校验未通过：${msgs}（可继续用 set_chart_config 补齐映射）`, artifactOf('view', v.name, { tableId: t.id, viewId: v.id, viewType: updated!.chart!.chartType }))
    }
    return ok(`图表「${v.name}」配置完成`, artifactOf('view', v.name, { tableId: t.id, viewId: v.id, viewType: updated!.chart!.chartType }))
  },

  async create_dashboard(args) {
    const name = String(args.name ?? '').trim()
    if (!name) return fail('name 不能为空')
    const d = createDashboard(name, {
      project: typeof args.project === 'string' ? args.project : undefined,
      department: typeof args.department === 'string' ? args.department : undefined,
    })
    await dashboardRepository.put(d)
    await dashStore().loadList()
    await dashStore().loadOne(d.id)
    return ok(`已创建看板「${name}」（id: ${d.id}）`, { kind: 'dashboard', name, dashboardId: d.id })
  },

  async add_dashboard_widget(args) {
    const dashboardId = String(args.dashboardId ?? '')
    const d = await dashboardRepository.get(dashboardId)
    if (!d) return fail(`看板不存在：${dashboardId}`)
    const a = store().current
    const tableId = String(args.tableId ?? '')
    const viewId = typeof args.viewId === 'string' ? args.viewId : undefined
    const widget: DashboardWidget = createDashboardWidget(
      viewId ? 'chart' : 'table',
      { analysisId: String(args.analysisId ?? a?.id ?? ''), tableId, viewId },
      { x: 0, y: d.widgets.reduce((m, w) => Math.max(m, w.grid.y + w.grid.h), 0), w: viewId ? 6 : 12, h: viewId ? 8 : 10 },
    )
    d.widgets.push(widget)
    await dashboardRepository.put(d)
    if (dashStore().currentId === dashboardId) await dashStore().loadOne(dashboardId)
    return ok(`已把${viewId ? '图表' : '表'}添加到看板「${d.name}」`, { kind: 'dashboard', name: d.name, dashboardId })
  },

  delete_table(args, ctx) {
    const t = requireTable(String(args.tableId ?? ''))
    if (ctx.confirmDestructive && args.__confirmed !== true) {
      return needConfirm(`删除表「${t.name}」（连带其步骤）`)
    }
    const a = requireAnalysis()
    const deps = findCombineDependents(a, t.id)
    if (deps.length) return fail(`无法删除：${deps.map((x) => x.name).join('、')} 依赖它`)
    store().mutate((analysis) => {
      const target = findTable(analysis, t.id)
      analysis.tables = analysis.tables.filter((x) => x.id !== t.id)
      if (target?.stepId) {
        analysis.steps = analysis.steps.filter((s) => s.id !== target.stepId)
        delete analysis.flowchartLayout[`step:${target.stepId}`]
      }
    })
    return ok(`已删除表「${t.name}」`)
  },

  delete_view(args, ctx) {
    const t = requireTable(String(args.tableId ?? ''))
    const viewId = String(args.viewId ?? '')
    const v = findView(t.views, viewId)
    if (!v) return fail('视图不存在')
    if (ctx.confirmDestructive && args.__confirmed !== true) {
      return needConfirm(`删除视图「${v.name}」`)
    }
    store().mutate((a) => {
      const table = findTable(a, t.id)
      if (!table) return
      const loc = findViewParent(table.views, viewId)
      if (loc) loc.siblings.splice(loc.siblings.findIndex((x) => x.id === viewId), 1)
    })
    return ok(`已删除视图「${v.name}」`)
  },

  delete_step(args, ctx) {
    const a = requireAnalysis()
    const step = a.steps.find((s) => s.id === String(args.stepId ?? ''))
    if (!step) return fail('步骤不存在')
    if (ctx.confirmDestructive && args.__confirmed !== true) {
      return needConfirm(`删除步骤「${step.name}」及其产出表`)
    }
    const outTables = new Set(step.output.tables)
    store().mutate((analysis) => {
      analysis.steps = analysis.steps.filter((s) => s.id !== step.id)
      analysis.tables = analysis.tables.filter((t) => !outTables.has(t.id))
      delete analysis.flowchartLayout[`step:${step.id}`]
    })
    return ok(`已删除步骤「${step.name}」`)
  },

  async list_skills() {
    const list = await aiSkillsApi.list()
    if (!list.length) return ok('暂无已安装 Skill')
    const lines = list.map(
      (s) =>
        `- ${s.name}（id: ${s.id}，${s.enabled ? '启用' : '停用'}，${s.source}）：${s.description || '无描述'}`,
    )
    return ok(`已安装 ${list.length} 个 Skill：\n${lines.join('\n')}`)
  },

  async read_skill(args) {
    const id = String(args.skillId ?? '').trim()
    if (!id) return fail('缺少 skillId')
    const d = await aiSkillsApi.get(id)
    return ok(`# ${d.name} (${d.id})\n\n${d.body}`)
  },

  async save_memory(args) {
    const content = String(args.content ?? '').trim()
    if (!content) return fail('缺少 content（请写入简短可复用的分析教训）')
    const rec = await aiMemoriesApi.create(content)
    return ok(`已保存分析记忆（id: ${rec.id}）：${rec.content}`)
  },
}

/** 工具分发入口。 */
export async function execTool(name: string, args: Record<string, unknown>, ctx: ToolCtx): Promise<ToolExecResult> {
  const fn = impl[name]
  if (!fn) return fail(`未知工具：${name}`)
  try {
    return await fn(args, ctx)
  } catch (e) {
    return fail(e instanceof Error ? e.message : String(e))
  }
}
