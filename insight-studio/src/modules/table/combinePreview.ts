/**
 * Combine 对话框纯函数：解析输入（表 / 视图物化）+ 预览。
 */
import type { Analysis, CombineInputRef, JoinKey, JoinType, ColumnMeta, Row } from '../../shared/types'
import { runPipeline } from '../../shared/pipeline'
import { combineTables, type TableInput } from '../../shared/join'
import { findTable } from '../../shared/tree'

/** 把 combine 输入引用解析为 TableInput（视图走 runPipeline 物化）。 */
export function resolveCombineInput(analysis: Analysis, ref: CombineInputRef): TableInput | null {
  const table = findTable(analysis, ref.tableId)
  if (!table) return null
  if (ref.kind === 'table' || !ref.viewId) {
    return { columns: table.columns.slice(), rows: table.rows.slice() }
  }
  try {
    const result = runPipeline(analysis, ref.tableId, ref.viewId)
    return { columns: result.columns, rows: result.rows }
  } catch {
    return null
  }
}

export interface CombinePreview {
  columns: ColumnMeta[]
  /** 前 limit 行预览。 */
  rows: Row[]
  totalRows: number
  leftRows: number
  rightRows: number
  /** 输入缺失/参数错误时的错误信息。 */
  error?: string
  /** join 无匹配（结果 0 行且输入非全空）。 */
  noMatch?: boolean
}

export interface CombineSpecInput {
  joinType: JoinType
  keys: JoinKey[]
}

/** 构建 combine 预览（完整执行后截取前 limit 行）。 */
export function buildCombinePreview(
  analysis: Analysis,
  leftRef: CombineInputRef | null,
  rightRef: CombineInputRef | null,
  spec: CombineSpecInput,
  limit = 50,
): CombinePreview {
  const empty: CombinePreview = { columns: [], rows: [], totalRows: 0, leftRows: 0, rightRows: 0 }
  if (!leftRef || !rightRef) return { ...empty, error: '请选择左右两个输入' }
  const left = resolveCombineInput(analysis, leftRef)
  const right = resolveCombineInput(analysis, rightRef)
  if (!left || !right) return { ...empty, error: '输入不存在或无法解析' }
  const base = { leftRows: left.rows.length, rightRows: right.rows.length }
  if (spec.joinType !== 'append' && spec.keys.length === 0) {
    return { ...empty, ...base, error: 'Join 需要至少一个连接键' }
  }
  for (const k of spec.keys) {
    if (!left.columns.some((c) => c.field === k.left) || !right.columns.some((c) => c.field === k.right)) {
      return { ...empty, ...base, error: '连接键列不存在' }
    }
  }
  try {
    const out = combineTables(left, right, { joinType: spec.joinType, keys: spec.keys })
    return {
      ...base,
      columns: out.columns,
      rows: out.rows.slice(0, limit),
      totalRows: out.rows.length,
      noMatch: out.rows.length === 0 && (left.rows.length > 0 || right.rows.length > 0),
    }
  } catch (e) {
    return { ...empty, ...base, error: e instanceof Error ? e.message : '合并失败' }
  }
}
