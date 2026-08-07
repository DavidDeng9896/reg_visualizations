/**
 * 用户主动中止生成时，清理会话内「可续跑 / 进行中」状态，
 * 避免再弹出「继续任务」卡片，并立刻停掉光影/转圈等进行中 UI。
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
  /** 流式/生成中标记：中止后必须立刻清掉，否则进展转圈与思考卡会挂住。 */
  streaming?: boolean
  planSteps?: string[]
  incomplete?: boolean
  planDismissed?: boolean
  trace: AbortableTrace[]
}

/** 关闭所有检查点续跑提示，并结算进行中的工具/确认/提问。 */
export function applyUserAbortToMessages(messages: AbortableMessage[]): void {
  for (const m of messages) {
    if (m.role !== 'assistant') continue
    m.streaming = false
    if (m.planSteps?.length || m.incomplete) {
      m.planDismissed = true
      m.incomplete = false
    }
    for (const t of m.trace) {
      if (t.running) {
        t.running = false
        t.ok = false
        if (!t.summary?.trim()) t.summary = '已中止'
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
