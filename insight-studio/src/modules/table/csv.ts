/**
 * CSV 导入/导出纯函数。
 * 类型推断规则：非空值全部为数值 → number；全部为 true/false → boolean；
 * 全部匹配 YYYY-MM-DD → date；全部匹配 ISO datetime → datetime；否则 string。
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

/** 推断单列类型。空列（无非空值）按 string 处理。 */
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
    default:
      return s
  }
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
