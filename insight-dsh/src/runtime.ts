import type { AgentEvent, AskRequest } from '../../insight-studio/src/modules/ai/agentLoop'
import type { DbConnectionProfile } from '../../insight-studio/src/modules/table/dbConnectionTypes'

export interface SessionRuntime {
  sessionId: string
  userId: string
  analysisId?: string
  confirmDestructive: boolean
  confirmWrite: boolean
  sqlConnections: DbConnectionProfile[]
  planSteps: string[]
  planDone: number[]
  /** e2e mock 场景名；续跑时复用。 */
  scenario?: string
  aborted: boolean
  emit(event: AgentEvent): void
  waitAsk(req: AskRequest): Promise<string>
  waitConfirm(req: { id: string; name: string; summary: string }): Promise<'confirm' | 'reject'>
  resolveAsk(id: string, answer: string): void
  resolveConfirm(id: string, decision: 'confirm' | 'reject'): void
  abort(): void
}

const sessions = new Map<string, SessionRuntime>()
const agentAlias = new Map<string, string>()

export function getSessionRuntime(sessionId: string): SessionRuntime | undefined {
  return sessions.get(sessionId) ?? sessions.get(agentAlias.get(sessionId) ?? '')
}

/** dsh agent.id 可能与前端 conversation id 不同，两边都要能找到 runtime。 */
export function bindAgentRuntime(sessionId: string, agentId: string): void {
  if (agentId && agentId !== sessionId) agentAlias.set(String(agentId), sessionId)
}

export function ensureSessionRuntime(
  sessionId: string,
  init: Partial<SessionRuntime> & { userId: string },
  onEvent: (e: AgentEvent) => void,
): SessionRuntime {
  const existing = sessions.get(sessionId)
  if (existing) {
    if (init.analysisId) existing.analysisId = init.analysisId
    if (init.sqlConnections) existing.sqlConnections = init.sqlConnections
    if (init.confirmDestructive != null) existing.confirmDestructive = init.confirmDestructive
    if (init.confirmWrite != null) existing.confirmWrite = init.confirmWrite
    existing.userId = init.userId
    existing.aborted = false
    existing.emit = onEvent
    return existing
  }

  const asks = new Map<string, (answer: string) => void>()
  const confirms = new Map<string, (d: 'confirm' | 'reject') => void>()

  const runtime: SessionRuntime = {
    sessionId,
    userId: init.userId,
    analysisId: init.analysisId,
    confirmDestructive: init.confirmDestructive ?? true,
    confirmWrite: init.confirmWrite ?? false,
    sqlConnections: init.sqlConnections ?? [],
    planSteps: [],
    planDone: [],
    aborted: false,
    emit: onEvent,
    waitAsk(req) {
      runtime.emit({ type: 'ask', id: req.id, question: req.question, options: req.options, allowOther: req.allowOther })
      return new Promise((resolve) => {
        asks.set(req.id, resolve)
      })
    },
    waitConfirm(req) {
      runtime.emit({
        type: 'tool_result',
        id: req.id,
        name: req.name,
        ok: false,
        summary: req.summary,
        needsConfirmation: true,
      })
      return new Promise((resolve) => {
        confirms.set(req.id, resolve)
      })
    },
    resolveAsk(id, answer) {
      const fn = asks.get(id)
      if (fn) {
        fn(answer)
        asks.delete(id)
        return
      }
      if (asks.size === 1) {
        const only = asks.values().next().value
        only?.(answer)
        asks.clear()
      }
    },
    resolveConfirm(id, decision) {
      const fn = confirms.get(id)
      if (fn) {
        fn(decision)
        confirms.delete(id)
        return
      }
      if (confirms.size === 1) {
        const only = confirms.values().next().value
        only?.(decision)
        confirms.clear()
      }
    },
    abort() {
      runtime.aborted = true
      for (const [, resolve] of asks) resolve('（用户中止）')
      asks.clear()
      for (const [, resolve] of confirms) resolve('reject')
      confirms.clear()
    },
  }
  sessions.set(sessionId, runtime)
  return runtime
}
