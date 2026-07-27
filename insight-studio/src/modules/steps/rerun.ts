/**
 * 步骤重跑与 stale 状态机（对齐 Benchling「上游变更 → 下游 stale → 重新运行」）。
 * - 手动编辑某表后，产出该表的步骤的下游标记 stale；
 * - 画布/节点提供 Run / Run all 重新物化，恢复 configured。
 */
import type { Analysis, StepNode } from '../../shared/types'
import { IMPLEMENTED_STEP_TYPES, runStep } from './exec'

/** 下游步骤 id 集合（BFS，不含自身）。 */
export function downstreamStepIds(analysis: Analysis, stepId: string): Set<string> {
  const out = new Set<string>()
  const queue = [stepId]
  while (queue.length) {
    const cur = queue.shift()!
    for (const s of analysis.steps) {
      if (out.has(s.id)) continue
      if (s.inputs.some((i) => i.from.nodeId === cur)) {
        out.add(s.id)
        queue.push(s.id)
      }
    }
  }
  return out
}

/** 把某步骤的所有下游 configured 步骤标记为 stale。 */
export function markDownstreamStale(analysis: Analysis, stepId: string): void {
  for (const id of downstreamStepIds(analysis, stepId)) {
    const s = analysis.steps.find((x) => x.id === id)
    if (s && s.status === 'configured') s.status = 'stale'
  }
}

/** 依据产出表找到步骤（source 表被手动编辑时用）。 */
export function stepOfTable(analysis: Analysis, tableId: string): StepNode | null {
  const t = analysis.tables.find((x) => x.id === tableId)
  if (!t?.stepId) return null
  return analysis.steps.find((s) => s.id === t.stepId) ?? null
}

/** 手动编辑某表后：把产出该表的步骤的下游标 stale。 */
export function markTableEdited(analysis: Analysis, tableId: string): void {
  const step = stepOfTable(analysis, tableId)
  if (step) markDownstreamStale(analysis, step.id)
}

/**
 * 数据内容变更后驱动整条 flowchart 同步：
 * 下游标 stale，并按拓扑序自动重跑（默认行为，对齐产品拍板）。
 * @returns 成功重跑的步骤数
 */
export function propagateTableEdit(analysis: Analysis, tableId: string): number {
  markTableEdited(analysis, tableId)
  return rerunStaleSteps(analysis)
}

/** 重跑单个步骤（仅限已实现执行逻辑的类型），返回是否成功。 */
export function rerunStep(analysis: Analysis, step: StepNode): boolean {
  if (!IMPLEMENTED_STEP_TYPES.has(step.type)) return false
  runStep(analysis, step)
  return step.status !== 'failed'
}

/** 是否存在 stale 步骤。 */
export function hasStaleSteps(analysis: Analysis): boolean {
  return analysis.steps.some((s) => s.status === 'stale')
}

/** 拓扑序重跑所有可执行的 stale 步骤（父先子后），返回成功重跑的数量。 */
export function rerunStaleSteps(analysis: Analysis): number {
  const stale = new Set(
    analysis.steps.filter((s) => s.status === 'stale' && IMPLEMENTED_STEP_TYPES.has(s.type)).map((s) => s.id),
  )
  if (!stale.size) return 0
  let ran = 0
  let progress = true
  let guard = 0
  while (progress && guard < 100) {
    guard += 1
    progress = false
    for (const s of analysis.steps) {
      if (!stale.has(s.id)) continue
      // 等上游 stale 先重跑
      if (s.inputs.some((i) => stale.has(i.from.nodeId))) continue
      rerunStep(analysis, s)
      stale.delete(s.id)
      ran += 1
      progress = true
    }
  }
  return ran
}
