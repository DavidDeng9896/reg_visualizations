/**
 * AI 聊天附件：上传元数据、文本抽取、Excel 工作表探测、导入为分析表。
 */
import Papa from 'papaparse'
import type { AiFileKind, AiFileMeta } from './client'
import { aiFilesApi } from './client'
import { decodeCsvBytes, inferColumnTypes } from '../table/csv'
import { parseExcelBuffer } from '../table/excel'
import { commitImportedTable } from '../table/commitImport'

export type AttachmentKind = AiFileKind

export interface ChatAttachment {
  id: string
  name: string
  mime: string
  sizeBytes: number
  kind: AttachmentKind
  /** 是否交给模型阅读（默认 true）。图片仅走 vision，不进文本上下文。 */
  forAi: boolean
  /** 是否导入为分析表（默认 false；仅 csv/excel）。 */
  importAsTable: boolean
  /** Excel：用户勾选的工作表。 */
  selectedSheets?: string[]
  /** Excel：探测得到的全部工作表名。 */
  availableSheets?: string[]
}

export const ATTACHMENT_ACCEPT =
  '.csv,.txt,.md,.markdown,.pdf,.xlsx,.xls,.png,.jpg,.jpeg,.gif,.webp'

export const MAX_ATTACHMENTS_PER_TURN = 5
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024

export function clipText(s: string, n = 8000): string {
  if (s.length <= n) return s
  return `${s.slice(0, n)}\n…(已截断)`
}

export function attachmentFromMeta(meta: AiFileMeta, patch?: Partial<ChatAttachment>): ChatAttachment {
  return {
    id: meta.id,
    name: meta.name,
    mime: meta.mime,
    sizeBytes: meta.sizeBytes,
    kind: meta.kind,
    forAi: true,
    importAsTable: false,
    ...patch,
  }
}

/** 写入 UiMessage / 持久化的附件快照（不含 availableSheets）。 */
export type ChatAttachmentSnapshot = {
  id: string
  name: string
  mime: string
  sizeBytes: number
  kind: AttachmentKind
  forAi: boolean
  importAsTable: boolean
  selectedSheets?: string[]
}

export function serializeAttachment(att: ChatAttachment): ChatAttachmentSnapshot {
  return {
    id: att.id,
    name: att.name,
    mime: att.mime,
    sizeBytes: att.sizeBytes,
    kind: att.kind,
    forAi: att.forAi,
    importAsTable: att.importAsTable,
    ...(att.selectedSheets?.length ? { selectedSheets: [...att.selectedSheets] } : {}),
  }
}

export async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(reader.error ?? new Error('读取失败'))
    reader.readAsDataURL(blob)
  })
}

export async function probeExcelSheets(fileId: string): Promise<string[]> {
  const blob = await aiFilesApi.downloadBlob(fileId)
  const buf = await blob.arrayBuffer()
  const parsed = parseExcelBuffer(buf)
  return parsed.sheetNames.slice()
}

async function extractPdfText(blob: Blob): Promise<string> {
  try {
    const pdfjs = await import('pdfjs-dist')
    const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default
    pdfjs.GlobalWorkerOptions.workerSrc = workerUrl
    const data = new Uint8Array(await blob.arrayBuffer())
    const doc = await pdfjs.getDocument({ data }).promise
    const parts: string[] = []
    for (let i = 1; i <= doc.numPages; i += 1) {
      const page = await doc.getPage(i)
      const content = await page.getTextContent()
      const line = content.items
        .map((it) => ('str' in it ? String((it as { str: string }).str) : ''))
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim()
      if (line) parts.push(line)
    }
    return parts.join('\n')
  } catch {
    return 'PDF 暂无法抽取文本'
  }
}

function sheetGridToText(headers: string[], dataRows: string[][], maxRows = 80): string {
  const rows = dataRows.slice(0, maxRows)
  const lines = [headers.join('\t'), ...rows.map((r) => r.join('\t'))]
  if (dataRows.length > maxRows) lines.push(`…(共 ${dataRows.length} 行，已截断)`)
  return lines.join('\n')
}

