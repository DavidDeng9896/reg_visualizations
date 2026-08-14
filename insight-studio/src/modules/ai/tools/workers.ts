/**
 * Subagent 角色：受限工具集 + 独立短 loop，摘要回灌主 Planner。
 * 展示名：规划师 / MCP 专家 / 分析师 / 工程师。
 */
import type { ChatMessage, ChatPayload } from '../client'
import { contentText } from '../client'
import type { AgentEvent, RunAgentOptions, ToolExecResult } from '../agentLoop'
import { clipToolResult } from '../taskState'
import { CONTEXT_HEADER } from '../prompts'
import { OPENAI_TOOLS } from './registry'

export type WorkerKind = 'skill' | 'mcp' | 'analysis' | 'code'

export interface WorkerSpec {
  kind: WorkerKind
  toolName: string
  role: string
  maxIterations: number
  /** 内置工具名白名单；MCP 专家额外允许全部 mcp_*。 */
  allowBuiltin: string[]
  allowMcp: boolean
}

/** 只读探路工具：仅这些不足以视为目标完成。 */
export const WORKER_READ_ONLY_TOOLS = new Set([
  'list_analyses',
  'list_tables',
  'get_table_schema',
  'list_skills',
  'read_skill',
])

/** 分析师/工程师速查：补全冷启动缺失的平台知识。 */
const WORKER_PLATFORM_BRIEF = `## 平台要点（速查）
- 列名用原始 field（可含空格/特殊字符），title 仅展示名。
- Custom Code 入口：def custom_code(inputs: list[IOData], **kwargs) -> list[IOData]；return [IOData(name=..., data=df)] 或 [{"name":..., "data": df}]；stepId 必须是 UUID。写完后 run_step。
- line：x + values[]；scatter：x + values，可用 color；分组用 series/color。
- set_chart_config 必须给出完整可用映射，勿留空必填槽。`

export const WORKER_SPECS: Record<string, WorkerSpec> = {
  delegate_skill_worker: {
    kind: 'skill',
    toolName: 'delegate_skill_worker',
    role: '规划师',
    maxIterations: 8,
    allowBuiltin: ['list_skills', 'read_skill'],
    allowMcp: false,
  },
  delegate_mcp_worker: {
    kind: 'mcp',
    toolName: 'delegate_mcp_worker',
    role: 'MCP 专家',
    maxIterations: 12,
    allowBuiltin: [],
    allowMcp: true,
  },
  delegate_analysis_worker: {
    kind: 'analysis',
    toolName: 'delegate_analysis_worker',
    role: '分析师',
    // 清洗 + 多图配置常需 20+ 轮；过低会未跑完就超轮
    maxIterations: 36,
    allowBuiltin: [
      'list_analyses',
      'list_tables',
      'get_table_schema',
      'create_analysis',
      'import_csv_text',
      'import_ai_file',
      'list_ai_files',
      'add_filter_step',
      'add_join_step',
      'add_union_step',
      'add_computed_column_step',
      'add_hide_columns_step',
      // 清洗常需 Custom Code，与出图同属分析流水线
      'add_custom_code_step',
      'update_custom_code_step',
      'run_step',
      'rerun_stale_steps',
      'refresh_sql_source',
      'create_view',
      'set_chart_config',
      'create_dashboard',
      'add_dashboard_widget',
      'create_report_step',
      'update_report_step',
    ],
    allowMcp: false,
  },
  delegate_code_worker: {
    kind: 'code',
    toolName: 'delegate_code_worker',
    role: '工程师',
    maxIterations: 24,
    allowBuiltin: [
      'list_tables',
      'get_table_schema',
      'add_custom_code_step',
      'update_custom_code_step',
      'run_step',
      'rerun_stale_steps',
    ],
    allowMcp: false,
  },
}

export function isDelegateWorker(name: string): boolean {
  return Object.prototype.hasOwnProperty.call(WORKER_SPECS, name)
}

type OpenAiTool = {
  type: 'function'
  function: { name: string; description?: string; parameters?: unknown }
}

