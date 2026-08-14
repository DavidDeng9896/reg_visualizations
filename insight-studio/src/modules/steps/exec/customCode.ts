/**
 * Custom Code 步骤：序列化上游表/文件 → POST /api/python/execute → 物化输出。
 */
import type {
  Analysis,
  AnalysisChartArtifact,
  AnalysisFile,
  AnalysisTable,
  ColumnMeta,
  DataType,
  Row,
} from '../../../shared/types'
import { uuid } from '../../../shared/id'
import { nowIso } from '../../../shared/datetime'
import { ensureRowIds, sealRows } from '../../../shared/factories'
import { ROW_ID_FIELD } from '../../../shared/types'
import { findTable } from '../../../shared/tree'
import { getStepDef, resolveTableOutputPort } from '../registry'
import { annotateCustomCodeError } from '../customCodeTemplate'
import type { StepExecCtx, StepExecResult } from './types'

export interface PythonExecuteResponse {
  ok: boolean
  outputs?: Array<{
    name: string
    kind: 'dataframe' | 'file' | 'figure'
    columns?: Array<{ field?: string; name?: string; title?: string; dataType?: string; dtype?: string }>
    rows?: Row[]
    filename?: string
    contentBase64?: string
    plotlyJson?: Record<string, unknown>
  }>
  stdout?: string
  stderr?: string
  error?: { message?: string; line?: number; type?: string } | null
}

function inferDataType(v: unknown): DataType {
  if (typeof v === 'number' && Number.isFinite(v)) return 'number'
  if (typeof v === 'boolean') return 'boolean'
  return 'string'
}

function columnsFromPayload(
  cols: Array<{ field?: string; name?: string; title?: string; dataType?: string; dtype?: string }> | undefined,
  rows: Row[],
): ColumnMeta[] {
  if (Array.isArray(cols) && cols.length) {
    return cols.map((c, i) => {
      const field = String(c.field ?? c.name ?? `col_${i}`)
      const title = String(c.title ?? field)
      const dt = c.dataType ?? c.dtype
      const dataType: DataType =
        dt === 'number' || dt === 'float' || dt === 'int' || dt === 'int64' || dt === 'float64'
          ? 'number'
          : dt === 'boolean' || dt === 'bool'
            ? 'boolean'
            : 'string'
      return { field, title, dataType }
    })
  }
  const keys = new Set<string>()
  for (const r of rows.slice(0, 50)) {
    for (const k of Object.keys(r)) {
      if (k !== ROW_ID_FIELD) keys.add(k)
    }
  }
  return [...keys].map((field) => ({
    field,
    title: field,
    dataType: inferDataType(rows.find((r) => r[field] != null)?.[field]),
  }))
}

function tableToPayload(t: AnalysisTable): Record<string, unknown> {
  const rows = t.rows.map((r) => {
    const o: Record<string, unknown> = {}
    for (const c of t.columns) o[c.field] = r[c.field] ?? null
    return o
  })
  return {
    name: t.name,
    kind: 'dataframe',
    columns: t.columns.map((c) => ({ field: c.field, title: c.title, dataType: c.dataType })),
    rows,
  }
}

function fileToPayload(f: AnalysisFile): Record<string, unknown> | null {
  const ref = f.contentRef || ''
  let contentBase64 = ''
  if (ref.startsWith('data:') && ref.includes(',')) {
    contentBase64 = ref.slice(ref.indexOf(',') + 1)
  } else if (/^[A-Za-z0-9+/=\s]+$/.test(ref) && ref.replace(/\s/g, '').length > 16) {
    contentBase64 = ref.replace(/\s/g, '')
  } else {
    return null
  }
  return {
    name: f.name,
    kind: 'file',
    filename: f.name,
    contentBase64,
  }
}

/** 解析上游步骤某 table 端口上的全部输出表（一端口多表）。 */
export function findOutputTables(
  analysis: Analysis,
  nodeId: string,
  port: string,
): AnalysisTable[] {
  const step = analysis.steps.find((s) => s.id === nodeId)
  if (!step) return []
  const resolved = resolveTableOutputPort(step.type, port)
  if (!resolved) return []
  const def = getStepDef(step.type)
  const portDef = def.outputs.find((o) => o.name === resolved)
  if (!portDef || portDef.type !== 'table') return []
  return (step.output.tables ?? [])
    .map((id) => findTable(analysis, id))
    .filter((t): t is AnalysisTable => !!t)
}

/** 解析上游步骤 Output files 端口上的文件（跳过 stdout/stderr 伪端口）。 */
export function findOutputFiles(
  analysis: Analysis,
  nodeId: string,
  port: string,
  files: AnalysisFile[] = analysis.files ?? [],
): AnalysisFile[] {
  if (port === 'Standard error' || port === 'Standard output') return []
  const step = analysis.steps.find((s) => s.id === nodeId)
  if (!step) return []
  const def = getStepDef(step.type)
  const portDef = def.outputs.find((o) => o.name === port)
  if (!portDef || portDef.type !== 'file') return []
  return (step.output.files ?? [])
    .map((id) => files.find((f) => f.id === id))
    .filter((f): f is AnalysisFile => !!f)
}

