import type { Analysis, AnalysisTable, StepNode } from '../../../shared/types'
import { findTable } from '../../../shared/tree'
import { getStepDef } from '../registry'
import type { StepExecCtx, StepExecResult, StepPreviewResult } from './types'
import { execComputedColumn, previewComputedColumn } from './computedColumn'
import { execFilter, previewFilter } from './filter'
import { execHideColumns, previewHideColumns } from './hideColumns'
import { execJoin, previewJoin } from './join'
import { execUnion, previewUnion } from './union'
import { execCustomCode } from './customCode'

export * from './types'
export { executeFilter, previewFilter } from './filter'
export { executeHideColumns, previewHideColumns } from './hideColumns'
export { executeComputedColumn, previewComputedColumn } from './computedColumn'
export { executeJoin, previewJoin, computeJoinStats } from './join'
export { executeUnion, previewUnion } from './union'

/** 已实现执行/预览逻辑的步骤类型（Add step 面板只应展示这些）。 */
export const IMPLEMENTED_STEP_TYPES: ReadonlySet<string> = new Set([
  'filter',
  'hide-columns',
  'computed-column',
  'join',
  'union',
  'custom-code',
])

/**
 * 按 step.inputs 解析上游输出表。
 * 输入端口为 multiple 时返回数组；单输入时返回单个 AnalysisTable。
 */
export function resolveStepInputs(analysis: Analysis, step: StepNode): Record<string, AnalysisTable | AnalysisTable[]> {
  const def = getStepDef(step.type)
  const inputs: Record<string, AnalysisTable | AnalysisTable[]> = {}

  for (const portDef of def.inputs) {
    const refs = step.inputs.filter((i) => i.port === portDef.name)
    if (portDef.multiple) {
      inputs[portDef.name] = refs
        .map((r) => findOutputTable(analysis, r.from.nodeId, r.from.port))
        .filter((t): t is AnalysisTable => !!t)
    } else {
      const ref = refs[0]
      if (ref) {
        const t = findOutputTable(analysis, ref.from.nodeId, ref.from.port)
        if (t) inputs[portDef.name] = t
      }
    }
  }

  return inputs
}

function findOutputTable(analysis: Analysis, nodeId: string, port: string): AnalysisTable | null {
  const step = analysis.steps.find((s) => s.id === nodeId)
  if (!step) return null
  const def = getStepDef(step.type)
  const portDef = def.outputs.find((o) => o.name === port)
  if (!portDef || portDef.type !== 'table') return null
  const tableId = step.output.tables[0]
  if (!tableId) return null
  return findTable(analysis, tableId) ?? null
}

/** 执行单个步骤，返回结果但不修改 analysis（调用方负责写入）。同步步骤用。 */
export function executeStep(analysis: Analysis, step: StepNode): StepExecResult {
  if (step.type === 'custom-code') {
    return { status: 'failed', error: 'Custom Code 请使用 runStepAsync' }
  }
  const inputs = resolveStepInputs(analysis, step)
  const ctx: StepExecCtx = { analysis, step, inputs }

  switch (step.type) {
    case 'filter':
      return execFilter(ctx)
    case 'hide-columns':
      return execHideColumns(ctx)
    case 'computed-column':
      return execComputedColumn(ctx)
    case 'join':
      return execJoin(ctx)
    case 'union':
      return execUnion(ctx)
    default:
      return { status: 'failed', error: `步骤 "${step.type}" 尚未实现执行逻辑` }
  }
}

/** 异步执行（Custom Code 走 Worker；其它步骤与 executeStep 相同）。 */
export async function executeStepAsync(analysis: Analysis, step: StepNode): Promise<StepExecResult> {
  if (step.type === 'custom-code') {
    const inputs = resolveStepInputs(analysis, step)
    const ctx: StepExecCtx = { analysis, step, inputs }
    return execCustomCode(ctx, { analysisFiles: analysis.files })
  }
  return executeStep(analysis, step)
}

/** 预览单个步骤（不修改 analysis）。 */
export function previewStep(
  analysis: Analysis,
  step: StepNode,
  limit = 50,
): StepPreviewResult {
  const inputs = resolveStepInputs(analysis, step)
  const ctx: StepExecCtx = { analysis, step, inputs }

  switch (step.type) {
    case 'filter': {
      const input = Object.values(inputs)[0] as AnalysisTable | undefined
      if (!input) return { columns: [], rows: [], totalRows: 0, error: '缺少输入表' }
      return previewFilter(input, step.config, limit)
    }
    case 'hide-columns': {
      const input = Object.values(inputs)[0] as AnalysisTable | undefined
      if (!input) return { columns: [], rows: [], totalRows: 0, error: '缺少输入表' }
      return previewHideColumns(input, step.config, limit)
    }
    case 'computed-column': {
      const input = Object.values(inputs)[0] as AnalysisTable | undefined
      if (!input) return { columns: [], rows: [], totalRows: 0, error: '缺少输入表' }
      return previewComputedColumn(input, step.config, limit)
    }
    case 'join': {
      const left = inputs['Left table'] as AnalysisTable | undefined
      const right = inputs['Right table'] as AnalysisTable | undefined
      if (!left || !right) return { columns: [], rows: [], totalRows: 0, error: 'Join 需要左右两个输入表' }
      return previewJoin(left, right, step.config, limit)
    }
    case 'union': {
      const tables = (inputs['Input tables'] ?? []) as AnalysisTable[]
      return previewUnion(tables, step.config, limit)
    }
    default:
      return { columns: [], rows: [], totalRows: 0, error: `步骤 "${step.type}" 尚未实现预览逻辑` }
  }
}

