import type { ColumnMeta, JoinKey, JoinType, Row } from './types'
import { ROW_ID_FIELD } from './types'
import { uuid } from './id'

export interface TableInput {
  columns: ColumnMeta[]
  rows: Row[]
}

export interface CombineTablesSpec {
  joinType: JoinType
  /** join 类型必填（可多键）；append 忽略。 */
  keys?: JoinKey[]
  /** 列名冲突时右侧列的后缀，默认 '_right'；仍冲突则追加序号。 */
  suffix?: string
}

export class CombineError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CombineError'
  }
}

function keyOf(row: Row, fields: string[]): string {
  return fields.map((f) => JSON.stringify(row[f] ?? null)).join('')
}

/** 右侧列输出名解析：同名键列丢弃（''），其余冲突列加后缀。 */
function resolveRightNames(
  left: TableInput,
  right: TableInput,
  sameNameRightKeys: Set<string>,
  suffix: string,
): { columns: ColumnMeta[]; outputName: Map<string, string> } {
  const taken = new Set(left.columns.map((c) => c.field))
  const columns: ColumnMeta[] = []
  const outputName = new Map<string, string>()
  for (const c of right.columns) {
    if (sameNameRightKeys.has(c.field)) {
      outputName.set(c.field, '') // 与左键同名：不输出
      continue
    }
    let name = c.field
    if (taken.has(name)) {
      let candidate = `${name}${suffix}`
      let i = 2
      while (taken.has(candidate)) {
        candidate = `${name}${suffix}${i}`
        i += 1
      }
      name = candidate
    }
    taken.add(name)
    outputName.set(c.field, name)
    columns.push({ ...c, field: name, title: name === c.field ? c.title : name })
  }
  return { columns, outputName }
}

/** 组装输出行：左列 + 右侧输出列；缺侧补 null。 */
function buildRow(
  leftRow: Row | null,
  rightRow: Row | null,
  leftCols: ColumnMeta[],
  rightCols: ColumnMeta[],
  outputName: Map<string, string>,
): Row {
  const out: Row = { [ROW_ID_FIELD]: uuid() }
  for (const c of leftCols) out[c.field] = leftRow ? (leftRow[c.field] ?? null) : null
  for (const c of rightCols) {
    const name = outputName.get(c.field)
    if (!name) continue
    out[name] = rightRow ? (rightRow[c.field] ?? null) : null
  }
  return out
}

/**
 * 合并两张表：left/inner/right/full join（按键，支持多键，键重复时笛卡尔展开）
 * 或 append（按列名对齐，列取并集）。列冲突自动加后缀。
 */
export function combineTables(left: TableInput, right: TableInput, spec: CombineTablesSpec): TableInput {
  if (spec.joinType === 'append') {
    const outCols: ColumnMeta[] = []
    for (const c of [...left.columns, ...right.columns]) {
      if (!outCols.some((o) => o.field === c.field)) outCols.push(c)
    }
    const rows = [...left.rows, ...right.rows].map((r) => {
      const out: Row = { [ROW_ID_FIELD]: uuid() }
      for (const c of outCols) out[c.field] = r[c.field] ?? null
      return out
    })
    return { columns: outCols, rows }
  }

  const suffix = spec.suffix ?? '_right'
  const keys = spec.keys ?? []
  if (keys.length === 0) throw new CombineError('Join 需要至少一个连接键')

  const leftKeyFields = keys.map((k) => k.left)
  const rightKeyFields = keys.map((k) => k.right)
  const sameNameRightKeys = new Set(keys.filter((k) => k.left === k.right).map((k) => k.right))

  const { columns: rightOutCols, outputName } = resolveRightNames(left, right, sameNameRightKeys, suffix)
  const columns = [...left.columns, ...rightOutCols]

  // 右表键索引
  const index = new Map<string, Row[]>()
  for (const r of right.rows) {
    const k = keyOf(r, rightKeyFields)
    const bucket = index.get(k)
    if (bucket) bucket.push(r)
    else index.set(k, [r])
  }

  const rows: Row[] = []
  const matchedRight = new Set<Row>()
  const jt = spec.joinType

  for (const l of left.rows) {
    const matches = index.get(keyOf(l, leftKeyFields)) ?? []
    if (matches.length > 0) {
      for (const m of matches) {
        matchedRight.add(m)
        rows.push(buildRow(l, m, left.columns, right.columns, outputName))
      }
    } else if (jt === 'left' || jt === 'full') {
      rows.push(buildRow(l, null, left.columns, right.columns, outputName))
    }
  }

  if (jt === 'right' || jt === 'full') {
    for (const r of right.rows) {
      if (matchedRight.has(r)) continue
      const outRow = buildRow(null, r, left.columns, right.columns, outputName)
      // 同名键：右表未匹配行把键值回填到左键列（coalesce 语义）
      for (const k of keys) {
        if (k.left === k.right && outRow[k.left] == null) outRow[k.left] = r[k.right] ?? null
      }
      rows.push(outRow)
    }
  }

  return { columns, rows }
}
