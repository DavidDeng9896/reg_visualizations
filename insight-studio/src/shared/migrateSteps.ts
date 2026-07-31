/**
 * 旧 Analysis → 新步骤图模型的自动迁移。
 * 幂等：已迁移（有 __legacyTables）或已有 steps 的 analysis 直接返回。
 */
import type { Analysis, AnalysisTable, CombineInputRef, CombineSpec, StepNode, StepType } from './types'
import { uuid } from './id'
import { nowIso } from './datetime'
import { emptyStepOutput } from '../modules/steps/registry'

/** 判断 analysis 是否已经迁移到步骤模型 / 无需再迁移。 */
export function isMigrated(analysis: Analysis): boolean {
  if (Array.isArray(analysis.__legacyTables)) return true
  // 新模型：已有步骤图（导入/画布产生），切勿再跑迁移以免清空 steps
  if (Array.isArray(analysis.steps) && analysis.steps.length > 0) return true
  return false
}

interface MigrationContext {
  tableSteps: Map<string, StepNode>
  legacyCombines: Map<string, CombineSpec>
}

/** 备份旧表并生成等价步骤图。 */
export function migrateAnalysisToSteps(analysis: Analysis): Analysis {
  if (isMigrated(analysis)) {
    // 补齐标记，避免仅有 steps、无 __legacyTables 的文档每次被误判
    if (!Array.isArray(analysis.__legacyTables)) analysis.__legacyTables = []
    return analysis
  }

  // 备份旧表（深拷贝），便于调试与潜在回退。
  analysis.__legacyTables = JSON.parse(JSON.stringify(analysis.tables)) as AnalysisTable[]

  const ctx: MigrationContext = {
    tableSteps: new Map<string, StepNode>(),
    legacyCombines: new Map<string, CombineSpec>(),
  }

  // 第一遍：为每个源表/合并表生成源/合并步骤。
  for (const table of analysis.tables) {
    const step = tableToStep(analysis, table, ctx)
    if (step) ctx.tableSteps.set(table.id, step)
  }

  // 第二遍：修正 combine 步骤输入引用（需要所有表步骤都已创建）。
  for (const step of ctx.tableSteps.values()) {
    if (step.type === 'join' || step.type === 'union') {
      resolveCombineInputs(analysis, step, ctx)
    }
  }

  analysis.steps = Array.from(ctx.tableSteps.values())
  analysis.updatedAt = nowIso()
  return analysis
}

/** 将单张表转换为步骤节点（就地修改 table.source / table.stepId）。 */
function tableToStep(
  _analysis: Analysis,
  table: AnalysisTable,
  ctx: MigrationContext,
): StepNode | null {
  if (table.stepId && ctx.tableSteps.has(table.id)) {
    return ctx.tableSteps.get(table.id)!
  }

  // 已是步骤产物但 steps 被误清空：按源类型尽量恢复节点，保留 stepId / 视图 / 图表
  if (table.source === 'step' || table.stepId) {
    const step: StepNode = {
      id: table.stepId || uuid(),
      type: 'upload-csv',
      name: table.name,
      inputs: [],
      config: { tableName: table.name },
      status: 'configured',
      output: { ...emptyStepOutput(), tables: [table.id] },
    }
    table.source = 'step'
    table.stepId = step.id
    return step
  }

  if (table.source === 'csv' || table.source === 'demo') {
    const step: StepNode = {
      id: uuid(),
      type: 'upload-csv',
      name: table.name,
      inputs: [],
      config: { tableName: table.name },
      status: 'configured',
      output: { ...emptyStepOutput(), tables: [table.id] },
    }
    table.source = 'step'
    table.stepId = step.id
    return step
  }

  if (table.source === 'combine' && table.combine) {
    // 备份旧 combine 配置，避免后续 table.combine 被清理后无法解析输入。
    ctx.legacyCombines.set(table.id, { ...table.combine, keys: table.combine.keys.map((k) => ({ ...k })) })

    const stepType: StepType = table.combine.joinType === 'append' ? 'union' : 'join'
    const step: StepNode = {
      id: uuid(),
      type: stepType,
      name: table.name,
      inputs: [], // 第二遍填充
      config: buildCombineConfig(table.combine),
      status: 'pending',
      output: { ...emptyStepOutput(), tables: [table.id] },
    }
    table.source = 'step'
    table.stepId = step.id
    return step
  }

  return null
}

function buildCombineConfig(combine: NonNullable<AnalysisTable['combine']>): Record<string, unknown> {
  if (combine.joinType === 'append') {
    return {
      alignBy: 'name',
      fillNull: true,
      addSourceColumn: false,
    }
  }
  return {
    joinType: combine.joinType,
    keys: combine.keys.map((k) => ({ left: k.left, right: k.right })),
    suffixes: ['_x', '_y'],
  }
}

/** 解析 combine 输入引用，转换为步骤输入。视图输入暂不支持，标记 pending。 */
function resolveCombineInputs(
  _analysis: Analysis,
  step: StepNode,
  ctx: MigrationContext,
): void {
  const combine = ctx.legacyCombines.get(step.output.tables[0] ?? '')
  if (!combine) return

  const refs: { ref: CombineInputRef; port: string }[] = [
    { ref: combine.left, port: 'Left table' },
    { ref: combine.right, port: 'Right table' },
  ]

  const inputs: StepNode['inputs'] = []
  let missing = false

  for (const { ref, port } of refs) {
    if (ref.kind === 'view') {
      // P0：视图输入暂不支持自动迁移，标记为 pending 等待用户重新配置。
      missing = true
      continue
    }
    const upstream = ctx.tableSteps.get(ref.tableId)
    if (!upstream) {
      missing = true
      continue
    }
    inputs.push({ port, from: { nodeId: upstream.id, port: 'Output dataset' } })
  }

  step.inputs = inputs
  step.status = missing ? 'pending' : 'configured'
  if (missing) {
    step.error = '迁移时部分 combine 输入（视图或非步骤表）无法自动解析，请重新配置输入。'
  }
}
