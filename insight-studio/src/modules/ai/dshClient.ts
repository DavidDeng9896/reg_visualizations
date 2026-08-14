/**
 * DeepSeek Harness 前端客户端：SSE 事件仍映射为 AgentEvent，AiDrawer 协议不变。
 */
import { getCurrentUserId, USER_ID_HEADER } from '../shell/currentUser'
import type { AgentEvent } from './agentLoop'
import type { DbConnectionProfile } from '../table/dbConnectionTypes'

export interface DshPromptInput {
  sessionId: string
  text: string
  model?: string
  analysisId?: string
  context?: string
  sqlConnections?: DbConnectionProfile[]
  confirmDestructive?: boolean
  confirmWrite?: boolean
  images?: Array<{ url: string }>
  signal?: AbortSignal
  onEvent: (e: AgentEvent) => void
}

async function readAgentSse(res: Response, onEvent: (e: AgentEvent) => void, signal?: AbortSignal): Promise<void> {
  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => '')
    throw new Error(text || `dsh HTTP ${res.status}`)
  }
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buf = ''
  while (true) {
    if (signal?.aborted) throw new DOMException('已中止', 'AbortError')
    const { done, value } = await reader.read()
    if (done) break
    buf += decoder.decode(value, { stream: true })
    const chunks = buf.split('\n\n')
    buf = chunks.pop() ?? ''
    for (const chunk of chunks) {
      let event = 'message'
      let data = ''
      for (const line of chunk.split('\n')) {
        if (line.startsWith('event:')) event = line.slice(6).trim()
        else if (line.startsWith('data:')) data += line.slice(5).trim()
      }
      if (!data) continue
      if (event === 'agent' || event === 'message') {
        try {
          onEvent(JSON.parse(data) as AgentEvent)
        } catch {
          /* ignore malformed */
        }
      }
    }
  }
}

export async function dshPrompt(input: DshPromptInput): Promise<void> {
  const res = await fetch('/api/ai/agent/prompt', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      [USER_ID_HEADER]: getCurrentUserId(),
    },
    body: JSON.stringify({
      sessionId: input.sessionId,
      text: input.text,
      model: input.model,
      analysisId: input.analysisId,
      context: input.context,
      sqlConnections: input.sqlConnections,
      confirmDestructive: input.confirmDestructive,
      confirmWrite: input.confirmWrite,
      images: input.images,
    }),
    signal: input.signal,
  })
  await readAgentSse(res, input.onEvent, input.signal)
}

export async function dshAnswer(sessionId: string, id: string, answer: string): Promise<void> {
  await fetch('/api/ai/agent/answer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', [USER_ID_HEADER]: getCurrentUserId() },
    body: JSON.stringify({ sessionId, id, answer }),
  })
}

export async function dshConfirm(sessionId: string, id: string, decision: 'confirm' | 'reject'): Promise<void> {
  await fetch('/api/ai/agent/confirm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', [USER_ID_HEADER]: getCurrentUserId() },
    body: JSON.stringify({ sessionId, id, decision }),
  })
}

export async function dshAbort(sessionId: string): Promise<void> {
  await fetch('/api/ai/agent/abort', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', [USER_ID_HEADER]: getCurrentUserId() },
    body: JSON.stringify({ sessionId }),
  }).catch(() => undefined)
}