function asOpenAiTools(all: ChatPayload['tools']): OpenAiTool[] {
  return (all ?? []).filter((t): t is OpenAiTool => {
    if (!t || typeof t !== 'object') return false
    const fn = (t as { function?: { name?: unknown } }).function
    return typeof fn?.name === 'string'
  })
}

function filterToolsForWorker(all: ChatPayload['tools'], spec: WorkerSpec): OpenAiTool[] {
  const allow = new Set(spec.allowBuiltin)
  return asOpenAiTools(all).filter((t) => {
    const n = t.function.name
    if (allow.has(n)) return true
    if (spec.allowMcp && n.startsWith('mcp_')) return true
    return false
  })
}

function workerSystemPrompt(spec: WorkerSpec, goal: string): string {
  const brief = spec.kind === 'analysis' || spec.kind === 'code' ? `\n${WORKER_PLATFORM_BRIEF}\n` : ''
  return `你是「${spec.role}」子代理。只完成下列目标，禁止调用与目标无关的工具。
硬性要求：
1. 必须持续 tool_calls 直到目标落地（写出步骤/建图/改配置）；禁止只 list_tables / get_table_schema 就结束。
2. 禁止复述目标长文；不要过程独白，直接调用工具。
3. 若某工具失败，换参数或换工具继续，不要空回复收工。
4. 已有落地工具（加工/代码/建图等）后，可用简短中文收工：结论、关键产物 id/名称、未完成项。不要宣称用户总任务已全部完成。
5. 优先复用下方「工作区上下文」与主循环工具摘要中的表 id / 字段名，避免重复无意义探路。
${brief}目标：${goal}`
}

function toolNamesUsed(messages: ChatMessage[]): string[] {
  return messages
    .filter((m) => m.role === 'tool' && typeof m.name === 'string')
    .map((m) => String(m.name))
}

/** 是否只做了只读探路、没有任何落地工具（分析师/工程师用）。 */
export function workerOnlyExplored(messages: ChatMessage[]): boolean {
  const names = toolNamesUsed(messages)
  if (!names.length) return true
  return names.every((n) => WORKER_READ_ONLY_TOOLS.has(n))
}

/**
 * 从主循环消息提取子代理可用的工作区上下文（分析表结构、@ 引用、记忆）
 * 以及最近非子代理工具观察，避免冷启动一无所知。
 */
export function extractParentContextForWorker(parentMessages: ChatMessage[] | undefined): string {
  if (!parentMessages?.length) return ''
  const parts: string[] = []
  for (const m of parentMessages) {
    if (m.role !== 'system') continue
    const t = contentText(m.content).trim()
    if (!t) continue
    if (
      t.includes(CONTEXT_HEADER) ||
      t.includes('用户特别引用') ||
      t.includes('## 用户分析记忆') ||
      t.includes('## 用户本轮上传了以下附件') ||
      t.includes('## 会话附件目录')
    ) {
      parts.push(t)
    }
  }

  const skip = new Set<string>([
    'submit_plan',
    'mark_step_done',
    'ask_user',
    ...Object.keys(WORKER_SPECS),
  ])
  const observations: string[] = []
  for (let i = parentMessages.length - 1; i >= 0 && observations.length < 4; i -= 1) {
    const m = parentMessages[i]
    if (m.role !== 'tool' || !m.name || skip.has(m.name)) continue
    const body = contentText(m.content).trim()
    if (!body) continue
    observations.push(`- ${m.name}: ${body.slice(0, 800)}`)
  }
  if (observations.length) {
    parts.push(
      `## 主循环已执行工具摘要（可复用，勿重复无意义探路）\n${observations.reverse().join('\n')}`,
    )
  }

  const joined = parts.join('\n\n').trim()
  if (!joined) return ''
  return joined.length > 10000 ? `${joined.slice(0, 10000)}\n…` : joined
}

/** 从子代理会话中提炼末条助手文本作为摘要。 */
function summarizeWorkerMessages(messages: ChatMessage[], goal: string, role: string): string {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const m = messages[i]
    const text = contentText(m.content).trim()
    if (m.role === 'assistant' && text) {
      return clipToolResult(text)
    }
  }
  const tools = messages.filter((m) => m.role === 'tool').map((m) => contentText(m.content))
  if (tools.length) {
    return clipToolResult(`${role}已执行 ${tools.length} 个工具。目标：${goal}\n末次观察：${tools[tools.length - 1]}`)
  }
  return `${role}未产出有效结果。目标：${goal}`
}

