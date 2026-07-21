/**
 * 表格编辑纯函数：输入校验、按 __rowId 写回、撤销/重做命令构造、TSV 复制粘贴。
 * 所有 make*Command 遵循同一约定：立即应用变更，并返回 { label, undo, redo }；
 * 找不到目标（如 rowId 缺失）返回 null，不应用任何变更。
 */
import type { AnalysisTable, CellValue, ColumnMeta, DataType, Row } from '../../shared/types'
import { ROW_ID_FIELD } from '../../shared/types'
import { uuid } from '../../shared/id'
import { parseDateLike } from '../../shared/datetime'
import { evaluateExpression } from '../../shared/pipeline'

export interface EditCommand {
  label: string
  undo: () => void
  redo: () => void
}

/* ------------------------------ 输入校验 ------------------------------ */

export type ParseResult = { ok: true; value: CellValue } | { ok: false; error: string }

/** 按列类型解析编辑输入。空串 → null；number/date/datetime 非法 → ok:false。 */
export function parseCellInput(raw: string, dataType: DataType): ParseResult {
  const s = raw.trim()
  if (s === '') return { ok: true, value: null }
  switch (dataType) {
    case 'number': {
      const n = Number(s)
      if (!Number.isFinite(n)) return { ok: false, error: `「${raw}」不是有效数值` }
      return { ok: true, value: n }
    }
    case 'boolean': {
      if (/^(true|1|yes)$/i.test(s)) return { ok: true, value: true }
      if (/^(false|0|no)$/i.test(s)) return { ok: true, value: false }
      return { ok: false, error: `「${raw}」不是有效布尔值（true/false）` }
    }
    case 'date':
    case 'datetime': {
      if (parseDateLike(s) === null) return { ok: false, error: `「${raw}」不是有效日期` }
      return { ok: true, value: s }
    }
    default:
      return { ok: true, value: raw }
  }
}

/* ------------------------------ 写回定位 ------------------------------ */

/** 按稳定行 id 在源表中定位行索引；找不到返回 -1。 */
export function findRowIndexById(table: AnalysisTable, rowId: string): number {
  return table.rows.findIndex((r) => r[ROW_ID_FIELD] === rowId)
}

/**
 * 写回单个单元格：rowId 缺失/未找到/列不存在 → false，不写入。
 * 调用方负责先用 parseCellInput 校验。
 */
export function writeBackCell(table: AnalysisTable, rowId: string | undefined, field: string, value: CellValue): boolean {
  if (!rowId) return false
  if (!table.columns.some((c) => c.field === field)) return false
  const idx = findRowIndexById(table, rowId)
  if (idx < 0) return false
  table.rows[idx][field] = value
  return true
}

/* ------------------------------ 命令构造 ------------------------------ */

function rowLabel(table: AnalysisTable, rowId: string): string {
  const idx = findRowIndexById(table, rowId)
  return idx >= 0 ? `第 ${idx + 1} 行` : '该行'
}

/** 编辑单元格命令：立即写入，undo/redo 往返。行/列不存在返回 null。 */
export function makeEditCellCommand(
  table: AnalysisTable,
  rowId: string | undefined,
  field: string,
  value: CellValue,
): EditCommand | null {
  if (!rowId) return null
  const idx = findRowIndexById(table, rowId)
  if (idx < 0) return null
  const col = table.columns.find((c) => c.field === field)
  if (!col) return null
  const oldValue = table.rows[idx][field] ?? null
  table.rows[idx][field] = value
  return {
    label: `编辑 ${col.title}`,
    undo: () => {
      const i = findRowIndexById(table, rowId)
      if (i >= 0) table.rows[i][field] = oldValue
    },
    redo: () => {
      const i = findRowIndexById(table, rowId)
      if (i >= 0) table.rows[i][field] = value
    },
  }
}

export interface PasteEdit {
  rowId: string
  field: string
  value: CellValue
}

/** 批量粘贴命令：原子应用全部编辑，undo 逆序恢复。 */
export function makePasteCommand(table: AnalysisTable, edits: PasteEdit[]): EditCommand | null {
  if (edits.length === 0) return null
  const applied: { rowId: string; field: string; oldValue: CellValue }[] = []
  for (const e of edits) {
    const idx = findRowIndexById(table, e.rowId)
    if (idx < 0 || !table.columns.some((c) => c.field === e.field)) continue
    applied.push({ rowId: e.rowId, field: e.field, oldValue: table.rows[idx][e.field] ?? null })
    table.rows[idx][e.field] = e.value
  }
  if (applied.length === 0) return null
  const apply = (pick: 'old' | 'new') => {
    for (const a of applied) {
      const i = findRowIndexById(table, a.rowId)
      if (i < 0) continue
      if (pick === 'old') table.rows[i][a.field] = a.oldValue
      else table.rows[i][a.field] = edits.find((e) => e.rowId === a.rowId && e.field === a.field)?.value ?? null
    }
  }
  return {
    label: `粘贴 ${applied.length} 个单元格`,
    undo: () => apply('old'),
    redo: () => apply('new'),
  }
}

function blankRow(columns: ColumnMeta[]): Row {
  const row: Row = { [ROW_ID_FIELD]: uuid() }
  for (const c of columns) row[c.field] = null
  return row
}

