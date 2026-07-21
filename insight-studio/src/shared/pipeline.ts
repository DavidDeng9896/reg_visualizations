import type {
  Analysis,
  CellValue,
  ColumnMeta,
  DataType,
  Filter,
  FilterCondition,
  Row,
  Transform,
  ViewNode,
} from './types'
import { ROW_ID_FIELD } from './types'
import { parseDateLike } from './datetime'
import { findTable, findViewPath } from './tree'

/** 图表取数采样上限。 */
export const SAMPLE_LIMIT = 10000

export interface ViewResult {
  columns: ColumnMeta[]
  rows: Row[]
  /** 是否因超上限被随机采样。 */
  sampled: boolean
  /** 管道输出（采样前）总行数。 */
  totalRows: number
  /** 源表输入行数（过滤/转换前）。 */
  sourceRows: number
}

export class PipelineError extends Error {
  constructor(
    message: string,
    readonly detail?: unknown,
  ) {
    super(message)
    this.name = 'PipelineError'
  }
}

/* ------------------------------- 值比较 ------------------------------- */

export function isBlank(v: CellValue | undefined): boolean {
  return v === null || v === undefined || (typeof v === 'string' && v.trim() === '')
}

function toNumber(v: CellValue): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'boolean') return v ? 1 : 0
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v)
    if (Number.isFinite(n)) return n
  }
  return null
}

/** 类型感知的比较：数值列按数值，date/datetime 按时间戳，其余按字符串。 */
export function compareValues(a: CellValue, b: CellValue, dataType?: DataType): number {
  if (isBlank(a) && isBlank(b)) return 0
  if (isBlank(a)) return -1
  if (isBlank(b)) return 1
  if (dataType === 'date' || dataType === 'datetime') {
    const ta = parseDateLike(a)
    const tb = parseDateLike(b)
    if (ta !== null && tb !== null) return ta - tb
  }
  const na = toNumber(a)
  const nb = toNumber(b)
  if (na !== null && nb !== null) return na - nb
  return String(a).localeCompare(String(b))
}

function looseEq(a: CellValue, b: CellValue): boolean {
  if (isBlank(a) && isBlank(b)) return true
  const na = toNumber(a)
  const nb = toNumber(b)
  if (na !== null && nb !== null) return na === nb
  return String(a) === String(b)
}

/* ------------------------------- 过滤 ------------------------------- */

export function applyCondition(row: Row, cond: FilterCondition, dataType?: DataType): boolean {
  const cell = row[cond.column]
  switch (cond.operator) {
    case 'isBlank':
      return isBlank(cell)
    case 'notBlank':
      return !isBlank(cell)
    case 'eq':
      return looseEq(cell, (cond.value as CellValue) ?? null)
    case 'neq':
      return !looseEq(cell, (cond.value as CellValue) ?? null)
    case 'contains':
      return !isBlank(cell) && String(cell).toLowerCase().includes(String(cond.value ?? '').toLowerCase())
    case 'notContains':
      return isBlank(cell) || !String(cell).toLowerCase().includes(String(cond.value ?? '').toLowerCase())
    case 'gt':
      return compareValues(cell, (cond.value as CellValue) ?? null, dataType) > 0
    case 'gte':
      return compareValues(cell, (cond.value as CellValue) ?? null, dataType) >= 0
    case 'lt':
      return compareValues(cell, (cond.value as CellValue) ?? null, dataType) < 0
    case 'lte':
      return compareValues(cell, (cond.value as CellValue) ?? null, dataType) <= 0
    case 'between': {
      const v = cond.value as CellValue
      const v2 = cond.value2 as CellValue
      return (
        !isBlank(cell) &&
        compareValues(cell, v ?? null, dataType) >= 0 &&
        compareValues(cell, v2 ?? null, dataType) <= 0
      )
    }
    case 'in': {
      const list = Array.isArray(cond.value) ? cond.value : cond.value === undefined ? [] : [cond.value as CellValue]
      return list.some((item) => looseEq(cell, item))
    }
    default:
      return true
  }
}

/** 单条过滤（多条件 and/or）。 */
export function applyFilter(row: Row, filter: Filter, columns?: ColumnMeta[]): boolean {
  if (filter.conditions.length === 0) return true
  const typeOf = (col: string): DataType | undefined => columns?.find((c) => c.field === col)?.dataType
  const results = filter.conditions.map((c) => applyCondition(row, c, typeOf(c.column)))
  return filter.combinator === 'and' ? results.every(Boolean) : results.some(Boolean)
}

