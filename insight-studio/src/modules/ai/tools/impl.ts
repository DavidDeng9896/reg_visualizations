/**
 * Agent 工具实现：操作 analysisStore / dashboardStore / repository。
 * 返回 ToolExecResult；危险操作支持「需确认」模式（前端确认后带 __confirmed 重放）。
 */
import Papa from 'papaparse'
import { toRaw } from 'vue'
import type { Analysis, AnalysisTable, ChartConfig, DashboardWidget, Filter, Row, StepNode, StepType, ViewNode } from '../../../shared/types'
import { createEmptyAnalysis, createTable, createViewNode, defaultViewName, createDashboard, createDashboardWidget, sealRows } from '../../../shared/factories'
import { uuid } from '../../../shared/id'
import { analysisRepository } from '../../../shared/repository'
import { dashboardRepository } from '../../../shared/dashboardRepository'
import { findTable, findView, findViewParent, findCombineDependents } from '../../../shared/tree'
import { inferColumnTypes } from '../../table/csv'
import { validateChartMapping } from '../../charts/registry'
import { normalizeAiChartConfigure, autofillRequiredChartSlots, resolveConfigureFields, formatChartMappingFailHint } from '../normalizeChartConfigure'
import { runStep, runStepAsync } from '../../steps/exec'
import { createStepNode } from '../../steps/factory'
import { CUSTOM_CODE_DEFAULT_TEMPLATE } from '../../steps/customCodeTemplate'
import { emptyReport, readReportConfig } from '../../steps/report/reportModel'
import type { AnalysisReport } from '../../../shared/types'
import { rerunStaleSteps, hasStaleSteps } from '../../steps/rerun'
import { refreshSqlSourceStep } from '../../table/refreshSqlSource'
import { useAnalysisStore } from '../../../stores/analysisStore'
import { useDashboardStore } from '../../../stores/dashboardStore'
import type { ToolExecResult } from '../agentLoop'
import type { Artifact } from '../types'
import { aiSkillsApi, aiMemoriesApi, aiFilesApi } from '../client'
import { normalizeExpressionColumns } from '../../../shared/pipeline'
import { attachmentFromMeta, importAiAttachment } from '../attachments'
import { coerceParsedToolArgs } from '../toolArgs'

export interface ToolCtx {
  confirmDestructive: boolean
  confirmWrite: boolean
}

/** 写入类工具（非删除）：开启 confirmWrite 时需用户批准。 */
const WRITE_TOOLS = new Set([
  'create_analysis',
  'import_csv_text',
  'import_ai_file',
  'add_filter_step',
  'add_computed_column_step',
  'add_join_step',
  'add_union_step',
  'add_hide_columns_step',
  'add_custom_code_step',
  'update_custom_code_step',
  'create_report_step',
  'update_report_step',
  'run_step',
  'rerun_stale_steps',
  'refresh_sql_source',
  'create_view',
  'set_chart_config',
  'create_dashboard',
  'add_dashboard_widget',
  'save_memory',
])

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

/** 从工具参数中抽出表引用（兼容 tableId / table / tableName / fromTableId）。 */
function tableRefFromArgs(args: Record<string, unknown>): string {
  for (const k of ['tableId', 'table', 'tableName', 'fromTableId', 'sourceTableId']) {
    const v = args[k]
    if (typeof v === 'string' && v.trim()) return v.trim()
  }
  return ''
}

/** 从工具参数中抽出视图引用。 */
function viewRefFromArgs(args: Record<string, unknown>): string {
  for (const k of ['viewId', 'view', 'viewName']) {
    const v = args[k]
    if (typeof v === 'string' && v.trim()) return v.trim()
  }
  return ''
}

function requireTable(tableId: string): AnalysisTable {
  const t = resolveTableRef(tableId)
  if (!t) throw new Error(`表不存在：${tableId || '（未提供 tableId）'}（可先用 list_tables 查看 id）`)
  return t
}

/** 缺 tableId 时：当前选中表 → 仅一张表 → 最近一张表。 */
function pickDefaultTable(): AnalysisTable | null {
  const a = store().current
  if (!a?.tables.length) return null
  const sel = store().selected
  if (sel?.tableId) {
    const t = findTable(a, sel.tableId)
    if (t) return t
  }
  if (a.tables.length === 1) return a.tables[0]!
  return a.tables[a.tables.length - 1]!
}

