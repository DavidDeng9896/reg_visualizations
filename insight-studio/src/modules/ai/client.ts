/**
 * AI 助手前端核心类型：OpenAI 消息 / 工具调用 / SSE 解析 / 配置与会话 API。
 */

import { getCurrentUserId, USER_ID_HEADER } from '../shell/currentUser'

/* ------------------------------- 消息类型 ------------------------------- */

export interface ToolCall {
  id: string
  type: 'function'
  function: { name: string; arguments: string }
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content?: string | null
  tool_calls?: ToolCall[]
  tool_call_id?: string
  name?: string
}

export interface ChatPayload {
  messages: ChatMessage[]
  tools?: unknown[]
  model?: string
}

/** 聚合后的 SSE delta。 */
interface SseDelta {
  content?: string
  /** 推理模型的思考流（如 qwen 系 reasoning_content）。 */
  reasoning_content?: string
  tool_calls?: Array<{
    index: number
    id?: string
    type?: string
    function?: { name?: string; arguments?: string }
  }>
}

interface SseChunk {
  choices?: Array<{ delta?: SseDelta; finish_reason?: string | null }>
}

/* ------------------------------- SSE 解析 ------------------------------- */

/**
 * 解析 OpenAI SSE 流：逐 chunk 回调 delta 文本与 tool_calls 增量，
 * 返回聚合后的 assistant 消息（content + tool_calls，附 reasoning 思考全文）。
 */
export async function readSseStream(
  res: Response,
  onToken?: (text: string) => void,
  onReasoningToken?: (text: string) => void,
): Promise<ChatMessage & { reasoning?: string }> {
  if (!res.body) throw new Error('响应无流式内容')
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let content = ''
  let reasoning = ''
  const calls = new Map<number, ToolCall>()

  function applyChunk(chunk: SseChunk): void {
    const delta = chunk.choices?.[0]?.delta
    if (!delta) return
    if (delta.content) {
      content += delta.content
      onToken?.(delta.content)
    }
    if (delta.reasoning_content) {
      reasoning += delta.reasoning_content
      onReasoningToken?.(delta.reasoning_content)
    }
    if (delta.tool_calls) {
      for (const part of delta.tool_calls) {
        const idx = part.index ?? 0
        const cur = calls.get(idx) ?? {
          id: part.id ?? `call_${idx}`,
          type: 'function' as const,
          function: { name: '', arguments: '' },
        }
        if (part.id) cur.id = part.id
        if (part.function?.name) cur.function.name += part.function.name
        if (part.function?.arguments) cur.function.arguments += part.function.arguments
        calls.set(idx, cur)
      }
    }
  }

  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      const t = line.trim()
      if (!t.startsWith('data:')) continue
      const data = t.slice(5).trim()
      if (data === '[DONE]') continue
      try {
        applyChunk(JSON.parse(data) as SseChunk)
      } catch {
        /* 忽略半包/心跳行 */
      }
    }
  }

  const toolCalls = [...calls.values()].filter((c) => c.function.name)
  return {
    role: 'assistant',
    content: content || null,
    ...(toolCalls.length ? { tool_calls: toolCalls } : {}),
    ...(reasoning ? { reasoning } : {}),
  }
}

/* ------------------------------- HTTP API ------------------------------- */

function userHeaders(): Record<string, string> {
  return { [USER_ID_HEADER]: getCurrentUserId() }
}

async function req<T>(path: string, init?: RequestInit, opts?: { withUser?: boolean }): Promise<T> {
  const withUser = opts?.withUser === true
  const res = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(withUser ? userHeaders() : {}),
      ...(init?.headers ?? {}),
    },
  })
  if (res.status === 204) return undefined as T
  const text = await res.text()
  if (!res.ok) {
    let msg = text
    try {
      msg = (JSON.parse(text) as { error?: string; message?: string }).message ?? (JSON.parse(text) as { error?: string }).error ?? text
    } catch {
      /* 非 JSON */
    }
    throw new Error(`AI 服务错误（${res.status}）：${msg}`)
  }
  return JSON.parse(text) as T
}

export interface AiPublicConfig {
  baseUrl: string
  apiKeyMasked: string
  configured: boolean
  model: string
  /** 备选模型（输入条可切换）。 */
  models: string[]
  maxIterations: number
  confirmDestructive: boolean
}

export const aiConfigApi = {
  get: () => req<AiPublicConfig>('/api/ai/config'),
  put: (patch: Partial<{ baseUrl: string; apiKey: string; model: string; models: string[]; maxIterations: number; confirmDestructive: boolean }>) =>
    req<{ ok: boolean; configured: boolean }>('/api/ai/config', { method: 'PUT', body: JSON.stringify(patch) }),
}

/** 发送一轮对话（SSE）。缺配置时后端返回 409 → 抛错。 */
export async function postChat(payload: ChatPayload, signal?: AbortSignal): Promise<Response> {
  const res = await fetch('/api/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, stream: true }),
    signal,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    let msg = text
    try {
      const j = JSON.parse(text) as { error?: string; message?: string }
      msg = j.message ?? j.error ?? text
    } catch {
      /* ignore */
    }
    if (res.status === 409) throw new Error('AI 未配置：请先在设置中填写 API Key')
    throw new Error(`模型请求失败（${res.status}）：${String(msg).slice(0, 300)}`)
  }
  return res
}