export function applyFilters(rows: Row[], filters: Filter[], columns?: ColumnMeta[]): Row[] {
  if (!filters.length) return rows
  return rows.filter((row) => filters.every((f) => applyFilter(row, f, columns)))
}

/* --------------------------- 派生列安全表达式 --------------------------- */

/**
 * 微型解析器（无 eval）：
 *   expr    := additive
 *   additive:= multiplicative (('+'|'-') multiplicative)*
 *   mult    := unary (('*'|'/') unary)*
 *   unary   := '-' unary | primary
 *   primary := number | 'string' | column | concat(...) | '(' expr ')'
 * 列引用：裸标识符（字母/数字/下划线/非 ASCII）或 [带空格的列名]。
 */

type ExprNode =
  | { kind: 'num'; value: number }
  | { kind: 'str'; value: string }
  | { kind: 'col'; name: string }
  | { kind: 'neg'; arg: ExprNode }
  | { kind: 'bin'; op: '+' | '-' | '*' | '/'; left: ExprNode; right: ExprNode }
  | { kind: 'concat'; args: ExprNode[] }

interface Token {
  type: 'num' | 'str' | 'ident' | 'op' | 'lparen' | 'rparen' | 'comma'
  text: string
}

function tokenize(src: string): Token[] {
  const tokens: Token[] = []
  let i = 0
  while (i < src.length) {
    const ch = src[i]
    if (/\s/.test(ch)) {
      i += 1
      continue
    }
    if (/[0-9.]/.test(ch)) {
      const m = /^\d*\.?\d+([eE][+-]?\d+)?/.exec(src.slice(i))
      if (!m) throw new PipelineError(`表达式中存在非法数字（位置 ${i}）`)
      tokens.push({ type: 'num', text: m[0] })
      i += m[0].length
      continue
    }
    if (ch === "'") {
      const end = src.indexOf("'", i + 1)
      if (end === -1) throw new PipelineError('表达式中字符串缺少结束引号')
      tokens.push({ type: 'str', text: src.slice(i + 1, end) })
      i = end + 1
      continue
    }
    if (ch === '[') {
      const end = src.indexOf(']', i + 1)
      if (end === -1) throw new PipelineError('列引用缺少 ]')
      tokens.push({ type: 'ident', text: src.slice(i + 1, end) })
      i = end + 1
      continue
    }
    if (/[A-Za-z_-￿]/.test(ch)) {
      const m = /^[A-Za-z_-￿][A-Za-z0-9_-￿]*/.exec(src.slice(i))
      if (!m) throw new PipelineError(`表达式中存在非法标识符（位置 ${i}）`)
      tokens.push({ type: 'ident', text: m[0] })
      i += m[0].length
      continue
    }
    if (ch === '+' || ch === '-' || ch === '*' || ch === '/') {
      tokens.push({ type: 'op', text: ch })
      i += 1
      continue
    }
    if (ch === '(') {
      tokens.push({ type: 'lparen', text: ch })
      i += 1
      continue
    }
    if (ch === ')') {
      tokens.push({ type: 'rparen', text: ch })
      i += 1
      continue
    }
    if (ch === ',') {
      tokens.push({ type: 'comma', text: ch })
      i += 1
      continue
    }
    throw new PipelineError(`表达式含不支持的字符 "${ch}"`)
  }
  return tokens
}

class Parser {
  private pos = 0
  constructor(private tokens: Token[]) {}

  private peek(): Token | undefined {
    return this.tokens[this.pos]
  }
  private next(): Token {
    const t = this.tokens[this.pos]
    if (!t) throw new PipelineError('表达式意外结束')
    this.pos += 1
    return t
  }
  private expect(type: Token['type']): Token {
    const t = this.next()
    if (t.type !== type) throw new PipelineError(`表达式语法错误：期望 ${type}，得到 "${t.text}"`)
    return t
  }

  parse(): ExprNode {
    const node = this.parseAdditive()
    if (this.pos !== this.tokens.length) {
      throw new PipelineError(`表达式在 "${this.peek()?.text ?? ''}" 之后存在多余内容`)
    }
    return node
  }

  private parseAdditive(): ExprNode {
    let left = this.parseMultiplicative()
    for (;;) {
      const t = this.peek()
      if (t?.type === 'op' && (t.text === '+' || t.text === '-')) {
        this.next()
        left = { kind: 'bin', op: t.text, left, right: this.parseMultiplicative() }
      } else return left
    }
  }

