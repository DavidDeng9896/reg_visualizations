/**
 * 过滤表单纯函数：按列类型的操作符元数据、条件值解析与校验、chip 摘要。
 */
import type { CellValue, ColumnMeta, DataType, Filter, FilterCondition, FilterOperator } from '../../shared/types'

export type OperatorArity = 'none' | 'one' | 'two' | 'list'

export interface OperatorDef {
  value: FilterOperator
  label: string
  arity: OperatorArity
}

export const OPERATOR_LABELS: Record<FilterOperator, string> = {
  eq: '等于',
  neq: '不等于',
  contains: '包含',
  notContains: '不包含',
  gt: '>',
  gte: '≥',
  lt: '<',
  lte: '≤',
  between: '介于',
  isBlank: '为空',
  notBlank: '非空',
  in: '属于',
}

const TEXT_OPS: FilterOperator[] = ['contains', 'notContains', 'eq', 'neq', 'in', 'isBlank', 'notBlank']
const NUM_OPS: FilterOperator[] = ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'between', 'isBlank', 'notBlank']
const BOOL_OPS: FilterOperator[] = ['eq', 'neq', 'isBlank', 'notBlank']

function def(op: FilterOperator): OperatorDef {
  const arity: OperatorArity = op === 'isBlank' || op === 'notBlank' ? 'none' : op === 'between' ? 'two' : op === 'in' ? 'list' : 'one'
  return { value: op, label: OPERATOR_LABELS[op], arity }
}

/** 按列类型给出可选操作符。 */
export function operatorsFor(dataType: DataType): OperatorDef[] {
  const ops = dataType === 'string' ? TEXT_OPS : dataType === 'boolean' ? BOOL_OPS : NUM_OPS
  return ops.map(def)
}

export function operatorArity(op: FilterOperator): OperatorArity {
  return def(op).arity
}

/** 解析条件输入文本为条件值。`in` 逗号分隔；其余按列类型尽量转数值。 */
export function parseConditionValue(
  operator: FilterOperator,
  text: string,
  dataType: DataType,
): CellValue | CellValue[] | undefined {
  const s = text.trim()
  if (operator === 'in') {
    return s
      .split(/[,，]/)
      .map((v) => v.trim())
      .filter((v) => v !== '')
      .map((v) => coerce(v, dataType))
  }
  if (s === '') return undefined
  return coerce(s, dataType)
}

function coerce(s: string, dataType: DataType): CellValue {
  if (dataType === 'number') {
    const n = Number(s)
    return Number.isFinite(n) ? n : s
  }
  if (dataType === 'boolean') {
    if (/^(true|1|yes)$/i.test(s)) return true
    if (/^(false|0|no)$/i.test(s)) return false
    return s
  }
  return s
}

/** 条件是否可提交（必填值齐全）。 */
export function conditionValid(cond: FilterCondition): string | null {
  if (!cond.column) return '请选择列'
  const arity = operatorArity(cond.operator)
  if (arity === 'none') return null
  if (arity === 'one' && (cond.value === undefined || cond.value === null || cond.value === '')) return '请填写比较值'
  if (arity === 'two' && (cond.value === undefined || cond.value === '' || cond.value2 === undefined || cond.value2 === ''))
    return '请填写区间上下界'
  if (arity === 'list' && (!Array.isArray(cond.value) || cond.value.length === 0)) return '请填写至少一个值（逗号分隔）'
  return null
}

function fmtValue(v: CellValue | CellValue[] | undefined): string {
  if (Array.isArray(v)) return v.map((x) => String(x)).join(', ')
  if (v === null || v === undefined) return ''
  return String(v)
}

/** 单条条件摘要：如 `sepal_length > 5`。 */
export function conditionSummary(cond: FilterCondition, columns: ColumnMeta[]): string {
  const title = columns.find((c) => c.field === cond.column)?.title ?? cond.column
  const arity = operatorArity(cond.operator)
  if (arity === 'none') return `${title} ${OPERATOR_LABELS[cond.operator]}`
  if (arity === 'two') return `${title} ${fmtValue(cond.value)} ~ ${fmtValue(cond.value2)}`
  if (arity === 'list') return `${title} 属于 [${fmtValue(cond.value)}]`
  return `${title} ${OPERATOR_LABELS[cond.operator]} ${fmtValue(cond.value)}`
}

/** 过滤 chip 摘要。 */
export function filterSummary(filter: Filter, columns: ColumnMeta[]): string {
  if (filter.conditions.length === 0) return '空过滤'
  const first = conditionSummary(filter.conditions[0], columns)
  if (filter.conditions.length === 1) return first
  const join = filter.combinator === 'and' ? '且' : '或'
  return `${first} ${join} ${filter.conditions.length - 1} 个条件`
}
