/**
 * 上下文 token 估算与本地摘要（无模型调用，确定性，可单测）。
 * 估算口径：CJK 字符 1 字 ≈ 1 token，其余字符 ≈ 4 字符 1 token。
 */

/** 模型上下文上限（tokens）。 */
export const CONTEXT_TOKEN_LIMIT = 128_000
/** 自动压缩阈值：超过上限 80% 时 send 前自动压缩。 */
export const AUTO_COMPRESS_AT = Math.floor(CONTEXT_TOKEN_LIMIT * 0.8)

function isCjk(code: number): boolean {
  return (
    (code >= 0x4e00 && code <= 0x9fff) || // CJK 统一表意文字
    (code >= 0x3400 && code <= 0x4dbf) || // 扩展 A
    (code >= 0x3000 && code <= 0x303f) || // CJK 标点
    (code >= 0xff00 && code <= 0xffef) || // 全角字符
    (code >= 0x20000 && code <= 0x2a6df) // 扩展 B
  )
}

/** 估算单段文本 token 数。 */
export function estimateTokens(text: string): number {
  if (!text) return 0
  let cjk = 0
  let other = 0
  for (const ch of text) {
    if (isCjk(ch.codePointAt(0) ?? 0)) cjk += 1
    else other += 1
  }
  return cjk + Math.ceil(other / 4)
}

/** 每条消息的结构开销（role 等）。 */
const MSG_OVERHEAD = 4

/** 估算一组聊天消息的总 token 数。 */
export function estimateChatTokens(messages: Array<{ role: string; content?: string | null }>): number {
  return messages.reduce((sum, m) => sum + estimateTokens(typeof m.content === 'string' ? m.content : '') + MSG_OVERHEAD, 0)
}

/** token 数缩写：1200 → 1.2k，128000 → 128k。 */
export function formatTokens(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`
  return String(Math.max(0, Math.round(n)))
}

/**
 * 本地确定性摘要：保留此前摘要 + 用户诉求要点 + 最近进展。
 * 不调用模型（省 token、可测）；压缩后模型凭此延续任务上下文。
 */
export function summarizeTurns(turns: Array<{ role: string; content?: string | null }>): string {
  const text = (t: { content?: string | null }): string => (typeof t.content === 'string' ? t.content.trim() : '')
  const prevSummaries = turns.filter((t) => t.role === 'system').map(text).filter(Boolean)
  const users = turns.filter((t) => t.role === 'user').map(text).filter(Boolean)
  const assistants = turns.filter((t) => t.role === 'assistant').map(text).filter(Boolean)

  const lines: string[] = [...prevSummaries, '【早前对话摘要（上下文已压缩）】']
  if (users.length) {
    lines.push('用户此前的诉求：')
    for (const u of users.slice(-8)) lines.push(`- ${u.length > 80 ? `${u.slice(0, 80)}…` : u}`)
  }
  const lastAssistant = assistants[assistants.length - 1]
  if (lastAssistant) lines.push(`最近进展：${lastAssistant.length > 200 ? `${lastAssistant.slice(0, 200)}…` : lastAssistant}`)
  return lines.join('\n')
}
