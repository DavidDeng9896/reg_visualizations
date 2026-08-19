/**
 * 将工具调用压成一行可读操作描述，如「拉取工单详情」。
 */
import type { TraceItem } from './aiStore'

const TOOL_LABELS: Record<string, string> = {
  submit_plan: '提交执行计划',
  mark_step_done: '标记步骤完成',
  ask_user: '向用户提问',
  list_analyses: '列出分析',
  list_tables: '列出数据表',
  get_table_schema: '查看表结构',
  create_analysis: '创建分析',
  import_csv_text: '导入 CSV',
  import_ai_file: '导入附件为表',
  list_ai_files: '列出聊天附件',
  add_filter_step: '添加过滤步骤',
  add_join_step: '添加连接步骤',
  add_union_step: '添加合并步骤',
  add_computed_column_step: '添加计算列',
  add_hide_columns_step: '隐藏列',
  add_custom_code_step: '添加 Custom Code',
  create_report_step: '创建分析报告',
  update_report_step: '更新分析报告',
  update_custom_code_step: '更新 Custom Code',
  run_step: '重新执行步骤',
  rerun_stale_steps: '重跑过期步骤',
  refresh_sql_source: '刷新 SQL 数据源',
  create_view: '创建视图',
  set_chart_config: '配置图表',
  create_dashboard: '创建看板',
  add_dashboard_widget: '添加看板组件',
  cleanup_failed_ai_steps: '清理失败空节点',
  delete_table: '删除表',
  delete_view: '删除视图',
  delete_step: '删除步骤',
  clear_analysis: '清空分析',
  list_skills: '列出 Skills',
  read_skill: '读取 Skill',
  save_memory: '保存分析记忆',
  delegate_skill_worker: '派发规划师',
  delegate_mcp_worker: '派发 MCP 专家',
  delegate_analysis_worker: '派发分析师',
  delegate_code_worker: '派发工程师',
}

function firstStr(args: Record<string, unknown> | undefined, keys: string[]): string {
  if (!args) return ''
  for (const k of keys) {
    const v = args[k]
    if (typeof v === 'string' && v.trim()) return v.trim()
    if (typeof v === 'number' && Number.isFinite(v)) return String(v)
  }
  return ''
}

function clip(s: string, n: number): string {
  const t = s.replace(/\s+/g, ' ').trim()
  if (n <= 0 || t.length <= n) return t
  return `${t.slice(0, n)}…`
}

/** MCP 常见操作 → 精简业务语义（如「拉取工单详情」）。 */
function mcpBriefLabel(name: string, args: Record<string, unknown> | undefined, maxHint: number): string {
  const bare = name.replace(/^mcp_/, '').toLowerCase()
  const issue = firstStr(args, ['issueKey', 'issue_key', 'key', 'id'])
  if (/get[_-]?issue|fetch[_-]?issue|issue[_-]?detail|get[_-]?ticket/.test(bare)) {
    return issue ? `拉取工单详情 ${clip(issue, maxHint)}` : '拉取工单详情'
  }
  if (/search[_-]?issue|list[_-]?issue|find[_-]?issue|jql/.test(bare)) {
    const q = firstStr(args, ['jql', 'query', 'q'])
    return q ? `搜索工单：${clip(q, maxHint)}` : '搜索工单'
  }
  if (/create[_-]?issue/.test(bare)) {
    const title = firstStr(args, ['title', 'summary'])
    return title ? `创建工单「${clip(title, maxHint)}」` : '创建工单'
  }
  if (/get[_-]?comment|list[_-]?comment/.test(bare)) {
    return issue ? `拉取工单评论 ${clip(issue, maxHint)}` : '拉取工单评论'
  }
  return ''
}

