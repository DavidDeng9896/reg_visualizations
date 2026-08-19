import type { Analysis, StepNode } from '../../shared/types'

export const AI_CREATED_BY_KEY = '__createdBy'
export const AI_CREATED_BY_VALUE = 'ai'

export function markStepCreatedByAi(config: Record<string, unknown>): Record<string, unknown> {
  return { ...config, [AI_CREATED_BY_KEY]: AI_CREATED_BY_VALUE }
}

export function isAiCreatedStep(step: StepNode): boolean {
  return step.config?.[AI_CREATED_BY_KEY] === AI_CREATED_BY_VALUE
}

export function isPlaceholderCustomCode(code: unknown): boolean {
  const s = String(code ?? '').trim()
  if (!s) return true
  if (/raise NotImplementedError/.test(s) && /TODO: Return list of IOData/.test(s)) return true
  return false
}

function hasOutputs(step: StepNode): boolean {
  const o = step.output
  return (o.tables?.length ?? 0) + (o.files?.length ?? 0) + (o.charts?.length ?? 0) + (o.views?.length ?? 0) > 0
}

export function isFailedEmptyAiStep(step: StepNode): boolean {
  if (!isAiCreatedStep(step)) return false
  if (step.status !== 'failed' && step.status !== 'pending') return false
  if (hasOutputs(step)) return false
  if (step.type === 'custom-code') return isPlaceholderCustomCode(step.config.code)
  return true
}

export function hasDownstreamDependents(analysis: Analysis, stepId: string): boolean {
  return analysis.steps.some((s) => s.id !== stepId && s.inputs.some((i) => i.from.nodeId === stepId))
}

/** 可安全删除的 AI 失败空节点（无下游）。 */
export function listFailedEmptyAiSteps(analysis: Analysis): StepNode[] {
  return analysis.steps.filter((s) => isFailedEmptyAiStep(s) && !hasDownstreamDependents(analysis, s.id))
}
