/**
 * 工具结果长度预算：防止 Skill/MCP 全文撑爆主 agent 上下文。
 */
export const TOOL_RESULT_SOFT = 2500
export const TOOL_RESULT_HARD = 4000

/** 裁剪 tool 回灌文本；优先保留头尾，中间标注省略。 */
export function clipToolResult(text: string, soft = TOOL_RESULT_SOFT, hard = TOOL_RESULT_HARD): string {
  const s = String(text ?? '')
  if (s.length <= soft) return s
  if (s.length <= hard) {
    return `${s.slice(0, soft)}\n\n…(已截断 ${s.length - soft} 字，需要细节请再派子代理查阅)…`
  }
  const head = Math.floor(hard * 0.7)
  const tail = hard - head - 80
  return `${s.slice(0, head)}\n\n…(中间省略 ${s.length - head - Math.max(0, tail)} 字)…\n\n${s.slice(-Math.max(0, tail))}`
}

/** 计划是否仍有未完成步骤。 */
export function planIncomplete(steps: string[] | undefined, done: number[] | undefined): boolean {
  if (!steps?.length) return false
  const set = new Set(done ?? [])
  return steps.some((_, i) => !set.has(i))
}

export function pendingPlanSteps(steps: string[], done: number[] | undefined): Array<{ index: number; text: string }> {
  const set = new Set(done ?? [])
  return steps.map((text, index) => ({ index, text })).filter((x) => !set.has(x.index))
}

export function planNudgeMessage(steps: string[], done: number[] | undefined): string {
  const pending = pendingPlanSteps(steps, done)
  const list = pending.map((p) => `${p.index + 1}. ${p.text}`).join('\n')
  return `【计划未完成 — 禁止结束】仍有 ${pending.length} 步未 mark_step_done：\n${list}\n请继续调用工具完成剩余步骤（主循环直接做或再派规划师/MCP 专家/分析师/工程师均可）；每完成一步调用 mark_step_done(index)。全部完成后再用中文简短总结。`
}

export function continueTaskSystemMessage(steps: string[], done: number[] | undefined): string {
  const pending = pendingPlanSteps(steps, done)
  const doneList = (done ?? [])
    .slice()
    .sort((a, b) => a - b)
    .map((i) => `${i + 1}. ${steps[i] ?? ''}`)
    .filter((s) => s.length > 3)
  if (!pending.length) {
    return '请检查是否还有未完成的用户目标；若已完成请简要确认产物。禁止重新 submit_plan。'
  }
  const list = pending.map((p) => `${p.index + 1}. ${p.text}`).join('\n')
  const doneBlock = doneList.length ? `已完成（勿重复执行）：\n${doneList.join('\n')}\n` : ''
  return `【续跑检查点】从断点继续，不要重做已完成工作。
${doneBlock}剩余（仅做这些）：
${list}
硬性要求：
1. 禁止再次调用 submit_plan（计划已存在，重置会丢掉进度）。
2. 已完成步骤的产物若上下文/工具历史中已有，直接复用。
3. 从未完成的最小 index 继续；每完成一步 mark_step_done(index)。
4. 禁止过程独白；直接 tool_calls。全部完成后简短总结。`
}
