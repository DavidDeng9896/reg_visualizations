/**
 * 步骤重跑与 stale 状态机（对齐 Benchling「上游变更 → 下游 stale → 重新运行」）。
 * - 手动编辑某表后，产出该表的步骤的下游标记 stale；
 * - 默认自动重跑下游，但受防抖与成本预算约束（见 schedulePropagateTableEdit）。
 */
import type { Analysis, StepNode } from '../../shared/types'
import { IMPLEMENTED_STEP_TYPES, runStep } from './exec'

/** 合并连续编辑的防抖窗口（ms）。 */
export const PROPAGATE_DEBOUNCE_MS = 200

/**
 * 自动重跑预算：源表行数 × 下游步骤数。
 * 超过则只标 stale，避免主线程卡死；用户可点 Run stale / 空闲后再跑。
 */
export const AUTO_RERUN_BUDGET = 200_000

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

/** 传播成本估算：源表行数 × 下游步骤数（含未实现类型，保守估计）。 */
export function estimatePropagateCost(analysis: Analysis, tableId: string): number {
  const table = analysis.tables.find((t) => t.id === tableId)
  if (!table) return 0
  const step = stepOfTable(analysis, tableId)
  if (!step) return 0
  const downstream = downstreamStepIds(analysis, step.id).size
  if (downstream === 0) return 0
  return table.rows.length * downstream
}

export function shouldAutoRerun(cost: number, budget: number = AUTO_RERUN_BUDGET): boolean {
  return cost <= budget
}

export type PropagateMode = 'reran' | 'stale-only' | 'noop'

/**
 * 同步传播：标 stale；成本允许则立刻重跑。
 * 测试与「强制立即同步」用；UI 编辑路径应走 schedulePropagateTableEdit。
 */
export function propagateTableEdit(
  analysis: Analysis,
  tableId: string,
  budget: number = AUTO_RERUN_BUDGET,
): { mode: PropagateMode; ran: number; cost: number } {
  const cost = estimatePropagateCost(analysis, tableId)
  markTableEdited(analysis, tableId)
  if (!hasStaleSteps(analysis)) return { mode: 'noop', ran: 0, cost }
  if (!shouldAutoRerun(cost, budget)) return { mode: 'stale-only', ran: 0, cost }
  const ran = rerunStaleSteps(analysis)
  return { mode: 'reran', ran, cost }
}

/* -------------------- 防抖调度：即时 stale + 延迟重跑 -------------------- */

type ApplyMutate = (fn: (analysis: Analysis) => void) => void

let propagateTimer: ReturnType<typeof setTimeout> | undefined
const pendingTableIds = new Set<string>()
let pendingApply: ApplyMutate | undefined
let pendingBudget = AUTO_RERUN_BUDGET

/** 测试用：取消未决的防抖传播。 */
export function cancelScheduledPropagate(): void {
  if (propagateTimer !== undefined) {
    clearTimeout(propagateTimer)
    propagateTimer = undefined
  }
  pendingTableIds.clear()
  pendingApply = undefined
}

function flushScheduledPropagate(): void {
  propagateTimer = undefined
  const apply = pendingApply
  const ids = [...pendingTableIds]
  const budget = pendingBudget
  pendingTableIds.clear()
  pendingApply = undefined
  if (!apply || ids.length === 0) return

  apply((analysis) => {
    const allowed = new Set<string>()
    for (const tableId of ids) {
      const step = stepOfTable(analysis, tableId)
      if (!step) continue
      markTableEdited(analysis, tableId)
      const cost = estimatePropagateCost(analysis, tableId)
      if (!shouldAutoRerun(cost, budget)) continue
      for (const id of downstreamStepIds(analysis, step.id)) allowed.add(id)
    }
    if (allowed.size === 0) return
    rerunStaleStepsIn(analysis, allowed)
  })
}

/**
 * UI 编辑入口：立刻标 stale（可感知），200ms 防抖后按成本决定是否自动重跑。
 * `apply` 一般为 `store.mutate`。
 */
export function schedulePropagateTableEdit(
  apply: ApplyMutate,
  tableId: string,
  options?: { debounceMs?: number; budget?: number },
): void {
  const debounceMs = options?.debounceMs ?? PROPAGATE_DEBOUNCE_MS
  pendingBudget = options?.budget ?? AUTO_RERUN_BUDGET
  pendingApply = apply
  pendingTableIds.add(tableId)

  // 即时：下游变 stale，flowchart 立刻有反馈
  apply((analysis) => markTableEdited(analysis, tableId))

  if (propagateTimer !== undefined) clearTimeout(propagateTimer)
  propagateTimer = setTimeout(flushScheduledPropagate, debounceMs)
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
  return rerunStaleStepsIn(
    analysis,
    new Set(analysis.steps.filter((s) => s.status === 'stale').map((s) => s.id)),
  )
}

/** 仅重跑 `allowed` 集合内且为 stale 的步骤（用于防抖合并、避免误跑无关大子图）。 */
export function rerunStaleStepsIn(analysis: Analysis, allowed: Set<string>): number {
  const stale = new Set(
    analysis.steps
      .filter((s) => s.status === 'stale' && allowed.has(s.id) && IMPLEMENTED_STEP_TYPES.has(s.type))
      .map((s) => s.id),
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
      // 等上游 stale 先重跑（仅当上游也在本次 allowed 集合内）
      if (s.inputs.some((i) => stale.has(i.from.nodeId))) continue
      rerunStep(analysis, s)
      stale.delete(s.id)
      ran += 1
      progress = true
    }
  }
  return ran
}
