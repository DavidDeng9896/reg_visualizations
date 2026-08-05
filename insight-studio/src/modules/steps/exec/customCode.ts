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
  } else if (/^[A-Za-z0-9+/=]+$/.test(ref) && ref.length > 16) {
    contentBase64 = ref
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

  const datasets = (ctx.inputs['Input datasets'] ?? []) as AnalysisTable[]
  const list = Array.isArray(datasets) ? datasets : datasets ? [datasets as AnalysisTable] : []

  const inputs: Record<string, unknown>[] = list.map(tableToPayload)

  // 文件：按连线顺序从 analysis.files 取（Input files 端口目前 resolve 仅表；用 step.inputs 补）
  const fileRefs = ctx.step.inputs.filter((i) => i.port === 'Input files')
  const files = opts?.analysisFiles ?? ctx.analysis.files ?? []
  for (const ref of fileRefs) {
    const fromStep = ctx.analysis.steps.find((s) => s.id === ref.from.nodeId)
    const fileIds = fromStep?.output.files ?? []
    for (const fid of fileIds) {
      const f = files.find((x) => x.id === fid)
      if (!f) continue
      const p = fileToPayload(f)
      if (p) inputs.push(p)
    }
  }

  if (!inputs.length) {
    return { status: 'failed', error: 'Custom Code 需要至少一个 Input dataset 或带内容的 Input file' }
  }

  let resp: PythonExecuteResponse
  try {
    resp = await callPythonExecute({ code, inputs, limits: { timeoutSec: 300 } }, opts?.fetchImpl)
  } catch (e) {
    return { status: 'failed', error: e instanceof Error ? e.message : String(e) }
  }

  if (!resp.ok) {
    const msg = resp.error?.message || 'Python 执行失败'
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