/** 抽取附件可读文本（csv/text/pdf/excel 选中表）；图片返回空。 */
export async function extractAttachmentText(att: ChatAttachment): Promise<string> {
  if (att.kind === 'image' || att.kind === 'other') return ''
  try {
    const blob = await aiFilesApi.downloadBlob(att.id)
    if (att.kind === 'text') {
      return clipText(await blob.text())
    }
    if (att.kind === 'csv') {
      const { text } = decodeCsvBytes(await blob.arrayBuffer())
      return clipText(text)
    }
    if (att.kind === 'pdf') {
      return clipText(await extractPdfText(blob))
    }
    if (att.kind === 'excel') {
      const sheets = att.selectedSheets?.length
        ? att.selectedSheets
        : att.availableSheets?.length
          ? att.availableSheets
          : await probeExcelSheets(att.id)
      if (!sheets.length) return '（Excel 无可用工作表）'
      const buf = await blob.arrayBuffer()
      const parsed = parseExcelBuffer(buf)
      const blocks: string[] = []
      for (const name of sheets) {
        const g = parsed.sheets[name]
        if (!g) {
          blocks.push(`### 工作表「${name}」\n（不存在）`)
          continue
        }
        blocks.push(`### 工作表「${name}」\n${sheetGridToText(g.headers, g.dataRows)}`)
      }
      return clipText(blocks.join('\n\n'))
    }
  } catch (e) {
    return `（读取附件失败：${e instanceof Error ? e.message : String(e)}）`
  }
  return ''
}

/** 将 forAi 的非图片附件拼成系统提示上下文。 */
export async function buildAttachmentContext(atts: ChatAttachment[]): Promise<string> {
  const targets = atts.filter((a) => a.forAi && a.kind !== 'image')
  if (!targets.length) return ''
  const parts: string[] = [
    '## 用户本轮上传了以下附件',
    'CSV/Excel 请用 import_ai_file({ fileId }) 导入为分析表，不要向用户索要 CSV 文本。text/md/pdf 仅供阅读，禁止 import_ai_file。下方预览仅供理解结构。',
  ]
  for (const att of targets) {
    const body = await extractAttachmentText(att)
    const sheets =
      att.kind === 'excel' && att.selectedSheets?.length
        ? ` sheets=[${att.selectedSheets.join(', ')}]`
        : att.kind === 'excel' && att.availableSheets?.length
          ? ` sheets=[${att.availableSheets.join(', ')}]`
          : ''
    parts.push(
      `## 附件「${att.name}」(id: ${att.id}, kind: ${att.kind}${sheets})\n${body || '（无文本内容）'}`,
    )
  }
  return parts.join('\n\n')
}

/** 会话内附件目录（跨轮可见，轻量，不含全文）。 */
export function buildAttachmentCatalog(
  items: Array<Pick<ChatAttachment, 'id' | 'name' | 'kind' | 'selectedSheets' | 'availableSheets'>>,
): string {
  const seen = new Set<string>()
  const lines: string[] = []
  for (const a of items) {
    if (!a?.id || seen.has(a.id)) continue
    if (a.kind === 'image' || a.kind === 'other') continue
    seen.add(a.id)
    const sheets =
      a.kind === 'excel'
        ? ` sheets=[${(a.selectedSheets?.length ? a.selectedSheets : a.availableSheets ?? []).join(', ') || '未探测'}]`
        : ''
    const importHint = a.kind === 'csv' || a.kind === 'excel' ? '（可导入）' : '（仅阅读，勿 import_ai_file）'
    lines.push(`- 「${a.name}」id=${a.id} kind=${a.kind}${sheets}${importHint}`)
  }
  if (!lines.length) return ''
  return `## 会话附件目录
${lines.join('\n')}
导入：仅 csv/excel 用 import_ai_file({ fileId, tableName?, sheetNames? })。text/md 已在对话上下文中，禁止导入为表。`
}

/** 写入用户消息正文的附件摘要（含 id，便于多轮引用）。 */
export function formatUserAttachmentLine(atts: ChatAttachment[]): string {
  if (!atts.length) return ''
  return `（附件：${atts.map((a) => `${a.name} id=${a.id} kind=${a.kind}`).join('；')}）`
}

