/**
 * Excel（.xlsx / .xls）解析：SheetJS 读 sheet → 二维字符串表。
 */
import * as XLSX from 'xlsx'

export interface ExcelSheetInfo {
  name: string
  rowCount: number
  colCount: number
}

export interface ExcelParseResult {
  sheetNames: string[]
  sheets: Record<string, { headers: string[]; dataRows: string[][] }>
}

function sheetToGrid(sheet: XLSX.WorkSheet): { headers: string[]; dataRows: string[][] } {
  const rows = XLSX.utils.sheet_to_json<(string | number | boolean | null)[]>(sheet, {
    header: 1,
    defval: '',
    raw: false,
    blankrows: false,
  }) as unknown as unknown[][]
  const normalized = rows
    .map((r) => (Array.isArray(r) ? r.map((c) => (c == null ? '' : String(c))) : []))
    .filter((r) => r.some((c) => String(c).trim() !== ''))
  if (normalized.length < 2) {
    return { headers: normalized[0] ?? [], dataRows: [] }
  }
  const headers = normalized[0].map((h) => String(h ?? ''))
  const width = Math.max(headers.length, ...normalized.slice(1).map((r) => r.length))
  const paddedHeaders = Array.from({ length: width }, (_, i) => headers[i] ?? '')
  const dataRows = normalized.slice(1).map((r) => Array.from({ length: width }, (_, i) => r[i] ?? ''))
  return { headers: paddedHeaders, dataRows }
}

export function parseExcelBuffer(buf: ArrayBuffer): ExcelParseResult {
  const wb = XLSX.read(buf, { type: 'array', cellDates: true })
  const sheets: ExcelParseResult['sheets'] = {}
  for (const name of wb.SheetNames) {
    sheets[name] = sheetToGrid(wb.Sheets[name])
  }
  return { sheetNames: wb.SheetNames.slice(), sheets }
}

export async function parseExcelFile(file: File): Promise<ExcelParseResult> {
  const buf = await file.arrayBuffer()
  return parseExcelBuffer(buf)
}

export function listSheetInfo(result: ExcelParseResult): ExcelSheetInfo[] {
  return result.sheetNames.map((name) => {
    const g = result.sheets[name]
    return {
      name,
      rowCount: g?.dataRows.length ?? 0,
      colCount: g?.headers.length ?? 0,
    }
  })
}