function buildOpLabel(t: TraceItem, maxHint: number): string {
  const name = t.name
  const args = t.args
  const base = TOOL_LABELS[name] ?? (name.startsWith('mcp_') ? name.replace(/^mcp_/, '').replace(/_/g, ' ') : name)

  if (name === 'ask_user') {
    const q = firstStr(args, ['question'])
    return q ? `提问：${clip(q, maxHint)}` : base
  }
  if (name === 'get_table_schema') {
    const id = firstStr(args, ['tableId', 'tableName'])
    return id ? `查看表结构 ${clip(id, maxHint)}` : base
  }
  if (name === 'create_view') {
    const typ = firstStr(args, ['type', 'chartType'])
    const nm = firstStr(args, ['name'])
    if (typ && nm) return `创建${typ}视图「${clip(nm, maxHint)}」`
    if (typ) return `创建${typ}视图`
    return base
  }
  if (name === 'set_chart_config') {
    const typ = firstStr(args, ['chartType'])
    return typ ? `配置${typ}图表` : base
  }
  if (name === 'create_analysis' || name === 'create_dashboard') {
    const nm = firstStr(args, ['name'])
    return nm ? `${base}「${clip(nm, maxHint)}」` : base
  }
  if (name === 'import_csv_text') {
    const nm = firstStr(args, ['tableName'])
    return nm ? `导入 CSV「${clip(nm, maxHint)}」` : base
  }
  if (name === 'import_ai_file') {
    const nm = firstStr(args, ['tableName', 'fileId'])
    return nm ? `导入附件「${clip(nm, maxHint)}」` : base
  }
  if (name === 'read_skill') {
    const id = firstStr(args, ['skillId'])
    return id ? `读取 Skill ${clip(id, maxHint)}` : base
  }
  if (name === 'add_filter_step' || name === 'add_join_step' || name === 'add_union_step' || name === 'add_computed_column_step' || name === 'add_hide_columns_step' || name === 'add_custom_code_step' || name === 'update_custom_code_step' || name === 'run_step' || name === 'delete_step') {
    const step = firstStr(args, ['stepId', 'name', 'expression', 'code'])
    return step ? `${base}：${clip(step, maxHint)}` : base
  }
  if (name === 'delegate_skill_worker' || name === 'delegate_mcp_worker' || name === 'delegate_analysis_worker' || name === 'delegate_code_worker') {
    const goal = firstStr(args, ['goal'])
    return goal ? `${base}：${clip(goal, maxHint)}` : base
  }
  if (name === 'mark_step_done') {
    const idx = args?.index
    return typeof idx === 'number' ? `完成步骤 ${idx + 1}` : base
  }
  if (name === 'submit_plan') {
    const steps = Array.isArray(args?.steps) ? args!.steps.length : 0
    return steps ? `提交计划（${steps} 步）` : base
  }
  if (name.startsWith('mcp_')) {
    const mcpBrief = mcpBriefLabel(name, args, maxHint)
    if (mcpBrief) return mcpBrief
    const hint = firstStr(args, ['goal', 'query', 'title', 'name', 'issueKey', 'issue_key', 'id', 'path'])
    const short = clip(base.replace(/\s+/g, ' '), Math.min(18, maxHint || 18)) || 'MCP 调用'
    return hint ? `${short}：${clip(hint, maxHint)}` : short
  }
  // 通用：优先短 summary；否则补一个关键参数
  const sum = (t.summary || '').trim()
  if (sum && !sum.startsWith('NEEDS_CONFIRMATION') && !sum.startsWith('ok：') && sum.length <= 36) {
    return maxHint > 0 ? clip(sum, maxHint) : sum
  }
  const hint = firstStr(args, ['goal', 'query', 'title', 'name', 'tableId', 'tableName', 'path', 'id'])
  if (hint) return `${base}：${clip(hint, maxHint)}`
  return base
}

/** 折叠行：精简操作内容（优先业务语义，而非裸工具名）。 */
export function briefOpLabel(t: TraceItem): string {
  return buildOpLabel(t, 24)
}

/** 展开态：完整操作描述（不截断）。 */
export function fullOpLabel(t: TraceItem): string {
  return buildOpLabel(t, 0)
}

/** 展开态：完整参数（不截断）。 */
export function fullArgs(t: TraceItem): string {
  if (!t.args || !Object.keys(t.args).length) return ''
  try {
    return JSON.stringify(t.args, null, 2)
  } catch {
    return String(t.args)
  }
}

/** 展开态：完整结果文案。 */
export function fullSummary(t: TraceItem): string {
  const s = (t.summary || '').trim()
  if (!s) return ''
  if (t.needsConfirmation && !t.confirmed && !t.rejected) {
    return s.replace(/^NEEDS_CONFIRMATION:\s*/, '').split('。不要重试')[0]
  }
  return s
}
