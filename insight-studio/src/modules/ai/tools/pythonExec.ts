/**
 * Custom Code AI 场景工具：run_python_code 用科研运行时真跑代码（草稿运行）。
 * 只回传摘要（防上下文爆炸）；产物不落流程图节点（与正式运行区分）。
 */
import { useAnalysisStore } from '../../../stores/analysisStore'
import type { ToolExecResult } from '../agentLoop'
import { buildCustomCodeInputPayloads, callPythonExecute, type PythonExecuteResponse } from '../../steps/exec/customCode'
import { annotateCustomCodeError } from '../../steps/customCodeTemplate'

const MAX_STDOUT = 1500
const MAX_PREVIEW_ROWS = 3
/** 草稿验证超时比正式运行（300s）短，保持对话节奏。 */
const DRAFT_TIMEOUT_SEC = 120

function clip(s: string, max: number): string {
  if (s.length <= max) return s
  return `${s.slice(0, max)}\n…（已截断 ${s.length - max} 字符）`
}

function summarizeOutput(o: NonNullable<PythonExecuteResponse['outputs']>[number]): string {
  if (o.kind === 'dataframe') {
    const rows = o.rows ?? []
    const cols = (o.columns ?? []).map((c) => c.field ?? c.name ?? '?')
    const preview = rows
      .slice(0, MAX_PREVIEW_ROWS)
      .map((r) => `  ${cols.map((c) => `${c}=${JSON.stringify(r[c])}`).join(', ')}`)
      .join('\n')
    return `输出表「${o.name || 'output'}」：${rows.length} 行 × ${cols.length} 列（列：${cols.join(', ')}）${preview ? `\n前 ${Math.min(rows.length, MAX_PREVIEW_ROWS)} 行：\n${preview}` : ''}`
  }
  if (o.kind === 'file') {
    return `输出文件「${o.filename || o.name}」`
  }
  return `输出图表「${o.name}」（plotly Figure）`
}

/** 把执行响应压成给模型的摘要。 */
export function summarizePythonResponse(resp: PythonExecuteResponse): string {
  const parts: string[] = []
  if (!resp.ok) {
    const msg = annotateCustomCodeError(resp.error?.message || 'Python 执行失败')
    parts.push(`执行失败${resp.error?.line ? `（Line ${resp.error.line}）` : ''}：${msg}`)
  } else {
    parts.push('执行成功。')
  }
  if (resp.stdout?.trim()) parts.push(`stdout:\n${clip(resp.stdout.trim(), MAX_STDOUT)}`)
  if (resp.stderr?.trim()) parts.push(`stderr:\n${clip(resp.stderr.trim(), 600)}`)
  for (const o of resp.outputs ?? []) parts.push(summarizeOutput(o))
  return parts.join('\n\n')
}

export interface RunPythonCodeCtx {
  stepId: string
  /** 取当前编辑器代码（args.code 缺省时执行它）。 */
  getCode: () => string
}

export async function execRunPythonCode(
  ctx: RunPythonCodeCtx,
  args: Record<string, unknown>,
): Promise<ToolExecResult> {
  const analysis = useAnalysisStore().current
  const step = analysis?.steps.find((s) => s.id === ctx.stepId)
  if (!analysis || !step) {
    return { ok: false, summary: '找不到对应 Custom Code 步骤（可能已被删除）。' }
  }
  const code = typeof args.code === 'string' && args.code.trim() ? (args.code as string) : ctx.getCode()
  if (!code.trim()) {
    return { ok: false, summary: '当前没有可执行的代码。请先给出代码再运行验证。' }
  }
  const built = buildCustomCodeInputPayloads(analysis, step, analysis.files ?? [])
  if (built.error || !built.payloads.length) {
    return { ok: false, summary: `无法准备上游输入：${built.error || '无输入'}。请让用户先连接 Input dataset。` }
  }
  let resp: PythonExecuteResponse
  try {
    resp = await callPythonExecute({ code, inputs: built.payloads, limits: { timeoutSec: DRAFT_TIMEOUT_SEC } })
  } catch (e) {
    return { ok: false, summary: `执行请求失败（Python worker 可能未启动）：${e instanceof Error ? e.message : String(e)}` }
  }
  return { ok: resp.ok, summary: summarizePythonResponse(resp) }
}
