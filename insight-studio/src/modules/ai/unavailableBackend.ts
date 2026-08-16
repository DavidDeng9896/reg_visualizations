/** 当前部署缺少 Go Skills / 记忆 / 附件时，给模型的固定话术（不要把 404 原文喂回去）。 */

export type UnavailableKind = 'skills' | 'memories' | 'files'

const MESSAGES: Record<UnavailableKind, string> = {
  skills:
    '当前部署未启用 Skills 服务（需要 insight-api-go）。不要再调用 list_skills / read_skill，也不要把函数写成正文。请改用平台内置工具完成任务。',
  memories:
    '当前部署未启用记忆服务（需要 insight-api-go）。不要再调用 save_memory，也不要把函数写成正文。请直接继续分析。',
  files:
    '当前部署未启用聊天附件服务（需要 insight-api-go）。不要再调用 list_ai_files / import_ai_file。若用户给了 CSV 文本，请用 import_csv_text。',
}

export function unavailableBackendMessage(kind: UnavailableKind): string {
  return MESSAGES[kind]
}

export function backendKindForTool(name: string): UnavailableKind | null {
  if (name === 'list_skills' || name === 'read_skill') return 'skills'
  if (name === 'save_memory') return 'memories'
  if (name === 'list_ai_files' || name === 'import_ai_file') return 'files'
  return null
}

export function isMissingBackendError(message: string): boolean {
  return /(404|not_found|Cannot GET|AI 服务错误（404）|insight-api 404)/i.test(message)
}

export function kindFromErrorMessage(message: string): UnavailableKind | null {
  if (!isMissingBackendError(message)) return null
  if (/\/api\/ai\/skills|list_skills|read_skill/i.test(message)) return 'skills'
  if (/\/api\/ai\/memories|save_memory/i.test(message)) return 'memories'
  if (/\/api\/ai\/files|list_ai_files|import_ai_file/i.test(message)) return 'files'
  return null
}

export function failIfMissingBackend(error: unknown, toolName?: string): string | null {
  const msg = error instanceof Error ? error.message : String(error ?? '')
  const kind = backendKindForTool(toolName ?? '') ?? kindFromErrorMessage(msg)
  if (!kind || !isMissingBackendError(msg)) return null
  return unavailableBackendMessage(kind)
}