/**
 * 按 step.inputs 连线顺序展开 Input datasets / Input files → Worker 入参。
 * 同一条边若源端口为 multiple，则展开该端口全部产物。
 */
export function buildCustomCodeInputPayloads(
  analysis: Analysis,
  step: { inputs: { port: string; from: { nodeId: string; port: string } }[] },
  files: AnalysisFile[] = analysis.files ?? [],
): { payloads: Record<string, unknown>[]; error?: string } {
  const payloads: Record<string, unknown>[] = []
  const missing: string[] = []

  for (const ref of step.inputs) {
    if (ref.port === 'Input datasets') {
      const tables = findOutputTables(analysis, ref.from.nodeId, ref.from.port)
      if (!tables.length) {
        missing.push(`无法解析上游表（${ref.from.nodeId} / ${ref.from.port}）`)
        continue
      }
      for (const t of tables) payloads.push(tableToPayload(t))
    } else if (ref.port === 'Input files') {
      const outs = findOutputFiles(analysis, ref.from.nodeId, ref.from.port, files)
      if (!outs.length) {
        missing.push(`无法解析上游文件（${ref.from.nodeId} / ${ref.from.port}）`)
        continue
      }
      for (const f of outs) {
        const p = fileToPayload(f)
        if (!p) {
          missing.push(`文件「${f.name}」缺少可序列化内容（contentRef）`)
          continue
        }
        payloads.push(p)
      }
    }
  }

  if (!payloads.length) {
    return {
      payloads: [],
      error:
        missing[0] ||
        'Custom Code 需要至少一个 Input dataset 或带内容的 Input file',
    }
  }
  if (missing.length) {
    return { payloads: [], error: missing.join('；') }
  }
  return { payloads }
}

export async function callPythonExecute(
  body: Record<string, unknown>,
  fetchImpl: typeof fetch = fetch,
): Promise<PythonExecuteResponse> {
  const res = await fetchImpl('/api/python/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const json = (await res.json()) as PythonExecuteResponse
  return json
}

export async function execCustomCode(
  ctx: StepExecCtx,
  opts?: { fetchImpl?: typeof fetch; analysisFiles?: AnalysisFile[] },
): Promise<StepExecResult> {
  const code = String(ctx.step.config.code ?? '')
  if (!code.trim()) {
    return { status: 'failed', error: '请先编写 custom_code 函数', errorLine: undefined }
  }

  const files = opts?.analysisFiles ?? ctx.analysis.files ?? []
  const built = buildCustomCodeInputPayloads(ctx.analysis, ctx.step, files)
  if (built.error || !built.payloads.length) {
    return { status: 'failed', error: built.error || 'Custom Code 需要至少一个 Input dataset 或带内容的 Input file' }
  }
  const inputs = built.payloads

  let resp: PythonExecuteResponse
  try {
    resp = await callPythonExecute({ code, inputs, limits: { timeoutSec: 300 } }, opts?.fetchImpl)
  } catch (e) {
    return { status: 'failed', error: e instanceof Error ? e.message : String(e) }
  }

  if (!resp.ok) {
    const msg = annotateCustomCodeError(resp.error?.message || 'Python 执行失败')
    return {
      status: 'failed',
      error: resp.error?.line ? `Line ${resp.error.line}: ${msg}` : msg,
      errorLine: resp.error?.line,
      stdout: resp.stdout,
      stderr: resp.stderr,
    }
  }

  const outputTables: AnalysisTable[] = []
  const outputFiles: AnalysisFile[] = []
  const outputCharts: AnalysisChartArtifact[] = []

  for (const o of resp.outputs ?? []) {
    if (o.kind === 'dataframe') {
      const rows = (o.rows ?? []) as Row[]
      const columns = columnsFromPayload(o.columns, rows)
      outputTables.push({
        id: uuid(),
        name: o.name || 'custom_code_output',
        source: 'step',
        columns,
        rows: sealRows(ensureRowIds(rows)),
        filters: [],
        views: [],
        stepId: ctx.step.id,
      })
    } else if (o.kind === 'file') {
      const b64 = o.contentBase64 ?? ''
      const filename = o.filename || o.name || 'output.bin'
      outputFiles.push({
        id: uuid(),
        name: filename,
        sizeBytes: Math.floor((b64.length * 3) / 4),
        mimeHint: 'application/octet-stream',
        contentRef: `data:application/octet-stream;base64,${b64}`,
        importedAt: nowIso(),
      })
    } else if (o.kind === 'figure' && o.plotlyJson) {
      outputCharts.push({
        id: uuid(),
        name: o.name || 'chart',
        stepId: ctx.step.id,
        plotlyJson: o.plotlyJson,
      })
    }
  }

  return {
    status: 'configured',
    outputTables,
    outputFiles,
    outputCharts,
    stdout: resp.stdout,
    stderr: resp.stderr,
  }
}