  private parseMultiplicative(): ExprNode {
    let left = this.parseUnary()
    for (;;) {
      const t = this.peek()
      if (t?.type === 'op' && (t.text === '*' || t.text === '/')) {
        this.next()
        left = { kind: 'bin', op: t.text, left, right: this.parseUnary() }
      } else return left
    }
  }

  private parseUnary(): ExprNode {
    const t = this.peek()
    if (t?.type === 'op' && t.text === '-') {
      this.next()
      return { kind: 'neg', arg: this.parseUnary() }
    }
    return this.parsePrimary()
  }

  private parsePrimary(): ExprNode {
    const t = this.next()
    if (t.type === 'num') return { kind: 'num', value: Number(t.text) }
    if (t.type === 'str') return { kind: 'str', value: t.text }
    if (t.type === 'lparen') {
      const inner = this.parseAdditive()
      this.expect('rparen')
      return inner
    }
    if (t.type === 'ident') {
      if (t.text.toLowerCase() === 'concat' && this.peek()?.type === 'lparen') {
        this.next()
        const args: ExprNode[] = []
        if (this.peek()?.type !== 'rparen') {
          args.push(this.parseAdditive())
          while (this.peek()?.type === 'comma') {
            this.next()
            args.push(this.parseAdditive())
          }
        }
        this.expect('rparen')
        if (args.length === 0) throw new PipelineError('concat 至少需要一个参数')
        return { kind: 'concat', args }
      }
      return { kind: 'col', name: t.text }
    }
    throw new PipelineError(`表达式语法错误：意外的 "${t.text}"`)
  }
}

/** 解析表达式；非法时抛 PipelineError（用于保存前校验、标红转换步骤）。 */
export function parseExpression(expression: string): unknown {
  const trimmed = expression.trim()
  if (!trimmed) throw new PipelineError('表达式为空')
  return new Parser(tokenize(trimmed)).parse()
}

function evalNode(node: ExprNode, row: Row): CellValue {
  switch (node.kind) {
    case 'num':
      return node.value
    case 'str':
      return node.value
    case 'col':
      return row[node.name] ?? null
    case 'neg': {
      const v = toNumber(evalNode(node.arg, row) as CellValue)
      return v === null ? null : -v
    }
    case 'concat':
      return node.args.map((a) => {
        const v = evalNode(a, row)
        return v === null || v === undefined ? '' : String(v)
      }).join('')
    case 'bin': {
      const l = toNumber(evalNode(node.left, row) as CellValue)
      const r = toNumber(evalNode(node.right, row) as CellValue)
      if (l === null || r === null) return null
      switch (node.op) {
        case '+':
          return l + r
        case '-':
          return l - r
        case '*':
          return l * r
        case '/':
          return r === 0 ? null : l / r
      }
    }
  }
}

/** 求值单行；任何失败返回 null（失败置空，不阻断管道）。 */
export function evaluateExpression(expression: string, row: Row): CellValue {
  const ast = parseExpression(expression) as ExprNode
  try {
    return evalNode(ast, row)
  } catch {
    return null
  }
}

/* ------------------------------- 转换 ------------------------------- */

function uniqueName(base: string, taken: Set<string>): string {
  if (!taken.has(base)) return base
  let i = 2
  while (taken.has(`${base}_${i}`)) i += 1
  return `${base}_${i}`
}

export interface TransformResult {
  columns: ColumnMeta[]
  rows: Row[]
}