/** 按 id / 名称 / id 前缀解析表；空引用时回退默认表。 */
function resolveTableRef(ref: string): AnalysisTable | null {
  const a = store().current
  if (!a) return null
  const key = ref.trim()
  if (!key) return pickDefaultTable()
  const byId = findTable(a, key)
  if (byId) return byId
  const lower = key.toLowerCase()
  return (
    a.tables.find((t) => t.name === key) ??
    a.tables.find((t) => t.name.toLowerCase() === lower) ??
    a.tables.find((t) => t.id.startsWith(key)) ??
    null
  )
}

function collectChartViews(table: AnalysisTable): Array<{ table: AnalysisTable; view: ViewNode }> {
  const out: Array<{ table: AnalysisTable; view: ViewNode }> = []
  const walk = (nodes: ViewNode[]) => {
    for (const v of nodes) {
      if (v.chart) out.push({ table, view: v })
      if (v.children?.length) walk(v.children)
    }
  }
  walk(table.views)
  return out
}

function findViewByRef(views: ViewNode[], ref: string): ViewNode | null {
  const key = ref.trim()
  if (!key) return null
  const byId = findView(views, key)
  if (byId) return byId
  const lower = key.toLowerCase()
  const walk = (nodes: ViewNode[]): ViewNode | null => {
    for (const v of nodes) {
      if (v.name === key || v.name.toLowerCase() === lower || v.id.startsWith(key)) return v
      const sub = walk(v.children)
      if (sub) return sub
    }
    return null
  }
  return walk(views)
}

/**
 * 解析图表视图：
 * - 有 viewId/视图名：按 id/名反查（可缺 tableId）
 * - 均缺：选中图表视图 → 指定表上最近一张图表 → 分析内唯一/最近图表
 */
function resolveChartView(tableRef: string, viewRef: string): { table: AnalysisTable; view: ViewNode } {
  const a = requireAnalysis()
  const tableKey = tableRef.trim()
  const viewKey = viewRef.trim()

  if (viewKey) {
    if (tableKey) {
      const t = resolveTableRef(tableKey)
      if (t) {
        const v = findViewByRef(t.views, viewKey)
        if (v?.chart) return { table: t, view: v }
      }
    }
    for (const t of a.tables) {
      const v = findViewByRef(t.views, viewKey)
      if (v?.chart) return { table: t, view: v }
    }
    throw new Error(
      `表/视图不存在：table=${tableRef || '（未提供）'} view=${viewRef}。请用 list_tables 核对表 id 与 viewId。`,
    )
  }

  const sel = store().selected
  if (sel?.kind === 'view' && sel.viewId) {
    const t = findTable(a, sel.tableId)
    const v = t ? findView(t.views, sel.viewId) : null
    if (t && v?.chart) return { table: t, view: v }
  }

  const preferred = tableKey ? resolveTableRef(tableKey) : pickDefaultTable()
  if (preferred) {
    const onTable = collectChartViews(preferred)
    if (onTable.length) return onTable[onTable.length - 1]!
  }

  const all = a.tables.flatMap((t) => collectChartViews(t))
  if (all.length === 1) return all[0]!
  if (all.length > 1) return all[all.length - 1]!

  throw new Error(
    '缺少 viewId：当前分析没有可配置的图表视图。请先 create_view，或用 list_tables 查看 viewId。',
  )
}

