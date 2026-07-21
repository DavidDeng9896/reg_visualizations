/**
 * 转换表单校验纯函数：Submit 前整体校验；派生列表达式实时校验与预览。
 */
import type { CellValue, ColumnMeta, Row, Transform } from '../../shared/types'
import { evaluateExpression, parseExpression } from '../../shared/pipeline'

export interface ValidationResult {
  ok: boolean
  errors: string[]
}

const ok: ValidationResult = { ok: true, errors: [] }
const fail = (...errors: string[]): ValidationResult => ({ ok: false, errors })

/** 派生列校验：名称非空且不与现有列冲突；表达式可被解析。 */
export function validateDerived(name: string, expression: string, columns: ColumnMeta[]): ValidationResult {
  const errors: string[] = []
  if (!name.trim()) errors.push('请填写新列名')
  else if (columns.some((c) => c.field === name.trim())) errors.push(`列「${name.trim()}」已存在`)
  if (!expression.trim()) errors.push('请填写表达式')
  else {
    try {
      parseExpression(expression)
    } catch (e) {
      errors.push(e instanceof Error ? e.message : '表达式无法解析')
    }
  }
  return errors.length ? { ok: false, errors } : ok
}

/** 整体校验任意转换草稿。 */
export function validateTransformDraft(draft: Transform, columns: ColumnMeta[]): ValidationResult {
  switch (draft.type) {
    case 'select':
      return draft.columns.length > 0 ? ok : fail('请至少选择一列')
    case 'rename': {
      if (draft.renames.length === 0) return fail('请至少添加一条重命名')
      const names = new Set<string>()
      for (const r of draft.renames) {
        if (!r.to.trim()) return fail(`列「${r.from}」的新名为空`)
        if (names.has(r.to.trim())) return fail(`新名「${r.to.trim()}」重复`)
        names.add(r.to.trim())
      }
      return ok
    }
    case 'derived':
      return validateDerived(draft.name, draft.expression, columns)
    case 'dedupe':
      return ok // 空列 = 整行去重，始终合法
    case 'sort':
      return draft.keys.length > 0 ? ok : fail('请至少添加一个排序列')
    default:
      return ok
  }
}

/** 派生列实时预览：前 limit 行的计算值；表达式非法返回 null。 */
export function derivedPreview(expression: string, rows: Row[], limit = 5): CellValue[] | null {
  try {
    parseExpression(expression)
  } catch {
    return null
  }
  return rows.slice(0, limit).map((row) => evaluateExpression(expression, row))
}

/** 转换 chip 摘要。 */
export function transformSummary(t: Transform): string {
  switch (t.type) {
    case 'select':
      return `${t.mode === 'keep' ? '保留' : '剔除'} ${t.columns.length} 列`
    case 'rename':
      return `重命名 ${t.renames.length} 列`
    case 'derived':
      return `派生列 ${t.name}`
    case 'dedupe':
      return t.columns.length ? `按 ${t.columns.length} 列去重` : '整行去重'
    case 'sort':
      return `排序：${t.keys.map((k) => `${k.column} ${k.direction === 'asc' ? '↑' : '↓'}`).join(', ')}`
  }
}

export const TRANSFORM_TYPE_LABELS: Record<Transform['type'], string> = {
  select: 'Select columns',
  rename: 'Rename columns',
  derived: 'Derived column',
  dedupe: 'Deduplicate',
  sort: 'Sort',
}