export interface ImportedTableInfo {
  tableId: string
  stepId: string
  name: string
  rowCount: number
  columnCount: number
  sheetName?: string
}

/**
 * 将 CSV/Excel 附件导入当前分析为表（供 UI 勾选导入与 AI 工具共用）。
 * 不依赖 att.importAsTable 标志。
 */
export async function importAiAttachment(
  att: ChatAttachment,
  opts?: { tableNameHint?: string; sheetNames?: string[] },
): Promise<ImportedTableInfo[]> {
  if (att.kind !== 'csv' && att.kind !== 'excel') {
    throw new Error(`附件 kind=${att.kind} 不支持导入为表（仅 csv/excel）`)
  }

  const blob = await aiFilesApi.downloadBlob(att.id)
  const out: ImportedTableInfo[] = []

  if (att.kind === 'csv') {
    const { text } = decodeCsvBytes(await blob.arrayBuffer())
    const parsed = Papa.parse<string[]>(text, { skipEmptyLines: 'greedy' })
    const rows = (parsed.data ?? []).filter((r) => Array.isArray(r) && r.some((c) => String(c ?? '').trim() !== ''))
    if (rows.length < 2) throw new Error(`CSV「${att.name}」没有可用数据行`)
    const headers = rows[0].map((c) => String(c ?? ''))
    const dataRows = rows.slice(1).map((r) => r.map((c) => String(c ?? '')))
    const columns = inferColumnTypes(headers, dataRows)
    const base =
      (opts?.tableNameHint?.trim() || att.name.replace(/\.csv$/i, '') || '导入表').trim() || '导入表'
    const committed = commitImportedTable({
      name: base,
      headers,
      dataRows,
      columnTypes: columns.map((c) => c.dataType),
      stepType: 'upload-csv',
      sourceLabel: 'AI 附件 · CSV',
      originalFileName: att.name,
    })
    if (!committed) throw new Error('当前没有打开的分析，无法导入')
    out.push(committed)
    return out
  }

  let sheets = opts?.sheetNames?.length
    ? opts.sheetNames
    : att.selectedSheets?.length
      ? att.selectedSheets
      : att.availableSheets?.length
        ? att.availableSheets
        : await probeExcelSheets(att.id)
  sheets = sheets.map((s) => String(s).trim()).filter(Boolean)
  if (!sheets.length) throw new Error(`Excel「${att.name}」请至少指定一个工作表`)
  const buf = await blob.arrayBuffer()
  const parsed = parseExcelBuffer(buf)
  const base =
    (opts?.tableNameHint?.trim() || att.name.replace(/\.(xlsx|xls)$/i, '') || '导入表').trim() || '导入表'
  for (const sheetName of sheets) {
    const g = parsed.sheets[sheetName]
    if (!g?.dataRows.length) continue
    const columns = inferColumnTypes(g.headers, g.dataRows)
    const committed = commitImportedTable({
      name: sheets.length === 1 ? base : `${base}_${sheetName}`,
      headers: g.headers,
      dataRows: g.dataRows,
      columnTypes: columns.map((c) => c.dataType),
      stepType: 'upload-xlsx',
      stepConfig: { sheetName },
      sourceLabel: `AI 附件 · Excel · ${sheetName}`,
      originalFileName: att.name,
    })
    if (!committed) throw new Error('当前没有打开的分析，无法导入')
    out.push({ ...committed, sheetName })
  }
  if (!out.length) throw new Error(`Excel「${att.name}」所选工作表无可用数据行`)
  return out
}

/** csv / excel → commitImportedTable（excel 每个选中 sheet 一张表）。仅当 importAsTable 时执行。 */
export async function importAttachmentAsTables(att: ChatAttachment): Promise<void> {
  if (!att.importAsTable) return
  await importAiAttachment(att)
}

/** Excel：若开启 forAi 或 importAsTable，必须至少选中一张表。 */
export function excelSelectionValid(att: ChatAttachment): boolean {
  if (att.kind !== 'excel') return true
  if (!att.forAi && !att.importAsTable) return true
  return (att.selectedSheets?.length ?? 0) > 0
}