/* ------------------------------- 会话 API ------------------------------- */

export interface ConversationMeta {
  id: string
  analysisId: string | null
  title: string
  createdAt: string
  updatedAt: string
}

export interface ConversationDoc extends ConversationMeta {
  messages: unknown[]
}

export const aiConvApi = {
  list: () => req<ConversationMeta[]>('/api/ai/conversations', undefined, { withUser: true }),
  get: (id: string) => req<ConversationDoc>(`/api/ai/conversations/${encodeURIComponent(id)}`, undefined, { withUser: true }),
  create: (body: { analysisId?: string | null; title?: string; messages?: unknown[] }) =>
    req<ConversationDoc>('/api/ai/conversations', { method: 'POST', body: JSON.stringify(body) }, { withUser: true }),
  update: (id: string, body: { title?: string; messages?: unknown[]; analysisId?: string | null }) =>
    req<ConversationDoc>(`/api/ai/conversations/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(body) }, { withUser: true }),
  remove: (id: string) =>
    req<void>(`/api/ai/conversations/${encodeURIComponent(id)}`, { method: 'DELETE' }, { withUser: true }),
}

/* ------------------------------- Skills / MCP ------------------------------- */

export interface SkillInfo {
  id: string
  name: string
  version: string
  description: string
  tags?: string[]
  source: 'official' | 'user' | string
  enabled: boolean
}

export interface SkillDetail extends SkillInfo {
  body: string
}

export const aiSkillsApi = {
  list: () => req<SkillInfo[]>('/api/ai/skills', undefined, { withUser: true }),
  get: (id: string) => req<SkillDetail>(`/api/ai/skills/${encodeURIComponent(id)}`, undefined, { withUser: true }),
  setEnabled: (id: string, enabled: boolean) =>
    req<SkillInfo>(`/api/ai/skills/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ enabled }),
    }, { withUser: true }),
  remove: (id: string) =>
    req<void>(`/api/ai/skills/${encodeURIComponent(id)}`, { method: 'DELETE' }, { withUser: true }),
  importZip: async (file: File): Promise<SkillInfo> => {
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch('/api/ai/skills/import', {
      method: 'POST',
      body: fd,
      headers: userHeaders(),
    })
    const text = await res.text()
    if (!res.ok) {
      let msg = text
      try {
        const j = JSON.parse(text) as { error?: string; message?: string }
        msg = j.message || j.error || text
      } catch {
        /* ignore */
      }
      throw new Error(`导入失败（${res.status}）：${msg}`)
    }
    return JSON.parse(text) as SkillInfo
  },
  /** 导入 .zip 或 .md（与 importZip 同一端点）。 */
  importFile: async (file: File): Promise<SkillInfo> => aiSkillsApi.importZip(file),
}

export interface McpHeaderKV {
  key: string
  value: string
}

export interface McpToolDef {
  name: string
  description?: string
  inputSchema?: Record<string, unknown>
}

export interface McpServerView {
  id: string
  name: string
  url: string
  enabled: boolean
  headersConfigured: boolean
  headerKeys: string[]
  lastRefreshAt?: string
  lastError?: string
  cachedTools?: McpToolDef[]
  toolCount: number
}

export interface McpEnabledTool {
  serverId: string
  serverName: string
  name: string
  description?: string
  inputSchema?: Record<string, unknown>
}

export const aiMcpApi = {
  listServers: () => req<McpServerView[]>('/api/ai/mcp/servers', undefined, { withUser: true }),
  create: (body: { name: string; url: string; headers?: McpHeaderKV[] }) =>
    req<McpServerView>('/api/ai/mcp/servers', { method: 'POST', body: JSON.stringify(body) }, { withUser: true }),
  patch: (
    id: string,
    body: { name?: string; url?: string; headers?: McpHeaderKV[]; enabled?: boolean },
  ) =>
    req<McpServerView>(`/api/ai/mcp/servers/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }, { withUser: true }),
  remove: (id: string) =>
    req<void>(`/api/ai/mcp/servers/${encodeURIComponent(id)}`, { method: 'DELETE' }, { withUser: true }),
  refresh: (id: string) =>
    req<McpServerView>(`/api/ai/mcp/servers/${encodeURIComponent(id)}/refresh`, { method: 'POST' }, { withUser: true }),
  listTools: () => req<McpEnabledTool[]>('/api/ai/mcp/tools', undefined, { withUser: true }),
  callTool: (body: { serverId: string; name: string; arguments?: Record<string, unknown> }) =>
    req<{ ok: boolean; result: unknown }>('/api/ai/mcp/tools/call', {
      method: 'POST',
      body: JSON.stringify(body),
    }, { withUser: true }),
}

export interface AiMemory {
  id: string
  content: string
  createdAt: string
  updatedAt: string
}

export const aiMemoriesApi = {
  list: () => req<AiMemory[]>('/api/ai/memories', undefined, { withUser: true }),
  create: (content: string) =>
    req<AiMemory>('/api/ai/memories', { method: 'POST', body: JSON.stringify({ content }) }, { withUser: true }),
  remove: (id: string) =>
    req<void>(`/api/ai/memories/${encodeURIComponent(id)}`, { method: 'DELETE' }, { withUser: true }),
}
