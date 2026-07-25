import type { Analysis, AnalysisTable, StepNode, StepOutputRefs } from '../../../shared/types'
import { findTable } from '../../../shared/tree'
import { getStepDef } from '../registry'
import type { StepExecCtx, StepExecResult, StepPreviewResult } from './types'
import { execComputedColumn, previewComputedColumn } from './computedColumn'
import { execFilter, previewFilter } from './filter'
import { execHideColumns, previewHideColumns } from './hideColumns'
import { execJoin, previewJoin } from './join'
import { execUnion, previewUnion } from './union'

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

/** 执行单个步骤，返回结果但不修改 analysis（调用方负责写入）。 */
export function executeStep(analysis: Analysis, step: StepNode): StepExecResult {
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
  // 失败时保留旧输出表与 output 引用，用户仍可查看上一次成功结果
  if (result.status === 'failed') return
  const oldTableIds = step.output.tables.slice()

  if (!result.outputTables || result.outputTables.length === 0) {
    step.output = { tables: [], files: [], views: [] }
    removeTables(analysis, oldTableIds)
    return
  }

  const newTables = result.outputTables
  const outputTableIds: string[] = []

  newTables.forEach((t, i) => {
    const oldId = oldTableIds[i]
    const oldIdx = oldId ? analysis.tables.findIndex((x) => x.id === oldId) : -1
    t.stepId = step.id
    if (oldIdx >= 0) {
      // 复用旧表 id：视图树、表级过滤随 id 保留
      t.id = oldId
      t.views = analysis.tables[oldIdx].views
      t.filters = analysis.tables[oldIdx].filters
      analysis.tables[oldIdx] = t
    } else {
      analysis.tables.push(t)
    }
    outputTableIds.push(t.id)
  })

  // 清理本次不再产出的旧输出表（含失败但本次有产出之外的情况已由上方处理）
  removeTables(analysis, oldTableIds.slice(newTables.length))

  const output: StepOutputRefs = { tables: outputTableIds, files: [], views: [] }
  step.output = output
}

/** 从 analysis 移除指定表（若存在）。 */
function removeTables(analysis: Analysis, tableIds: string[]): void {
  if (!tableIds.length) return
  const drop = new Set(tableIds)
  analysis.tables = analysis.tables.filter((t) => !drop.has(t.id))
}

/** 一键执行并应用单个步骤结果。 */
export function runStep(analysis: Analysis, step: StepNode): StepExecResult {
  const result = executeStep(analysis, step)
  applyStepResult(analysis, step, result)
  return result
}
