import type { AnalysisTable, ColumnMeta, Row } from '../../../shared/types'
import { ROW_ID_FIELD } from '../../../shared/types'
import { uuid } from '../../../shared/id'
import { createTable } from '../../../shared/factories'
import type { StepExecCtx, StepExecResult, StepPreviewResult } from './types'

/**
 * - primary：以首表列结构为准，其它表按列名映射，多余列丢弃（默认，适合统一组件多表拼接）
 * - name：列名取并集，缺列补 null（其它表多出的列会让首表行出现大量空单元格）
 * - position：以首表列数为准，按列位置映射
 */
export type UnionAlignBy = 'primary' | 'name' | 'position'

export interface UnionStepConfig {
  alignBy: UnionAlignBy
  fillNull: boolean
  addSourceColumn: boolean
}

function readConfig(config: Record<string, unknown>): UnionStepConfig {
  const raw = config.alignBy as string | undefined
  // 兼容旧配置：未指定时用 primary
  const alignBy: UnionAlignBy =
    raw === 'name' || raw === 'position' || raw === 'primary' ? raw : 'primary'
  return {
    alignBy,
    fillNull: (config.fillNull as boolean) ?? true,
    addSourceColumn: (config.addSourceColumn as boolean) ?? false,
  }
}

export function validateUnion(inputs: AnalysisTable[], config?: Record<string, unknown>): string | null {
  if (inputs.length < 2) return 'Union 至少需要两个输入表'
  const cfg = config ? readConfig(config) : null
  if (!cfg || cfg.fillNull) return null

  const primaryFields = inputs[0].columns.map((c) => c.field)

  if (cfg.alignBy === 'name') {
    // 严格模式：不补 null，要求所有输入列完全一致
    const base = primaryFields.join('\0')
    for (const input of inputs.slice(1)) {
      if (input.columns.map((c) => c.field).join('\0') !== base) {
        return '未开启“缺失列填充 null”时，所有输入表的列必须完全一致'
      }
    }
    return null
  }

  if (cfg.alignBy === 'primary') {
    for (const input of inputs.slice(1)) {
      const fields = new Set(input.columns.map((c) => c.field))
      const missing = primaryFields.filter((f) => !fields.has(f))
      if (missing.length) {
        return `未开启“缺失列填充 null”时，表「${input.name}」缺少首表列：${missing.join(', ')}`
      }
    }
    return null
  }

  // position：严格要求列数不少于首表
  const n = primaryFields.length
  for (const input of inputs.slice(1)) {
    if (input.columns.length < n) {
      return `未开启“缺失列填充 null”时，表「${input.name}」列数少于首表（${input.columns.length} < ${n}）`
    }
  }
  return null
}

function resolveFieldOrder(inputs: AnalysisTable[], alignBy: UnionAlignBy): string[] {
  if (alignBy === 'primary' || alignBy === 'position') {
    return (inputs[0]?.columns ?? []).map((c) => c.field)
  }
  // name：列名并集，按首次出现顺序
  const fieldOrder: string[] = []
  for (const input of inputs) {
    for (const c of input.columns) {
      if (!fieldOrder.includes(c.field)) fieldOrder.push(c.field)
    }
  }
  return fieldOrder
}

function resolveOutColumns(inputs: AnalysisTable[], fieldOrder: string[], alignBy: UnionAlignBy): ColumnMeta[] {
  if (alignBy === 'primary' || alignBy === 'position') {
    return (inputs[0]?.columns ?? []).map((c) => ({ ...c }))
  }
  const outCols: ColumnMeta[] = []
  for (const f of fieldOrder) {
    const src = inputs.find((i) => i.columns.some((c) => c.field === f))
    const col = src?.columns.find((c) => c.field === f)
    if (col) outCols.push({ ...col })
  }
  return outCols
}

function unionTables(inputs: AnalysisTable[], config: UnionStepConfig): { columns: ColumnMeta[]; rows: Row[] } {
  const { alignBy, addSourceColumn } = config
  const fieldOrder = resolveFieldOrder(inputs, alignBy)
  const outCols = resolveOutColumns(inputs, fieldOrder, alignBy)

  if (addSourceColumn) {
    outCols.push({ field: '__source', title: 'Source', dataType: 'string' })
  }

  const rows: Row[] = []
  inputs.forEach((input, idx) => {
    for (const r of input.rows) {
      const out: Row = { [ROW_ID_FIELD]: uuid() }
      for (const f of fieldOrder) {
        if (alignBy === 'position') {
          const col = input.columns[fieldOrder.indexOf(f)]
          out[f] = col ? (r[col.field] ?? null) : null
        } else {
          // primary / name：按列名取值
          out[f] = r[f] ?? null
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