export interface RunWorkerOpts {
  workerName: string
  goal: string
  parentTools: ChatPayload['tools']
  parent: Pick<RunAgentOptions, 'exec' | 'model' | 'signal' | 'askUser' | 'waitConfirm' | 'postChatFn'>
  /** 主循环当前 messages，用于注入工作区上下文。 */
  parentMessages?: ChatMessage[]
  /** 子代理内部进展回调（供 Trace 显示「分析师进行中：xxx」）。 */
  onProgress?: (summary: string) => void
}

/** 跑一个子代理短 loop，返回摘要型 ToolExecResult。 */
export async function runDelegateWorker(opts: RunWorkerOpts): Promise<ToolExecResult> {
  const spec = WORKER_SPECS[opts.workerName]
  if (!spec) return { ok: false, summary: `未知子代理：${opts.workerName}` }
  const goal = opts.goal.trim()
  if (!goal) return { ok: false, summary: `缺少 goal（请说明「${spec?.role ?? '子代理'}」要完成的具体目标）` }

  const tools = filterToolsForWorker(opts.parentTools, spec)
  if (!tools.length) {
    return {
      ok: false,
      summary: spec.allowMcp
        ? '当前无可用 MCP 工具（请先在设置中启用 MCP 服务器）'
        : `「${spec.role}」无可用工具`,
    }
  }

  // 兜底：确保白名单工具定义存在（父级可能只带了子集）
  const have = new Set(tools.map((t) => t.function.name))
  for (const t of OPENAI_TOOLS) {
    if (spec.allowBuiltin.includes(t.function.name) && !have.has(t.function.name)) {
      tools.push(t as OpenAiTool)
      have.add(t.function.name)
    }
  }

  const seed: ChatMessage[] = [{ role: 'system', content: workerSystemPrompt(spec, goal) }]
  const parentCtx = extractParentContextForWorker(opts.parentMessages)
  if (parentCtx) {
    seed.push({ role: 'system', content: parentCtx })
  }
  seed.push({ role: 'user', content: goal })

  try {
    const { runAgent } = await import('../agentLoop')
    const onWorkerEvent = (e: AgentEvent) => {
      if (!opts.onProgress) return
      if (e.type === 'tool_call' && e.running !== false) opts.onProgress(`${spec.role}进行中：${e.call.function.name}…`)
      else if (e.type === 'tool_result') opts.onProgress(`${spec.role}完成：${e.name}${e.ok === false ? '（失败）' : ''}`)
      else if (e.type === 'round') opts.onProgress(`${spec.role}第 ${e.n} 轮…`)
    }
    const messages = await runAgent({
      messages: seed,
      tools,
      exec: opts.parent.exec,
      maxIterations: spec.maxIterations,
      model: opts.parent.model,
      signal: opts.parent.signal,
      askUser: opts.parent.askUser,
      waitConfirm: opts.parent.waitConfirm,
      postChatFn: opts.parent.postChatFn,
      planGate: false,
      // 分析师/工程师禁止只读探路就收工；规划师/MCP 专家以读/调用本身为交付
      workerStrict: spec.kind === 'analysis' || spec.kind === 'code',
      onEvent: onWorkerEvent,
    })
    const summary = summarizeWorkerMessages(messages, goal, spec.role)
    // 分析师/工程师：只读探路就收工 → 视为未完成
    if ((spec.kind === 'analysis' || spec.kind === 'code') && workerOnlyExplored(messages)) {
      return {
        ok: false,
        summary: `【${spec.role}】未完成：仅做了探路（list/schema），未落地加工/建图/写代码。请缩小 goal 或再派分析师/工程师继续。\n${summary}`,
      }
    }
    return { ok: true, summary: `【${spec.role}】${summary}` }
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') throw e
    return {
      ok: false,
      summary: `【${spec.role}】失败：${e instanceof Error ? e.message : String(e)}`,
    }
  }
}
