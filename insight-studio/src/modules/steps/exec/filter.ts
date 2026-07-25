import type { AnalysisTable, Filter } from '../../../shared/types'
import { applyFilters } from '../../../shared/pipeline'
import { createTable } from '../../../shared/factories'
import type { StepExecCtx, StepExecResult, StepPreviewResult } from './types'

export interface FilterStepConfig {
  filters: Filter[]
}

function readConfig(config: Record<string, unknown>): FilterStepConfig {
  return { filters: (config.filters as Filter[] | undefined) ?? [] }
}

export function executeFilter(input: AnalysisTable, config: Record<string, unknown>, name: string): StepExecResult {
  const { filters } = readConfig(config)
  try {
    const rows = applyFilters(input.rows, filters, input.columns)
    const out = createTable(name, input.columns, rows, 'step')
    return { status: 'configured', outputTables: [out] }
  } catch (e) {
    return { status: 'failed', error: e instanceof Error ? e.message : 'Filter 执行失败' }
  }
}

export function previewFilter(input: AnalysisTable, config: Record<string, unknown>, limit: number): StepPreviewResult {
  const { filters } = readConfig(config)
  try {
    const rows = applyFilters(input.rows, filters, input.columns)
    return { columns: input.columns, rows: rows.slice(0, limit), totalRows: rows.length }
  } catch (e) {
    return { columns: input.columns, rows: [], totalRows: 0, error: e instanceof Error ? e.message : 'Filter 预览失败' }
  }
}

export function execFilter(ctx: StepExecCtx): StepExecResult {
  const input = Object.values(ctx.inputs)[0] as AnalysisTable | undefined
  if (!input) return { status: 'failed', error: '缺少输入表' }
  return executeFilter(input, ctx.step.config, ctx.step.name)
}
