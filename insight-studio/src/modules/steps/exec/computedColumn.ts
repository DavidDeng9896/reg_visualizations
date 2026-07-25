import type { AnalysisTable } from '../../../shared/types'
import { applyTransforms, parseExpression } from '../../../shared/pipeline'
import { createTable } from '../../../shared/factories'
import type { StepExecCtx, StepExecResult, StepPreviewResult } from './types'

export interface ComputedColumnConfig {
  name: string
  expression: string
}

function readConfig(config: Record<string, unknown>): ComputedColumnConfig {
  return {
    name: (config.name as string) ?? '',
    expression: (config.expression as string) ?? '',
  }
}

export function validateComputedColumn(input: AnalysisTable, config: Record<string, unknown>): string | null {
  const { name, expression } = readConfig(config)
  if (!name.trim()) return '请输入新列名'
  if (!expression.trim()) return '请输入表达式'
  try {
    parseExpression(expression)
  } catch (e) {
    return e instanceof Error ? e.message : '表达式解析失败'
  }
  if (input.columns.some((c) => c.field === name)) return `列 "${name}" 已存在，将被覆盖`
  return null
}

export function executeComputedColumn(input: AnalysisTable, config: Record<string, unknown>, name: string): StepExecResult {
  const { name: colName, expression } = readConfig(config)
  const err = validateComputedColumn(input, config)
  if (err) return { status: 'failed', error: err }
  try {
    const out = applyTransforms(input.columns, input.rows, [{ id: '', type: 'derived', name: colName, expression }])
    const table = createTable(name, out.columns, out.rows, 'step')
    return { status: 'configured', outputTables: [table] }
  } catch (e) {
    return { status: 'failed', error: e instanceof Error ? e.message : 'Computed column 执行失败' }
  }
}

export function previewComputedColumn(input: AnalysisTable, config: Record<string, unknown>, limit: number): StepPreviewResult {
  const err = validateComputedColumn(input, config)
  if (err) return { columns: input.columns, rows: [], totalRows: 0, error: err }
  const { name: colName, expression } = readConfig(config)
  try {
    const out = applyTransforms(input.columns, input.rows, [{ id: '', type: 'derived', name: colName, expression }])
    return { columns: out.columns, rows: out.rows.slice(0, limit), totalRows: out.rows.length }
  } catch (e) {
    return { columns: input.columns, rows: [], totalRows: 0, error: e instanceof Error ? e.message : 'Computed column 预览失败' }
  }
}

export function execComputedColumn(ctx: StepExecCtx): StepExecResult {
  const input = Object.values(ctx.inputs)[0] as AnalysisTable | undefined
  if (!input) return { status: 'failed', error: '缺少输入表' }
  return executeComputedColumn(input, ctx.step.config, ctx.step.name)
}
