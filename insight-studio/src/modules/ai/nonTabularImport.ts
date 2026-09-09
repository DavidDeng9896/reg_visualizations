/**
 * P0-3：非表格附件（说明 / txt / md / pdf…）不得当作分析表。
 * 拒绝后禁止再通过 import_csv_text 编造 CSV（Aegis TWO_STEP）。
 */

export type AiFileKindLike = string

export interface AiFileMetaLike {
  kind: AiFileKindLike
  name: string
}

/** 说明类 / 无表结构附件 */
export function isNonTabularAiFile(meta: AiFileMetaLike): boolean {
  if (meta.kind === 'csv' || meta.kind === 'excel') return false
  if (meta.kind === 'text' || meta.kind === 'pdf') return true
  return /\.(md|txt|markdown|pdf|docx?|rtf)$/i.test(meta.name)
}

/** import_ai_file 硬拒绝文案（中文；不得引导编造 CSV） */
export function nonTabularImportFailMessage(meta: AiFileMetaLike): string {
  return (
    `附件「${meta.name}」是说明文档（kind=${meta.kind}），内容仅供阅读（已在对话上下文中），` +
    `禁止 import_ai_file，也不会写入 TableCatalog。请改用已上传的 CSV/Excel 附件导入。`
  )
}

/** 其它非 csv/excel kind 的拒绝文案 */
export function unsupportedImportKindFailMessage(meta: AiFileMetaLike): string {
  return `附件「${meta.name}」kind=${meta.kind} 不支持导入为表（仅 csv/excel）；不会写入 TableCatalog。`
}

/**
 * Aegis TWO_STEP：拒绝说明后，在无真实表格附件时禁止 import_csv_text 编造数据。
 * 文案须含「禁止…编造」且不得暗示继续用说明造表。
 */
export const NON_TABULAR_INVENT_CSV_FAIL =
  '禁止根据说明文档编造 CSV 再通过 import_csv_text 导入。说明类附件仅供阅读，不会进入 TableCatalog；请改用已上传的 CSV/Excel，或请用户提供真实表格数据。'
