import type { AgentEvent } from '../../insight-studio/src/modules/ai/agentLoop'
import type { Artifact } from '../../insight-studio/src/modules/ai/types'

/** 把 dsh SessionEvent 尽量映射到现有 AiDrawer AgentEvent。 */
export function sessionEventToAgentEvents(event: unknown): AgentEvent[] {
  if (!event || typeof event !== 'object') return []
  const e = event as Record<string, unknown>
  const type = String(e.type ?? e.kind ?? '')
  const data = (e.data && typeof e.data === 'object' ? e.data : e) as Record<string, unknown>

  if (type === 'assistant/chunk' || type === 'assistant_chunk') {
    const chunk = data.chunk && typeof data.chunk === 'object' ? (data.chunk as Record<string, unknown>) : data
    const chunkType = String(chunk.type ?? '')
    if (chunkType === 'text-delta' && typeof chunk.text === 'string' && chunk.text) {
      return [{ type: 'token', text: chunk.text }]
    }
    if (chunkType === 'reasoning-delta' && typeof chunk.text === 'string' && chunk.text) {
      return [{ type: 'reasoning', text: chunk.text }]
    }
    const text = extractText(data)
    const reasoning = extractReasoning(data)
    const out: AgentEvent[] = []
    if (reasoning) out.push({ type: 'reasoning', text: reasoning })
    if (text) out.push({ type: 'token', text })
    return out
  }

  if (type === 'assistant/message' || type === 'assistant_message') {
    const msg = data.message && typeof data.message === 'object' ? (data.message as Record<string, unknown>) : data
    const text = extractText(msg)
    return text ? [{ type: 'token', text }] : []
  }

  if (type === 'tool/call' || type === 'tool_call') {
    const name = String(data.name ?? data.toolName ?? 'tool')
    const id = String(data.callId ?? data.id ?? data.toolCallId ?? name)
    const args = data.arguments ?? data.args ?? {}
    return [
      {
        type: 'tool_call',
        running: true,
        call: {
          id,
          type: 'function',
          function: {
            name,
            arguments: typeof args === 'string' ? args : JSON.stringify(args ?? {}),
          },
        },
      },
    ]
  }

  if (type === 'tool/result' || type === 'tool_result') {
    const message = data.message && typeof data.message === 'object' ? (data.message as Record<string, unknown>) : data
    const content = Array.isArray(message.content) ? message.content : []
    const block = content[0] && typeof content[0] === 'object' ? (content[0] as Record<string, unknown>) : undefined
    const name = String(data.name ?? data.toolName ?? 'tool')
    const id = String(block?.toolCallId ?? data.callId ?? data.id ?? data.toolCallId ?? name)
    const inner = block?.content ?? data.value ?? data.result ?? data
    const parsed = asToolValue(inner, extractText(typeof inner === 'object' && inner ? (inner as Record<string, unknown>) : data))
    const summary = parsed.summary || extractText(data) || JSON.stringify(inner ?? {})
    return [
      {
        type: 'tool_result',
        id,
        name,
        ok: parsed.ok && block?.isError !== true,
        summary,
        artifact: parsed.artifact,
        needsConfirmation: parsed.needsConfirmation,
      },
    ]
  }

  if (type === 'turn/end' || type === 'turn_end') {
    const reason = data.reason
    if (reason && typeof reason === 'object') {
      const r = reason as Record<string, unknown>
      if (String(r.kind ?? '') === 'error') {
        const err = (r.error && typeof r.error === 'object' ? r.error : r.failure) as Record<string, unknown> | undefined
        const msg = String(err?.message ?? 'LLM 请求失败')
        return [{ type: 'error', message: msg }]
      }
    }
    /* 正常结束由 HTTP 桥统一发 done，避免空 content 覆盖已流式正文 */
    return []
  }

  return []
}

function extractText(data: Record<string, unknown>): string {
  if (typeof data.text === 'string') return data.text
  if (typeof data.content === 'string') return data.content
  const content = data.content
  if (Array.isArray(content)) {
    return content
      .map((b) => {
        if (!b || typeof b !== 'object') return ''
        const block = b as Record<string, unknown>
        if (typeof block.text === 'string') return block.text
        if (Array.isArray(block.content)) return extractText(block)
        return ''
      })
      .join('')
  }
  const delta = data.delta
  if (delta && typeof delta === 'object' && typeof (delta as { text?: string }).text === 'string') {
    return (delta as { text: string }).text
  }
  const chunk = data.chunk
  if (chunk && typeof chunk === 'object' && typeof (chunk as { text?: string }).text === 'string') {
    return (chunk as { text: string }).text
  }
  return ''
}

function extractReasoning(data: Record<string, unknown>): string {
  if (typeof data.reasoning === 'string') return data.reasoning
  if (typeof data.thinking === 'string') return data.thinking
  const delta = data.delta
  if (delta && typeof delta === 'object' && typeof (delta as { reasoning?: string }).reasoning === 'string') {
    return (delta as { reasoning: string }).reasoning
  }
  return ''
}

function asToolValue(
  value: unknown,
  fallbackText = '',
): {
  ok: boolean
  summary: string
  artifact?: Artifact
  needsConfirmation?: boolean
} {
  if (Array.isArray(value)) {
    const text = value
      .map((b) => (b && typeof b === 'object' && 'text' in b ? String((b as { text: unknown }).text ?? '') : ''))
      .join('')
    try {
      return asToolValue(JSON.parse(text), text)
    } catch {
      return { ok: true, summary: text || fallbackText }
    }
  }
  if (value && typeof value === 'object') {
    const v = value as Record<string, unknown>
    if ('summary' in v || 'ok' in v) {
      return {
        ok: v.ok !== false,
        summary: String(v.summary ?? fallbackText),
        artifact: v.artifact as Artifact | undefined,
        needsConfirmation: v.needsConfirmation === true,
      }
    }
  }
  if (typeof value === 'string') {
    try {
      return asToolValue(JSON.parse(value), value)
    } catch {
      return { ok: true, summary: value }
    }
  }
  return { ok: true, summary: fallbackText || JSON.stringify(value ?? {}) }
}
