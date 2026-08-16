/**
 * 给模型看的工具回执：短摘要，不把 lossless JSON / HTTP 404 原文喂回去。
 * execute 仍可带 artifact 给前端；render 只用这段文字。
 */
import {
  failIfMissingBackend,
  unavailableBackendMessage,
  type UnavailableKind,
} from '../../insight-studio/src/modules/ai/unavailableBackend'

export { failIfMissingBackend, unavailableBackendMessage }
export type { UnavailableKind }

const MAX_SUMMARY = 800

export const REJECTED_NO_CHANGE =
  '用户已拒绝该操作，未删除也未修改任何数据。请按用户当前意图继续；不要改用 clear_analysis 或其它破坏性工具作为替代。'

export function clipSummary(text: string, max = MAX_SUMMARY): string {
  const s = text.trim()
  if (s.length <= max) return s
  return `${s.slice(0, max)}…（已截断，细节见界面产物）`
}

export function sanitizeToolSummary(summary: string, toolName?: string): string {
  const missing = failIfMissingBackend(new Error(summary), toolName)
  if (missing) return missing
  if (/lossless JSON/i.test(summary)) {
    return '工具内部序列化异常已忽略。请根据界面已有结果继续；列表类操作可再调一次 list_tables / list_analyses。不要因此清空分析。'
  }
  if (/AI 服务错误（5\d\d）|insight-api 5\d\d|internal server error/i.test(summary)) {
    return clipSummary(`后端暂时不可用：${summary.replace(/\s+/g, ' ')}。请换一条路径继续，不要重复同一失败调用。`)
  }
  return clipSummary(summary)
}

export function renderToolValue(value: unknown, toolName?: string): string {
  if (typeof value === 'string') return sanitizeToolSummary(value, toolName)
  if (value && typeof value === 'object' && 'summary' in value) {
    return sanitizeToolSummary(String((value as { summary?: unknown }).summary ?? ''), toolName)
  }
  try {
    return clipSummary(JSON.stringify(value ?? {}))
  } catch {
    return '（工具已执行）'
  }
}

export function withSanitizedSummary<T extends { summary?: string }>(value: T, toolName?: string): T {
  if (!value || typeof value !== 'object') return value
  if (typeof value.summary === 'string') {
    return { ...value, summary: sanitizeToolSummary(value.summary, toolName) }
  }
  return value
}
