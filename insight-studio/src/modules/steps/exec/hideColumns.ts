import type { AnalysisTable, SelectTransform } from '../../../shared/types'
import { applyTransforms } from '../../../shared/pipeline'
import { createTable } from '../../../shared/factories'
import type { StepExecCtx, StepExecResult, StepPreviewResult } from './types'

export interface HideColumnsConfig {
  mode: SelectTransform['mode']
  columns: string[]
}

function readConfig(config: Record<string, unknown>): HideColumnsConfig {
  return {
    mode: (config.mode as SelectTransform['mode']) ?? 'drop',
    columns: (config.columns as string[] | undefined) ?? [],
  }
}

export function executeHideColumns(input: AnalysisTable, config: Record<string, unknown>, name: string): StepExecResult {
  const { mode, columns } = readConfig(config)
  try {
    const out = applyTransforms(input.columns, input.rows, [{ id: '', type: 'select', mode, columns }])
    const table = createTable(name, out.columns, out.rows, 'step')
    return { status: 'configured', outputTables: [table] }
  } catch (e) {
    return { status: 'failed', error: e instanceof Error ? e.message : 'Hide columns 执行失败' }
  }
}

export function previewHideColumns(input: AnalysisTable, config: Record<string, unknown>, limit: number): StepPreviewResult {
  const { mode, columns } = readConfig(config)
  try {
    const out = applyTransforms(input.columns, input.rows, [{ id: '', type: 'select', mode, columns }])
    return { columns: out.columns, rows: out.rows.slice(0, limit), totalRows: out.rows.length }
  } catch (e) {
    return { columns: input.columns, rows: [], totalRows: 0, error: e instanceof Error ? e.message : 'Hide columns 预览失败' }
  }
}

export function execHideColumns(ctx: StepExecCtx): StepExecResult {
  const input = Object.values(ctx.inputs)[0] as AnalysisTable | undefined
  if (!input) return { status: 'failed', error: '缺少输入表' }
  return executeHideColumns(input, ctx.step.config, ctx.step.name)
}
