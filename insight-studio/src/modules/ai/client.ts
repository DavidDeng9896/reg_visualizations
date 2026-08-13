/**
 * AI 助手前端核心类型：OpenAI 消息 / 工具调用 / SSE 解析 / 配置与会话 API。
 */

import { getCurrentUserId, USER_ID_HEADER } from '../shell/currentUser'
import { coerceArrayToolArgs } from './toolArgs'

/* ------------------------------- 消息类型 ------------------------------- */

export interface ToolCall {
  id: string
  type: 'function'
  function: { name: string; arguments: string }
}

/** 多模态内容块（OpenAI vision：文本 + 图片 data URL）。 */
export type ContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } }

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content?: string | ContentPart[] | null
  tool_calls?: ToolCall[]
  tool_call_id?: string
  name?: string
}

/** 从消息 content 取出纯文本（多模态时拼接 text parts）。 */
export function contentText(content: string | ContentPart[] | null | undefined): string {
  if (content == null) return ''
  if (typeof content === 'string') return content
  return content
    .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
    .map((p) => p.text)
    .join('\n')
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
 * 合并 SSE 中的 tool function.name / arguments。
 * OpenAI 多为增量片段；部分上游（如豆包）每帧重发完整值——盲 += 会翻倍：
 * name → 未知工具；arguments → JSON 损坏（如 submit_plan 变成 0 步）。
 */
export function mergeStreamedToolName(existing: string, incoming: string): string {
  if (!incoming) return existing
  if (!existing) return incoming
  if (incoming === existing) return existing
  if (incoming.startsWith(existing)) return incoming
  if (existing.startsWith(incoming)) return existing
  return existing + incoming
}

/** 与 name 相同策略；若已有合法 JSON 且 incoming 也是完整 JSON，保留已有。 */
export function mergeStreamedToolArguments(existing: string, incoming: string): string {
  if (!incoming) return existing
  if (!existing) return incoming
  if (incoming === existing) return existing
  if (incoming.startsWith(existing)) return incoming
  if (existing.startsWith(incoming)) return existing
  const existingOk = looksLikeJsonObject(existing)
  const incomingOk = looksLikeJsonObject(incoming)
  if (existingOk && incomingOk) return existing
  if (!existingOk && incomingOk) return incoming
  return existing + incoming
}

function looksLikeJsonObject(s: string): boolean {
  const t = s.trim()
  if (!t.startsWith('{') && !t.startsWith('[')) return false
  try {
    JSON.parse(t)
    return true
  } catch {
    return false
  }
}

/**
 * 保证 tool function.arguments 为合法 JSON 字符串（豆包要求）。
 * 无法修复时回退 "{}"，避免续跑 502 invalid_parameter_error。
 */
export function normalizeToolArguments(raw: unknown, toolName?: string): string {
  if (raw == null) return '{}'
  if (typeof raw === 'object') {
    try {
      const obj = raw as unknown
      if (Array.isArray(obj)) return JSON.stringify(coerceArrayToolArgs(obj, toolName))
      return JSON.stringify(raw)
    } catch {
      return '{}'
    }
  }
  let s = String(raw).trim()
  if (!s) return '{}'
  // 去掉偶发的 markdown fence
  const fence = s.match(/^```(?:json)?\s*([\s\S]*?)```$/i)
  if (fence) s = fence[1].trim()
  try {
    const parsed = JSON.parse(s) as unknown
    if (Array.isArray(parsed)) return JSON.stringify(coerceArrayToolArgs(parsed, toolName))
    return s
  } catch {
    /* continue */
  }
  const obj = s.match(/\{[\s\S]*\}/)
  if (obj) {
    try {
      JSON.parse(obj[0])
      return obj[0]
    } catch {
      /* continue */
    }
  }
  const arr = s.match(/\[[\s\S]*\]/)
  if (arr) {
    try {
      JSON.parse(arr[0])
      return arr[0]
    } catch {
      /* continue */
    }
  }
  return '{}'
}

/**
 * 纯文本 content 数组 → 单字符串（豆包 Seed 等拒收纯 text 的 content array）。
 */
export function flattenTextContent(
  content: string | ContentPart[] | null | undefined,
): string | ContentPart[] | null | undefined {
  if (!Array.isArray(content)) return content
  if (!content.length) return ''
  const allText = content.every((p) => p.type === 'text')
  if (!allText) return content
  return content
    .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
    .map((p) => p.text)
    .join('\n')
}

/**
 * 发往上游前规范化 messages，避免豆包 Invalid request body：
 * - 带 tool_calls 的 assistant：省略空 content（勿发 null，火山会 MissingParameter）
 * - 纯 text 的 content 数组压成 string
 * - tool 消息 content 必须为非空字符串
 * - 去掉无内容且无 tool_calls 的空消息；剔除 reasoning 等非标字段
 */
export function sanitizeChatMessages(messages: ChatMessage[]): ChatMessage[] {
  const out: ChatMessage[] = []
  for (const m of messages) {
    const raw = m as ChatMessage & { reasoning?: unknown }
    const next: ChatMessage = {
      role: raw.role,
      ...(raw.tool_call_id ? { tool_call_id: raw.tool_call_id } : {}),
      ...(raw.name ? { name: raw.name } : {}),
    }
    if (raw.tool_calls?.length) {
      next.tool_calls = raw.tool_calls
        .filter((c) => c?.function?.name)
        .map((c) => ({
          id: c.id || `call_${c.function.name}`,
          type: 'function' as const,
          function: {
            name: c.function.name,
            arguments: normalizeToolArguments(c.function.arguments, c.function.name),
          },
        }))
      if (!next.tool_calls.length) delete next.tool_calls
    }

    const flat = flattenTextContent(raw.content)
    if (next.role === 'tool') {
      const t = contentText(flat).trim()
      next.content = t || '(空)'
    } else if (next.role === 'assistant' && next.tool_calls?.length) {
      const t = contentText(flat).trim()
      // 火山/豆包：有 tool_calls 时不要发 content:null；有正文则保留，否则省略字段
      if (t) next.content = typeof flat === 'string' ? flat : t
    } else {
      const empty =
        flat == null ||
        (typeof flat === 'string' && flat.trim() === '') ||
        (Array.isArray(flat) && flat.length === 0)
      if (empty && !next.tool_calls?.length) continue
      if (flat != null) next.content = flat
    }
    out.push(next)
  }
  return out
}

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
        if (part.function?.name) {
          cur.function.name = mergeStreamedToolName(cur.function.name, part.function.name)
        }
        if (part.function?.arguments) {
          cur.function.arguments = mergeStreamedToolArguments(
            cur.function.arguments,
            part.function.arguments,
          )
        }
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

  const toolCalls = [...calls.values()]
    .filter((c) => c.function.name)
    .map((c) => ({
      ...c,
      function: {
        name: c.function.name,
        arguments: normalizeToolArguments(c.function.arguments),
      },
    }))
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
  /** 写入类工具（建表/改图/加步骤等）是否需用户确认。 */
  confirmWrite: boolean
}

