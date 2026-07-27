/**
 * 将解析后的行列提交为 Analysis 表 + 源步骤节点。
 */
import type { ColumnMeta, DataType, Row, StepType } from '../../shared/types'
import { createTable, ensureRowIds } from '../../shared/factories'
import { createStepNode } from '../steps/factory'
import { useAnalysisStore } from '../../stores/analysisStore'
import { toast } from '../../ui'
import { coerceValue, inferColumnTypes } from './csv'

export interface CommitImportOptions {
  name: string
  headers: string[]
  dataRows: string[][]
  columnTypes: DataType[]
  stepType: StepType
  /** 写入 step.config 的额外字段（如 sheetName / sql）。 */
  stepConfig?: Record<string, unknown>
  sourceLabel?: string
}

export function commitImportedTable(opts: CommitImportOptions): boolean {
  const store = useAnalysisStore()
  if (!store.current) return false
  const name = opts.name.trim() || 'Untitled table'
  const columns: ColumnMeta[] = inferColumnTypes(opts.headers, []).map((c, i) => ({
    ...c,
    dataType: opts.columnTypes[i] ?? 'string',
  }))
  const rows: Row[] = opts.dataRows.map((line) => {
    const row: Row = {}
    columns.forEach((c, i) => {
      row[c.field] = coerceValue(line[i] ?? '', c.dataType)
    })
    return row
  })
  ensureRowIds(rows)
  const table = createTable(name, columns, rows, 'csv')
  const step = createStepNode(opts.stepType, name)
  step.config.tableName = name
  if (opts.stepConfig) Object.assign(step.config, opts.stepConfig)
  step.status = 'configured'
  step.output.tables = [table.id]
  table.source = 'step'
  table.stepId = step.id
  store.mutate((a) => {
    a.tables.push(table)
    a.steps.push(step)
  })
  store.select({ kind: 'table', tableId: table.id })
  toast.success(
    `已导入「${name}」（${rows.length} 行 × ${columns.length} 列）${opts.sourceLabel ? ` · ${opts.sourceLabel}` : ''}`,
  )
  return true
}

/** 从对象行数组转为 string[][] + headers（供预览/提交）。 */
export function objectRowsToGrid(rows: Record<string, unknown>[]): {
  headers: string[]
  dataRows: string[][]
} {
  if (!rows.length) return { headers: [], dataRows: [] }
  const headers: string[] = []
  for (const r of rows) {
    for (const k of Object.keys(r)) {
      if (!headers.includes(k)) headers.push(k)
    }
  }
  const dataRows = rows.map((r) => headers.map((h) => (r[h] == null ? '' : String(r[h]))))
  return { headers, dataRows }
}
