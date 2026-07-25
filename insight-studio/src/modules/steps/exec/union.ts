import type { AnalysisTable, ColumnMeta, Row } from '../../../shared/types'
import { ROW_ID_FIELD } from '../../../shared/types'
import { uuid } from '../../../shared/id'
import { createTable } from '../../../shared/factories'
import type { StepExecCtx, StepExecResult, StepPreviewResult } from './types'

export interface UnionStepConfig {
  alignBy: 'name' | 'position'
  fillNull: boolean
  addSourceColumn: boolean
}

function readConfig(config: Record<string, unknown>): UnionStepConfig {
  return {
    alignBy: (config.alignBy as 'name' | 'position') ?? 'name',
    fillNull: (config.fillNull as boolean) ?? true,
    addSourceColumn: (config.addSourceColumn as boolean) ?? false,
  }
}

export function validateUnion(inputs: AnalysisTable[], config?: Record<string, unknown>): string | null {
  if (inputs.length < 2) return 'Union 至少需要两个输入表'
  const cfg = config ? readConfig(config) : null
  if (cfg && !cfg.fillNull && cfg.alignBy === 'name') {
    // 严格模式：不补 null，要求所有输入列完全一致
    const base = inputs[0].columns.map((c) => c.field).join('')
    for (const input of inputs.slice(1)) {
      if (input.columns.map((c) => c.field).join('') !== base) {
        return '未开启“缺失列填充 null”时，所有输入表的列必须完全一致'
      }
    }
  }
  return null
}

function unionTables(inputs: AnalysisTable[], config: UnionStepConfig): { columns: ColumnMeta[]; rows: Row[] } {
  const { alignBy, addSourceColumn } = config
  const outCols: ColumnMeta[] = []

  const fieldOrder: string[] = []
  for (const input of inputs) {
    for (const c of input.columns) {
      if (!fieldOrder.includes(c.field)) fieldOrder.push(c.field)
    }
  }

  if (alignBy === 'position') {
    // 按位置对齐：取第一张表的列名，其余按位置映射；多出的列追加。
    fieldOrder.length = 0
    const base = inputs[0]?.columns ?? []
    for (const c of base) fieldOrder.push(c.field)
  }

  for (const f of fieldOrder) {
    // 取第一个包含该列的表的元数据
    const src = inputs.find((i) => i.columns.some((c) => c.field === f))
    const col = src?.columns.find((c) => c.field === f)
    if (col) outCols.push(col)
  }

  if (addSourceColumn) {
    outCols.push({ field: '__source', title: 'Source', dataType: 'string' })
  }

  const rows: Row[] = []
  inputs.forEach((input, idx) => {
    for (const r of input.rows) {
      const out: Row = { [ROW_ID_FIELD]: uuid() }
      for (const f of fieldOrder) {
        if (alignBy === 'name') {
          out[f] = r[f] ?? null
        } else {
          const col = input.columns[fieldOrder.indexOf(f)]
          out[f] = col ? (r[col.field] ?? null) : null
        }
      }
      if (addSourceColumn) out.__source = input.name || `Table ${idx + 1}`
      rows.push(out)
    }
  })

  return { columns: outCols, rows }
}

export function executeUnion(inputs: AnalysisTable[], config: Record<string, unknown>, name: string): StepExecResult {
  const err = validateUnion(inputs, config)
  if (err) return { status: 'failed', error: err }
  const cfg = readConfig(config)
  try {
    const out = unionTables(inputs, cfg)
    const table = createTable(name, out.columns, out.rows, 'step')
    return { status: 'configured', outputTables: [table] }
  } catch (e) {
    return { status: 'failed', error: e instanceof Error ? e.message : 'Union 执行失败' }
  }
}

export function previewUnion(inputs: AnalysisTable[], config: Record<string, unknown>, limit: number): StepPreviewResult {
  const err = validateUnion(inputs, config)
  if (err) return { columns: [], rows: [], totalRows: 0, error: err }
  const cfg = readConfig(config)
  try {
    const out = unionTables(inputs, cfg)
    return { columns: out.columns, rows: out.rows.slice(0, limit), totalRows: out.rows.length }
  } catch (e) {
    return { columns: [], rows: [], totalRows: 0, error: e instanceof Error ? e.message : 'Union 预览失败' }
  }
}

export function execUnion(ctx: StepExecCtx): StepExecResult {
  const inputs = (ctx.inputs['Input tables'] ?? []) as AnalysisTable[]
  if (!Array.isArray(inputs) || inputs.length === 0) {
    return { status: 'failed', error: 'Union 缺少输入表' }
  }
  return executeUnion(inputs, ctx.step.config, ctx.step.name)
}