export const aiConfigApi = {
  get: () => req<AiPublicConfig>('/api/ai/config'),
  put: (
    patch: Partial<{
      baseUrl: string
      apiKey: string
      model: string
      models: string[]
      maxIterations: number
      confirmDestructive: boolean
      confirmWrite: boolean
    }>,
  ) => req<{ ok: boolean; configured: boolean }>('/api/ai/config', { method: 'PUT', body: JSON.stringify(patch) }),
}

/** 发送一轮对话（SSE）。缺配置时后端返回 409 → 抛错。对 429/可重试 502 做有限次退避。 */
export const CHAT_RETRY = {
  maxAttempts: 4,
  /** 单次等待下限（测试可改为 0）。 */
  minDelayMs: 400,
}

export function shouldRetryChatError(status: number, message: string): boolean {
  if (status === 409) return false
  if (status === 429 || status === 503 || status === 504) return true
  if (status !== 502) return false
  return !/invalid_parameter|invalid request|ai 未配置/i.test(`${message}`)
}

export function chatRetryDelayMs(message: string, attempt: number): number {
  const hinted = Number(/after\s+(\d+)\s+seconds?/i.exec(message)?.[1] ?? 0) * 1000
  const exp = Math.min(16_000, 400 * 2 ** attempt)
  return Math.max(CHAT_RETRY.minDelayMs, hinted, exp)
}