function extractChartConfigure(
  args: Record<string, unknown>,
  chartType: string,
): Partial<ChartConfig['configure']> {
  const raw = args.configure ?? args.mapping ?? args.config
  if (Array.isArray(raw)) {
    return normalizeAiChartConfigure(chartType, { values: raw as ChartConfig['configure']['values'] })
  }
  if (raw && typeof raw === 'object') {
    return normalizeAiChartConfigure(chartType, raw as Partial<ChartConfig['configure']>)
  }
  const loose: Partial<ChartConfig['configure']> = {}
  for (const key of ['x', 'y', 'series', 'color', 'shape', 'size', 'categories', 'measure', 'values'] as const) {
    if (args[key] != null) loose[key] = args[key] as never
  }
  if (typeof args.field === 'string' && args.field.trim()) {
    loose.values = [{ field: args.field.trim() }]
  }
  return normalizeAiChartConfigure(chartType, loose)
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

/**
 * 深拷贝分析（自测 Custom Code 用）。
 * 禁止 structuredClone：Pinia/Vue Proxy 与 markRaw 行会抛 DataCloneError。
 */
export function cloneAnalysisForDraft(a: Analysis): Analysis {
  try {
    // 逐层 toRaw，避免嵌套仍为 Proxy 时个别环境异常
    const plain = JSON.parse(JSON.stringify(toRaw(a), (_k, v) => {
      if (v && typeof v === 'object') {
        try {
          return toRaw(v)
        } catch {
          return v
        }
      }
      return v
    })) as Analysis
    return plain
  } catch (e) {
    throw new Error(`无法复制分析用于 Custom Code 自测：${e instanceof Error ? e.message : String(e)}`)
  }
}

/** 把副本上的 Custom Code 执行产物合并进真实 analysis（保留 step id）。 */
function applyDraftStepResult(
  live: Analysis,
  liveStep: StepNode,
  draft: Analysis,
  draftStep: StepNode,
): void {
  const prevTableIds = new Set(liveStep.output.tables ?? [])
  const prevFileIds = new Set(liveStep.output.files ?? [])
  const prevChartIds = new Set(liveStep.output.charts ?? [])

  liveStep.status = draftStep.status
  liveStep.error = draftStep.error
  for (const k of Object.keys(draftStep.config)) {
    liveStep.config[k] = draftStep.config[k]
  }
  liveStep.output = {
    tables: [...(draftStep.output.tables ?? [])],
    files: [...(draftStep.output.files ?? [])],
    views: [...(draftStep.output.views ?? [])],
    charts: [...(draftStep.output.charts ?? [])],
  }

  live.tables = live.tables.filter((t) => !prevTableIds.has(t.id))
  if (live.files?.length) live.files = live.files.filter((f) => !prevFileIds.has(f.id))
  if (live.charts?.length) live.charts = live.charts.filter((c) => !prevChartIds.has(c.id))

  for (const tid of draftStep.output.tables ?? []) {
    const tbl = draft.tables.find((x) => x.id === tid)
    if (!tbl) continue
    tbl.stepId = liveStep.id
    tbl.rows = sealRows(tbl.rows)
    live.tables.push(tbl)
  }
  if (!live.files) live.files = []
  for (const fid of draftStep.output.files ?? []) {
    const f = draft.files?.find((x) => x.id === fid)
    if (!f) continue
    live.files.push(f)
  }
  if (!live.charts) live.charts = []
  for (const cid of draftStep.output.charts ?? []) {
    const c = draft.charts?.find((x) => x.id === cid)
    if (!c) continue
    c.stepId = liveStep.id
    live.charts.push(c)
  }
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
    if (!analysis.tables.length) {
      return ok(
        '当前分析还没有表。若用户上传了 CSV/Excel 附件，请用 list_ai_files 或系统提示中的附件 id，再调用 import_ai_file({ fileId }) 导入；也可 import_csv_text 粘贴 CSV。',
      )
    }
    const lines = analysis.tables.map((t) => {
      const base = `- ${t.name}（id: ${t.id}，${t.rows.length} 行，${t.columns.length} 列${t.stepId ? '，步骤产出' : '，源表'}）`
      if (!t.views.length) return base
      const views = t.views
        .map((v) => `「${v.name}」(${v.type}, viewId: ${v.id}${v.chart ? `, chartType: ${v.chart.chartType}` : ''})`)
        .join('、')
      return `${base}\n  视图：${views}`
    })
    return ok(`分析「${analysis.name}」的表：\n${lines.join('\n')}`)
  },

  get_table_schema(args) {
    const t = requireTable(tableRefFromArgs(args))
    const cols = t.columns.map((c) => `${c.title}(${c.dataType})`).join('、')
    const sample = t.rows.slice(0, 5).map((r) => t.columns.map((c) => String(r[c.field] ?? '')).join(' | '))
    return ok(`表「${t.name}」（id: ${t.id}，${t.rows.length} 行）：\n列：${cols}\n样例：\n${sample.join('\n')}`)
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

  async list_ai_files() {
    try {
      const list = await aiFilesApi.list()
      if (!list.length) return ok('暂无上传附件。请用户在输入栏用 + / 回形针上传 CSV 或 Excel。')
      const lines = list.map(
        (f) => `- 「${f.name}」id=${f.id} kind=${f.kind}（${Math.round(f.sizeBytes / 1024)} KB）`,
      )
      return ok(
        `共 ${list.length} 个附件：\n${lines.join('\n')}\nCSV/Excel 用 import_ai_file({ fileId }) 导入为分析表。`,
      )
    } catch (e) {
      return fail(e instanceof Error ? e.message : '列出附件失败')
    }
  },

  async import_ai_file(args) {
    requireAnalysis()
    const fileId = String(args.fileId ?? '').trim()
    if (!fileId) return fail('fileId 不能为空')
    let meta
    try {
      meta = await aiFilesApi.meta(fileId)
    } catch (e) {
      return fail(e instanceof Error ? e.message : '附件不存在或无法读取')
    }
    if (meta.kind !== 'csv' && meta.kind !== 'excel') {
      return fail(`附件「${meta.name}」kind=${meta.kind} 不支持导入为表（仅 csv/excel）`)
    }
    const tableName =
      typeof args.tableName === 'string' && args.tableName.trim() ? args.tableName.trim() : undefined
    const sheetNames = Array.isArray(args.sheetNames)
      ? args.sheetNames.map((s) => String(s).trim()).filter(Boolean)
      : undefined
    const att = attachmentFromMeta(meta, {
      importAsTable: true,
      ...(sheetNames?.length ? { selectedSheets: sheetNames } : {}),
    })
    try {
      const imported = await importAiAttachment(att, { tableNameHint: tableName, sheetNames })
      const lines = imported.map(
        (t) =>
          `- 「${t.name}」id=${t.tableId}（${t.rowCount} 行 × ${t.columnCount} 列${t.sheetName ? `，sheet=${t.sheetName}` : ''}）`,
      )
      const first = imported[0]
      return ok(
        `已从附件「${meta.name}」导入 ${imported.length} 张表：\n${lines.join('\n')}`,
        first
          ? artifactOf('table', first.name, { tableId: first.tableId, stepId: first.stepId })
          : undefined,
      )
    } catch (e) {
      return fail(e instanceof Error ? e.message : '导入附件失败')
    }
  },

  add_filter_step(args) {
    const t = requireTable(tableRefFromArgs(args))
    const filters = toConditions(args)
    const { step, table } = appendStep({
      type: 'filter',
      name: `Filter table`,
      fromTableIds: [t.id],
      config: { filters },
    })
    return ok(
      `已创建过滤步骤（输入表「${t.name}」${t.id}，step id: ${step.id}，产出表 id: ${table.id}，${table.rows.length} 行）`,
      artifactOf('table', table.name, { tableId: table.id, stepId: step.id }),
    )
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
    const t = requireTable(tableRefFromArgs(args))
    const name = String(args.name ?? '').trim()
    const rawExpr = String(args.expression ?? '').trim()
    if (!name || !rawExpr) return fail('name 与 expression 不能为空')
    // 含括号/空格的列名自动加 []，避免 IC50(nM) 被当成函数
    const expression = normalizeExpressionColumns(
      rawExpr,
      t.columns.map((c) => c.field),
    )
    const { step, table } = appendStep({
      type: 'computed-column',
      name: `Computed column`,
      fromTableIds: [t.id],
      config: { name, expression },
    })
    const note = expression !== rawExpr ? `（已规范化列引用：\`${expression}\`）` : ''
    return ok(
      `已创建派生列「${name}」${note}（step id: ${step.id}，产出表 id: ${table.id}）`,
      artifactOf('table', table.name, { tableId: table.id, stepId: step.id }),
    )
  },

  add_hide_columns_step(args) {
    const t = requireTable(tableRefFromArgs(args))
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
    const t = requireTable(tableRefFromArgs(args))
    const code = typeof args.code === 'string' && args.code.trim() ? String(args.code) : CUSTOM_CODE_DEFAULT_TEMPLATE
    const name = typeof args.name === 'string' && args.name.trim() ? String(args.name).trim() : 'Custom code'

    // 在分析副本上自测；成功后再写入画布，避免失败节点残留
    const live = requireAnalysis()
    let draft: Analysis
    try {
      draft = cloneAnalysisForDraft(live)
    } catch (e) {
      return fail(e instanceof Error ? e.message : String(e))
    }
    const up = producingStep(draft, t.id)
    const step = createStepNode('custom-code', name)
    step.inputs = [{ port: 'Input datasets', from: { nodeId: up.id, port: 'Output dataset' } }]
    step.config.code = code
    draft.steps.push(step)
    const result = await runStepAsync(draft, step)
    if (result.status !== 'configured') {
      return fail(result.error ?? 'Custom Code 自测失败，未写入画布')
    }

    let outTableId = ''
    store().mutate((a) => {
      const realUp = producingStep(a, t.id)
      const real = createStepNode('custom-code', name)
      real.id = step.id
      real.inputs = [{ port: 'Input datasets', from: { nodeId: realUp.id, port: 'Output dataset' } }]
      real.config.code = code
      a.steps.push(real)
      // 复用自测产物（表/文件/图）
      applyDraftStepResult(a, real, draft, step)
      outTableId = real.output.tables[0] ?? ''
    })

    const out = outTableId ? findTable(requireAnalysis(), outTableId) : undefined
    const resultSummary = out
      ? `已创建 Custom Code「${name}」（step id: ${step.id}，产出表 id: ${out.id}，${out.rows.length} 行）`
      : `已创建 Custom Code「${name}」（step id: ${step.id}）`
    return ok(resultSummary, out ? artifactOf('table', out.name, { tableId: out.id, stepId: step.id }) : undefined)
  },

  async update_custom_code_step(args) {
    const a = requireAnalysis()
    const step = a.steps.find((s) => s.id === String(args.stepId ?? ''))
    if (!step || step.type !== 'custom-code') return fail('Custom Code 步骤不存在')
    const prevCode = String(step.config.code ?? '')
    const prevName = step.name
    const nextCode = typeof args.code === 'string' ? args.code : prevCode
    const nextName = typeof args.name === 'string' && args.name.trim() ? args.name.trim() : prevName

    const draft = cloneAnalysisForDraft(a)
    const draftStep = draft.steps.find((s) => s.id === step.id)
    if (!draftStep) return fail('Custom Code 步骤不存在')
    draftStep.config.code = nextCode
    draftStep.name = nextName
    const result = await runStepAsync(draft, draftStep)
    if (result.status !== 'configured') {
      return fail(result.error ?? '执行失败，画布未改动')
    }

    store().mutate((analysis) => {
      const target = analysis.steps.find((s) => s.id === step.id)
      if (!target) return
      target.config.code = nextCode
      target.name = nextName
      applyDraftStepResult(analysis, target, draft, draftStep)
    })
    return ok(`已更新并执行 Custom Code「${nextName}」`)
  },

  create_report_step(args) {
    const name =
      typeof args.name === 'string' && args.name.trim() ? args.name.trim() : '分析报告'
    let report: AnalysisReport = emptyReport(name)
    if (args.report && typeof args.report === 'object') {
      report = readReportConfig({ report: args.report })
      report.title = report.title || name
    }
    let stepId = ''
    store().mutate((a) => {
      const step = createStepNode('report', name)
      step.config.report = report
      step.status = 'configured'
      a.steps.push(step)
      stepId = step.id
    })
    return ok(`已创建分析报告「${name}」（step id: ${stepId}）`, artifactOf('report', name, { stepId }))
  },

  update_report_step(args) {
    const stepId = String(args.stepId ?? '')
    const a = requireAnalysis()
    const step = a.steps.find((s) => s.id === stepId)
    if (!step || step.type !== 'report') return fail('报告步骤不存在')
    if (!args.report && !(typeof args.name === 'string' && args.name.trim())) {
      return fail('请提供 report 或 name')
    }
    store().mutate((analysis) => {
      const target = analysis.steps.find((s) => s.id === stepId)
      if (!target || target.type !== 'report') return
      if (typeof args.name === 'string' && args.name.trim()) target.name = args.name.trim()
      if (args.report && typeof args.report === 'object') {
        target.config.report = readReportConfig({ report: args.report })
      }
      target.status = 'configured'
      target.error = undefined
    })
    return ok(`已更新报告「${step.name}」`, artifactOf('report', step.name, { stepId }))
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

  async refresh_sql_source(args) {
    const a = requireAnalysis()
    let stepId = String(args.stepId ?? '').trim()
    if (!stepId) {
      const sqlSteps = a.steps.filter((s) => s.type === 'query-sql')
      if (sqlSteps.length === 0) return fail('当前分析没有 query-sql 数据源步骤')
      if (sqlSteps.length > 1) {
        return fail(
          `存在多个 SQL 源，请指定 stepId：${sqlSteps.map((s) => `${s.name}(${s.id})`).join('、')}`,
        )
      }
      stepId = sqlSteps[0]!.id
    }
    const step = a.steps.find((s) => s.id === stepId)
    if (!step || step.type !== 'query-sql') return fail('stepId 不是 query-sql 步骤')
    try {
      const r = await refreshSqlSourceStep(stepId)
      return ok(
        `已刷新 SQL 源「${step.name}」（${r.rowCount} 行），下游：${r.mode}${r.ran ? ` / 重跑 ${r.ran}` : ''}`,
        artifactOf('table', step.name, { tableId: r.tableId, stepId }),
      )
    } catch (e) {
      return fail(e instanceof Error ? e.message : String(e))
    }
  },

  create_view(args) {
    const t = requireTable(tableRefFromArgs(args))
    const type = String(args.type ?? '') as Parameters<typeof createViewNode>[0]
    const name = typeof args.name === 'string' && args.name.trim() ? args.name.trim() : defaultViewName(type, t.views)
    const view = createViewNode(type, name)
    store().mutate((a) => {
      findTable(a, t.id)?.views.push(view)
    })
    return ok(`已在表「${t.name}」上创建视图「${name}」（view id: ${view.id}，${type}）`, artifactOf('view', name, { tableId: t.id, viewId: view.id, viewType: type }))
  },

  set_chart_config(args) {
    const coerced = coerceParsedToolArgs('set_chart_config', args)
    const { table, view } = resolveChartView(tableRefFromArgs(coerced), viewRefFromArgs(coerced))
    const v = view
    const t = table
    if (!v?.chart) return fail('该视图不是图表视图')
    const chartType = typeof coerced.chartType === 'string' ? coerced.chartType : undefined
    const effectiveType = String(chartType || v.chart.chartType || 'bar')
    let configure = extractChartConfigure(coerced, effectiveType)
    configure = resolveConfigureFields(configure, t.columns)
    const autofilled = autofillRequiredChartSlots(effectiveType, configure, t.columns)
    configure = autofilled.configure
    const style = (coerced.style ?? {}) as Partial<ChartConfig['style']>
    store().mutate((a) => {
      const table = findTable(a, t.id)
      const view = table ? findView(table.views, v.id) : null
      if (!view?.chart) return
      if (chartType) view.chart.chartType = chartType as ChartConfig['chartType']
      Object.assign(view.chart.configure, configure)
      Object.assign(view.chart.style, style)
    })
    // 校验映射完整性：失败返回 ok:false，并给出可用列 + 完整示例，避免同参空转
    const updated = findView(requireTable(t.id).views, v.id)
    const errors = validateChartMapping(updated!.chart!, requireTable(t.id).columns)
    if (errors.length) {
      return fail(
        formatChartMappingFailHint(effectiveType, requireTable(t.id).columns, errors, configure),
      )
    }
    const fillNote = autofilled.filled.length ? `（已自动补齐 ${autofilled.filled.join('、')}）` : ''
    return ok(
      `图表「${v.name}」配置完成${fillNote}`,
      artifactOf('view', v.name, { tableId: t.id, viewId: v.id, viewType: updated!.chart!.chartType }),
    )
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
    const t = requireTable(tableRefFromArgs(args))
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
    const t = requireTable(tableRefFromArgs(args))
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

  clear_analysis(args, ctx) {
    const target = requireAnalysis()
    if (args.analysisId && String(args.analysisId) !== target.id) {
      return fail('只能清空当前已打开的分析（请先打开目标分析）')
    }
    const tableN = target.tables.length
    const stepN = target.steps.length
    if (!tableN && !stepN) return ok('当前分析已无表与步骤，无需清空')
    if (ctx.confirmDestructive && args.__confirmed !== true) {
      return needConfirm(`清空分析「${target.name}」的全部内容（${tableN} 张表、${stepN} 个步骤）`)
    }
    store().mutate((analysis) => {
      analysis.tables = []
      analysis.steps = []
      analysis.flowchartLayout = {}
    })
    return ok(`已清空分析「${target.name}」（删除 ${tableN} 张表、${stepN} 个步骤）`)
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
    const parsed = coerceParsedToolArgs(name, args)
    if (ctx.confirmWrite && WRITE_TOOLS.has(name) && parsed.__confirmed !== true) {
      return needConfirm(`执行写入操作「${name}」`)
    }
    return await fn(parsed, ctx)
  } catch (e) {
    return fail(e instanceof Error ? e.message : String(e))
  }
}