/** 在 index 处插入空行（index 越界自动收敛）。 */
export function makeInsertRowCommand(table: AnalysisTable, index: number): EditCommand {
  const at = Math.max(0, Math.min(index, table.rows.length))
  const row = blankRow(table.columns)
  table.rows.splice(at, 0, row)
  const rowId = String(row[ROW_ID_FIELD])
  return {
    label: '插入行',
    undo: () => {
      const i = findRowIndexById(table, rowId)
      if (i >= 0) table.rows.splice(i, 1)
    },
    redo: () => {
      const i = findRowIndexById(table, rowId)
      table.rows.splice(i >= 0 ? i : table.rows.length, 0, row)
    },
  }
}

/** 按 rowId 删除行；未找到返回 null。 */
export function makeDeleteRowCommand(table: AnalysisTable, rowId: string | undefined): EditCommand | null {
  if (!rowId) return null
  const idx = findRowIndexById(table, rowId)
  if (idx < 0) return null
  const [removed] = table.rows.splice(idx, 1)
  return {
    label: `删除${rowLabel(table, rowId)}`,
    undo: () => {
      table.rows.splice(Math.min(idx, table.rows.length), 0, removed)
    },
    redo: () => {
      const i = findRowIndexById(table, rowId)
      if (i >= 0) table.rows.splice(i, 1)
    },
  }
}

/** 重命名列（仅改 title，field 保持稳定）。 */
export function makeRenameColumnCommand(table: AnalysisTable, field: string, newTitle: string): EditCommand | null {
  const col = table.columns.find((c) => c.field === field)
  if (!col) return null
  const oldTitle = col.title
  col.title = newTitle
  return {
    label: `重命名列为「${newTitle}」`,
    undo: () => {
      col.title = oldTitle
    },
    redo: () => {
      col.title = newTitle
    },
  }
}

/** 删除列：移除列元数据并清除所有行的对应值；undo 恢复原位与全部值。 */
export function makeDeleteColumnCommand(table: AnalysisTable, field: string): EditCommand | null {
  const idx = table.columns.findIndex((c) => c.field === field)
  if (idx < 0) return null
  const [col] = table.columns.splice(idx, 1)
  const oldValues = table.rows.map((r) => r[field] ?? null)
  for (const r of table.rows) delete r[field]
  return {
    label: `删除列「${col.title}」`,
    undo: () => {
      table.columns.splice(Math.min(idx, table.columns.length), 0, col)
      table.rows.forEach((r, i) => {
        r[field] = oldValues[i]
      })
    },
    redo: () => {
      const i = table.columns.findIndex((c) => c.field === field)
      if (i >= 0) table.columns.splice(i, 1)
      for (const r of table.rows) delete r[field]
    },
  }
}

/**
 * 物化派生列（源表场景）：对每行求值表达式，插入新列到 afterField 右侧。
 * 表达式语法错误会向上抛（调用方先用 parseExpression 校验）。
 */
export function makeAddDerivedColumnCommand(
  table: AnalysisTable,
  name: string,
  expression: string,
  afterField?: string,
): EditCommand | null {
  if (!name.trim()) return null
  if (table.columns.some((c) => c.field === name)) return null
  const values = table.rows.map((row) => evaluateExpression(expression, row))
  const first = values.find((v) => v !== null && v !== undefined)
  const dataType: DataType = typeof first === 'number' ? 'number' : typeof first === 'boolean' ? 'boolean' : 'string'
  const col: ColumnMeta = { field: name, title: name, dataType }
  const afterIdx = afterField ? table.columns.findIndex((c) => c.field === afterField) : -1
  const insertAt = afterIdx >= 0 ? afterIdx + 1 : table.columns.length
  table.columns.splice(insertAt, 0, col)
  table.rows.forEach((r, i) => {
    r[name] = values[i]
  })
  return {
    label: `新增派生列「${name}」`,
    undo: () => {
      const i = table.columns.findIndex((c) => c.field === name)
      if (i >= 0) table.columns.splice(i, 1)
      for (const r of table.rows) delete r[name]
    },
    redo: () => {
      const i = afterField ? table.columns.findIndex((c) => c.field === afterField) : -1
      table.columns.splice(i >= 0 ? i + 1 : table.columns.length, 0, col)
      table.rows.forEach((r, j) => {
        r[name] = values[j]
      })
    },
  }
}

/* ------------------------------ TSV 复制粘贴 ------------------------------ */

/** 解析 TSV/纯文本为单元格矩阵（\r\n / \n 分行，\t 分列；去掉末尾空行）。 */
export function parseTsv(text: string): string[][] {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
  if (lines.length > 1 && lines[lines.length - 1] === '') lines.pop()
  return lines.map((l) => l.split('\t'))
}

export interface PasteRect {
  /** 目标位置（相对展示行/可见列索引）与原始文本。 */
  cells: { row: number; col: number; raw: string }[]
  /** 因越界被忽略的单元格数。 */
  clipped: number
}

/** 以 (startRow, startCol) 为左上角的矩形粘贴范围；越界部分计入 clipped。 */
export function buildPasteRect(
  startRow: number,
  startCol: number,
  matrix: string[][],
  maxRows: number,
  maxCols: number,
): PasteRect {
  const cells: PasteRect['cells'] = []
  let clipped = 0
  matrix.forEach((line, r) => {
    line.forEach((raw, c) => {
      const row = startRow + r
      const col = startCol + c
      if (row < maxRows && col < maxCols) cells.push({ row, col, raw })
      else clipped += 1
    })
  })
  return { cells, clipped }
}