function sleepChatRetry(ms: number, signal?: AbortSignal): Promise<void> {
  if (ms <= 0) return Promise.resolve()
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('已中止', 'AbortError'))
      return
    }
    const t = setTimeout(() => resolve(), ms)
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(t)
        reject(new DOMException('已中止', 'AbortError'))
      },
      { once: true },
    )
  })
}

function parseChatErrorBody(text: string): string {
  try {
    const j = JSON.parse(text) as { error?: string; message?: string }
    return j.message ?? j.error ?? text
  } catch {
    return text
  }
}

export async function postChat(payload: ChatPayload, signal?: AbortSignal): Promise<Response> {
  const body = JSON.stringify({
    ...payload,
    messages: sanitizeChatMessages(payload.messages),
    stream: true,
  })
  let lastMsg = ''
  let lastStatus = 0
  for (let attempt = 0; attempt < CHAT_RETRY.maxAttempts; attempt += 1) {
    if (signal?.aborted) throw new DOMException('已中止', 'AbortError')
    const res = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      signal,
    })
    if (res.ok) return res
    const text = await res.text().catch(() => '')
    lastStatus = res.status
    lastMsg = parseChatErrorBody(text)
    if (res.status === 409) throw new Error('AI 未配置：请先在设置中填写 API Key')
    const retry = attempt < CHAT_RETRY.maxAttempts - 1 && shouldRetryChatError(res.status, lastMsg)
    if (!retry) break
    await sleepChatRetry(chatRetryDelayMs(lastMsg, attempt), signal)
  }
  throw new Error(`模型请求失败（${lastStatus}）：${sanitizeModelError(String(lastMsg))}`)
}

/** 去掉 gzip/二进制噪声，保留可读错误文案。 */
export function sanitizeModelError(raw: string): string {
  const s = String(raw ?? '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '')
    .replace(/\uFFFD+/g, '')
    .trim()
  if (!s) return '上游模型返回错误（无法解析详情）'
  // 仍含大量非打印/替换符 → 视为损坏正文
  const printable = s.replace(/[^\x20-\x7E\u4e00-\u9fff\u3000-\u303f\uff00-\uffef\n\t]/g, '')
  if (printable.length < Math.min(12, s.length) * 0.4) {
    return '上游模型返回错误（响应无法解析，请稍后重试）'
  }
  return s.length > 400 ? `${s.slice(0, 400)}…` : s
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

/* ------------------------------- 聊天附件 Files ------------------------------- */

export type AiFileKind = 'csv' | 'text' | 'pdf' | 'excel' | 'image' | 'other'

export interface AiFileMeta {
  id: string
  name: string
  mime: string
  sizeBytes: number
  createdAt: string
  kind: AiFileKind
}

export const aiFilesApi = {
  list: () => req<AiFileMeta[]>('/api/ai/files', undefined, { withUser: true }),
  meta: (id: string) =>
    req<AiFileMeta>(`/api/ai/files/${encodeURIComponent(id)}/meta`, undefined, { withUser: true }),
  remove: (id: string) =>
    req<void>(`/api/ai/files/${encodeURIComponent(id)}`, { method: 'DELETE' }, { withUser: true }),
  upload: async (file: File): Promise<AiFileMeta> => {
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch('/api/ai/files', {
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
      throw new Error(`上传失败（${res.status}）：${msg}`)
    }
    return JSON.parse(text) as AiFileMeta
  },
  downloadBlob: async (id: string): Promise<Blob> => {
    const res = await fetch(`/api/ai/files/${encodeURIComponent(id)}`, {
      headers: userHeaders(),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`下载失败（${res.status}）：${text.slice(0, 200)}`)
    }
    return res.blob()
  },
}