/** 按序应用转换链。derived 表达式非法时抛 PipelineError（阻断保存）。 */
export function applyTransforms(columns: ColumnMeta[], rows: Row[], transforms: Transform[]): TransformResult {
  let cols = columns.slice()
  let data = rows
  for (const t of transforms) {
    switch (t.type) {
      case 'select': {
        if (t.mode === 'keep') {
          cols = cols.filter((c) => t.columns.includes(c.field))
        } else {
          cols = cols.filter((c) => !t.columns.includes(c.field))
        }
        break
      }
      case 'rename': {
        const map = new Map(t.renames.map((r) => [r.from, r.to]))
        const taken = new Set(cols.map((c) => c.field).filter((f) => !map.has(f)))
        const renamed = new Map<string, string>()
        cols = cols.map((c) => {
          const target = map.get(c.field)
          if (!target || target === c.field) {
            taken.add(c.field)
            return c
          }
          const finalName = uniqueName(target, taken)
          taken.add(finalName)
          renamed.set(c.field, finalName)
          return { ...c, field: finalName, title: finalName }
        })
        data = data.map((row) => {
          const next: Row = {}
          for (const [k, v] of Object.entries(row)) next[renamed.get(k) ?? k] = v
          return next
        })
        break
      }
      case 'derived': {
        const ast = parseExpression(t.expression) as ExprNode
        const existing = cols.find((c) => c.field === t.name)
        const values = data.map((row) => {
          try {
            return evalNode(ast, row)
          } catch {
            return null
          }
        })
        if (!existing) {
          const first = values.find((v) => v !== null && v !== undefined)
          const dataType: DataType =
            typeof first === 'number' ? 'number' : typeof first === 'boolean' ? 'boolean' : 'string'
          cols = [...cols, { field: t.name, title: t.name, dataType }]
        }
        data = data.map((row, i) => ({ ...row, [t.name]: values[i] }))
        break
      }
      case 'dedupe': {
        const seen = new Set<string>()
        const keys = t.columns.length ? t.columns : cols.map((c) => c.field)
        data = data.filter((row) => {
          const key = JSON.stringify(keys.map((k) => row[k] ?? null))
          if (seen.has(key)) return false
          seen.add(key)
          return true
        })
        break
      }
      case 'sort': {
        const typeOf = (f: string) => cols.find((c) => c.field === f)?.dataType
        data = data.slice().sort((a, b) => {
          for (const k of t.keys) {
            const cmp = compareValues(a[k.column] ?? null, b[k.column] ?? null, typeOf(k.column))
            if (cmp !== 0) return k.direction === 'asc' ? cmp : -cmp
          }
          return 0
        })
        break
      }
    }
  }
  return { columns: cols, rows: data }
}

/* ------------------------------- 管道 ------------------------------- */

/**
 * 数据管道：父数据 → 祖先表 filters → 视图链各级 filters + transforms（按序）。
 * 多级嵌套视图沿父链逐层应用。结果超 SAMPLE_LIMIT 时随机采样并标记。
 * `options.skipSampling`：跳过采样返回全量（导出完整数据用）。
 */
export function runPipeline(
  analysis: Analysis,
  tableId: string,
  viewId?: string,
  options: { skipSampling?: boolean } = {},
): ViewResult {
  const table = findTable(analysis, tableId)
  if (!table) throw new PipelineError(`表不存在：${tableId}`)

  let columns: ColumnMeta[] = table.columns.slice()
  let rows: Row[] = table.rows
  const sourceRows = rows.length

  rows = applyFilters(rows, table.filters, columns)

  if (viewId) {
    const path = findViewPath(table.views, viewId)
    if (!path) throw new PipelineError(`视图不存在：${viewId}`)
    for (const view of path) {
      rows = applyFilters(rows, view.filters, columns)
      const out = applyTransforms(columns, rows, view.transforms)
      columns = out.columns
      rows = out.rows
    }
  }

  const totalRows = rows.length
  let sampled = false
  if (totalRows > SAMPLE_LIMIT && !options.skipSampling) {
    sampled = true
    rows = randomSample(rows, SAMPLE_LIMIT)
  }

  return { columns, rows, sampled, totalRows, sourceRows }
}

function randomSample(rows: Row[], n: number): Row[] {
  // 蓄水池采样，均匀且无偏。
  const picked = rows.slice(0, n)
  for (let i = n; i < rows.length; i += 1) {
    const j = Math.floor(Math.random() * (i + 1))
    if (j < n) picked[j] = rows[i]
  }
  return picked
}

/**
 * 视图是否「恒等或仅排序」（沿父链判断）：可写回源表。
 * 即整条链上无过滤、无改变行集/列集的转换，仅允许 sort。
 */
export function isIdentityOrSortOnly(view: ViewNode, ancestors: ViewNode[] = []): boolean {
  const chain = [...ancestors, view]
  return chain.every(
    (v) => v.filters.length === 0 && v.transforms.every((t) => t.type === 'sort'),
  )
}

/** 供编辑写回：结果行携带的稳定行 id。 */
export function rowIdOf(row: Row): string | undefined {
  const v = row[ROW_ID_FIELD]
  return typeof v === 'string' ? v : undefined
}
