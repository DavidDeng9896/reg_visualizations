/**
 * 用户主动中止 / 历史回看时，清理会话内进行中 UI。
 * 有计划时保留「继续任务」检查点（不再 planDismissed）。
 */
export interface AbortableTrace {
  running?: boolean
  ok?: boolean
  summary: string
  needsConfirmation?: boolean
  confirmed?: boolean
  rejected?: boolean
  ask?: unknown
  askSettled?: boolean
}

export interface AbortableMessage {
  role: string
  /** 流式/生成中标记：中止或回看后必须清掉，否则进展转圈会挂住。 */
  streaming?: boolean
  planSteps?: string[]
  incomplete?: boolean
  planDismissed?: boolean
  trace: AbortableTrace[]
}

/** 清掉瞬态进行中 UI（streaming / running），供回看、落盘快照共用（不改计划状态）。 */
export function clearTransientProgress(messages: AbortableMessage[]): void {
  for (const m of messages) {
    if (m.role !== 'assistant') continue
    m.streaming = false
    if (!Array.isArray(m.trace)) continue
    for (const t of m.trace) {
      if (t.running) t.running = false
    }
  }
}

/** 中止进行中的工具/确认/提问；若仍有计划则保留「继续任务」。 */
export function applyUserAbortToMessages(messages: AbortableMessage[]): void {
  for (const m of messages) {
    if (m.role !== 'assistant') continue
    m.streaming = false
    const hasPlan = !!(m.planSteps?.length || m.incomplete)
    if (hasPlan) {
      m.incomplete = true
      m.planDismissed = false
    }
    for (const t of m.trace) {
      if (t.running) {
        t.running = false
        t.ok = false
        if (!t.summary?.trim()) t.summary = '已中止，可从检查点继续任务'
      }
      if (t.needsConfirmation && !t.confirmed && !t.rejected) {
        t.rejected = true
        t.needsConfirmation = false
        t.summary = '用户中止了本次生成，危险操作未执行。'
      }
      if (t.ask && !t.askSettled) {
        t.askSettled = true
        t.ask = undefined
      }
    }
  }
}
