/**
 * CSV 导入/导出纯函数。
 * 类型推断规则：非空值全部为数值 → number；全部为 true/false → boolean；
 * 全部匹配 YYYY-MM-DD → date；全部匹配 ISO datetime → datetime；否则 string。
 * structure 不自动推断，由用户在导入对话框或列菜单中手动指定。
 */
import type { CellValue, ColumnMeta, DataType, Row } from '../../shared/types'
import { ROW_ID_FIELD } from '../../shared/types'
import { parseDateLike } from '../../shared/datetime'

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/
const DATETIME_RE = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/

/** 空列名补 `Column N`（N 从 1 起，按列位置）；重名追加 `_2` 后缀。 */
export function normalizeHeaders(headers: string[]): string[] {
  const taken = new Set<string>()
  return headers.map((raw, i) => {
    let name = raw.trim() || `Column ${i + 1}`
    if (taken.has(name)) {
      let suffix = 2
      while (taken.has(`${name}_${suffix}`)) suffix += 1
      name = `${name}_${suffix}`
    }
    taken.add(name)
    return name
  })
}

/**
 * 推断单列类型。空列（无非空值）按 string 处理。
 * 不自动推断 structure（需用户手动改类型）。
 */
export function inferColumnType(values: string[]): DataType {
  const nonEmpty = values.filter((v) => v.trim() !== '')
  if (nonEmpty.length === 0) return 'string'
  if (nonEmpty.every((v) => v.trim() !== '' && Number.isFinite(Number(v)))) return 'number'
  if (nonEmpty.every((v) => /^(true|false)$/i.test(v.trim()))) return 'boolean'
  if (nonEmpty.every((v) => DATE_ONLY_RE.test(v.trim()) && parseDateLike(v) !== null)) return 'date'
  if (nonEmpty.every((v) => DATETIME_RE.test(v.trim()) && parseDateLike(v) !== null)) return 'datetime'
  return 'string'
}

/** 由表头 + 数据行（字符串二维数组）推断列元数据。 */
export function inferColumnTypes(headers: string[], dataRows: string[][], sampleLimit = 1000): ColumnMeta[] {
  const fields = normalizeHeaders(headers)
  const sample = dataRows.slice(0, sampleLimit)
  return fields.map((field, colIdx) => ({
    field,
    title: field,
    dataType: inferColumnType(sample.map((r) => r[colIdx] ?? '')),
  }))
}

/** 按目标类型把 CSV 字符串单元格转换为 CellValue。空串 → null；转换失败 → null。 */
export function coerceValue(raw: string, type: DataType): CellValue {
  const s = raw.trim()
  if (s === '') return null
  switch (type) {
    case 'number': {
      const n = Number(s)
      return Number.isFinite(n) ? n : null
    }
    case 'boolean':
      return /^(true|1|yes)$/i.test(s)
    case 'date':
    case 'datetime':
      return parseDateLike(s) !== null ? s : null
    case 'structure':
      return s
    default:
      return s
  }
}

/* ------------------------------ 编码探测 ------------------------------ */

export type CsvTextEncoding = 'utf-8' | 'utf-16le' | 'utf-16be' | 'gb18030'

function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text
}

function tryDecode(bytes: Uint8Array, label: string, fatal: boolean): string | null {
  try {
    return new TextDecoder(label, { fatal }).decode(bytes)
  } catch {
    return null
  }
}

function countReplacementChars(text: string): number {
  let n = 0
  for (let i = 0; i < text.length; i++) {
    if (text.charCodeAt(i) === 0xfffd) n += 1
  }
  return n
}

/**
 * 智能解码 CSV 字节。
 * 优先 BOM → UTF-8；若 UTF-8 非法或替换字符过多，回退 GB18030（覆盖 GBK，常见于中文 Excel 导出）。
 */
export function decodeCsvBytes(buffer: ArrayBuffer): { text: string; encoding: CsvTextEncoding } {
  const bytes = new Uint8Array(buffer)
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return { text: stripBom(new TextDecoder('utf-8').decode(bytes)), encoding: 'utf-8' }
  }
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    return { text: stripBom(new TextDecoder('utf-16le').decode(bytes)), encoding: 'utf-16le' }
  }
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    return { text: stripBom(new TextDecoder('utf-16be').decode(bytes)), encoding: 'utf-16be' }
  }

  const utf8Strict = tryDecode(bytes, 'utf-8', true)
  if (utf8Strict != null) {
    return { text: stripBom(utf8Strict), encoding: 'utf-8' }
  }

  const utf8Loose = tryDecode(bytes, 'utf-8', false) ?? ''
  const gbk = tryDecode(bytes, 'gb18030', false)
  if (gbk != null) {
    const badUtf8 = countReplacementChars(utf8Loose)
    const badGbk = countReplacementChars(gbk)
    const looksChinese = /[\u4e00-\u9fff]/.test(gbk)
    if (badGbk < badUtf8 || (looksChinese && badUtf8 > 0)) {
      return { text: stripBom(gbk), encoding: 'gb18030' }
    }
  }

  if (utf8Loose) return { text: stripBom(utf8Loose), encoding: 'utf-8' }
  if (gbk != null) return { text: stripBom(gbk), encoding: 'gb18030' }
  return { text: '', encoding: 'utf-8' }
}

/** 读取本地 CSV File，自动处理 UTF-8 / GBK。 */
export async function readCsvFileText(file: File): Promise<{ text: string; encoding: CsvTextEncoding }> {
  const buffer = await file.arrayBuffer()
  return decodeCsvBytes(buffer)
}

/** 表格 → CSV 文本（含表头；逗号/引号/换行转义）。 */
export function toCsv(columns: ColumnMeta[], rows: Row[]): string {
  const esc = (v: CellValue | undefined): string => {
    if (v === null || v === undefined) return ''
    const s = String(v)
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const lines = [columns.map((c) => esc(c.title)).join(',')]
  for (const row of rows) {
    lines.push(columns.map((c) => esc(c.field === ROW_ID_FIELD ? null : row[c.field])).join(','))
  }
  return lines.join('\r\n')
}

/** 触发浏览器下载（DOM 侧，非纯函数）。 */
export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