/**
 * 把执行结果写回 analysis：新增/替换输出表、更新 step.output 与 status。
 * 重跑时复用旧输出表 id（保留其视图与表级过滤），并清理不再产出的旧表。
 */
export function applyStepResult(
  analysis: Analysis,
  step: StepNode,
  result: StepExecResult,
): void {
  step.status = result.status
  step.error = result.error
  if (result.stdout !== undefined) step.config.__stdout = result.stdout
  if (result.stderr !== undefined) step.config.__stderr = result.stderr
  if (result.errorLine !== undefined) step.config.__errorLine = result.errorLine
  // 失败时保留旧输出表与 output 引用，用户仍可查看上一次成功结果
  if (result.status === 'failed') return
  const oldTableIds = step.output.tables.slice()
  const oldFileIds = step.output.files.slice()
  const oldChartIds = step.output.charts?.slice() ?? []

  const newTables = result.outputTables ?? []
  const newFiles = result.outputFiles ?? []
  const newCharts = result.outputCharts ?? []

  if (!newTables.length && !newFiles.length && !newCharts.length) {
    step.output = { tables: [], files: [], views: [], charts: [] }
    removeTables(analysis, oldTableIds)
    removeFiles(analysis, oldFileIds)
    removeCharts(analysis, oldChartIds)
    return
  }

  const outputTableIds: string[] = []
  newTables.forEach((t, i) => {
    const oldId = oldTableIds[i]
    const oldIdx = oldId ? analysis.tables.findIndex((x) => x.id === oldId) : -1
    t.stepId = step.id
    if (oldIdx >= 0) {
      t.id = oldId
      t.views = analysis.tables[oldIdx].views
      t.filters = analysis.tables[oldIdx].filters
      analysis.tables[oldIdx] = t
    } else {
      analysis.tables.push(t)
    }
    outputTableIds.push(t.id)
  })
  removeTables(analysis, oldTableIds.slice(newTables.length))

  if (!analysis.files) analysis.files = []
  const outputFileIds: string[] = []
  newFiles.forEach((f, i) => {
    const oldId = oldFileIds[i]
    const oldIdx = oldId ? analysis.files.findIndex((x) => x.id === oldId) : -1
    if (oldIdx >= 0) {
      f.id = oldId
      analysis.files[oldIdx] = f
    } else {
      analysis.files.push(f)
    }
    outputFileIds.push(f.id)
  })
  removeFiles(analysis, oldFileIds.slice(newFiles.length))

  if (!analysis.charts) analysis.charts = []
  const outputChartIds: string[] = []
  newCharts.forEach((ch, i) => {
    const oldId = oldChartIds[i]
    const oldIdx = oldId ? analysis.charts!.findIndex((x) => x.id === oldId) : -1
    ch.stepId = step.id
    if (oldIdx >= 0) {
      ch.id = oldId
      analysis.charts![oldIdx] = ch
    } else {
      analysis.charts!.push(ch)
    }
    outputChartIds.push(ch.id)
  })
  removeCharts(analysis, oldChartIds.slice(newCharts.length))

  step.output = { tables: outputTableIds, files: outputFileIds, views: [], charts: outputChartIds }
}

/** 从 analysis 移除指定表（若存在）。 */
function removeTables(analysis: Analysis, tableIds: string[]): void {
  if (!tableIds.length) return
  const drop = new Set(tableIds)
  analysis.tables = analysis.tables.filter((t) => !drop.has(t.id))
}

function removeFiles(analysis: Analysis, fileIds: string[]): void {
  if (!fileIds.length || !analysis.files?.length) return
  const drop = new Set(fileIds)
  analysis.files = analysis.files.filter((f) => !drop.has(f.id))
}

function removeCharts(analysis: Analysis, chartIds: string[]): void {
  if (!chartIds.length || !analysis.charts?.length) return
  const drop = new Set(chartIds)
  analysis.charts = analysis.charts.filter((c) => !drop.has(c.id))
}

/** 一键执行并应用单个步骤结果（同步步骤）。 */
export function runStep(analysis: Analysis, step: StepNode): StepExecResult {
  const result = executeStep(analysis, step)
  applyStepResult(analysis, step, result)
  return result
}

/** 一键异步执行（Custom Code 必须用此入口）。 */
export async function runStepAsync(analysis: Analysis, step: StepNode): Promise<StepExecResult> {
  step.status = 'running'
  const result = await executeStepAsync(analysis, step)
  applyStepResult(analysis, step, result)
  return result
}
