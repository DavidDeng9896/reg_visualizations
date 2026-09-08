/**
 * 表结构摘要：给模型看清 field（机器名）/ title / 类型 / 单位线索 / 样例。
 * 复杂表头（空格、括号单位）若只暴露 title，模型会臆造列名导致配图失败。
 */
import type { AnalysisTable, ColumnMeta, DataType, Row } from '../../shared/types'

const UNIT_IN_PARENS = /\(([^)]+)\)\s*$/

/** 从列名提取单位线索，如 localStrain(kcal) → kcal；Dose (mg/kg) → mg/kg。 */
export function extractUnitHint(name: string): string | undefined {
  const m = name.match(UNIT_IN_PARENS)
  return m?.[1]?.trim() || undefined
}

function isBlank(v: unknown): boolean {
  return v == null || v === ''
}

function columnStats(col: ColumnMeta, rows: Row[]): string {
  const vals = rows.map((r) => r[col.field])
  const nonBlank = vals.filter((v) => !isBlank(v))
  const nullRate = rows.length ? Math.round(((rows.length - nonBlank.length) / rows.length) * 100) : 0
  const parts: string[] = []
  if (nullRate > 0) parts.push(`空值${nullRate}%`)
  if (col.dataType === 'number') {
    const nums = nonBlank.map(Number).filter((n) => Number.isFinite(n))
    if (nums.length) {
      parts.push(`min=${Math.min(...nums)}`)
      parts.push(`max=${Math.max(...nums)}`)
    }
  } else if (col.dataType === 'string' || col.dataType === 'boolean') {
    const uniq = new Set(nonBlank.map((v) => String(v)))
    parts.push(`唯一值${uniq.size}`)
  }
  return parts.length ? ` {${parts.join(', ')}}` : ''
}

function formatColumnLine(c: ColumnMeta, rows: Row[]): string {
  const unit = extractUnitHint(c.field) ?? extractUnitHint(c.title)
  const titleNote = c.title && c.title !== c.field ? ` title="${c.title}"` : ''
  const unitNote = unit ? ` unit=${unit}` : ''
  return `- field=\`${c.field}\` (${c.dataType}${unitNote}${titleNote})${columnStats(c, rows)}`
}

/** 样例行：field=value，避免无标签管道符让模型猜错列序。 */
function formatSampleRows(t: AnalysisTable, limit = 3): string[] {
  return t.rows.slice(0, limit).map((r, i) => {
    const cells = t.columns
      .slice(0, 12)
      .map((c) => `${c.field}=${JSON.stringify(r[c.field] ?? null)}`)
      .join(', ')
    const more = t.columns.length > 12 ? `, …(+${t.columns.length - 12} cols)` : ''
    return `  row${i + 1}: {${cells}${more}}`
  })
}

/** 完整 schema 文本（get_table_schema / 上下文共用）。 */
export function formatTableSchema(t: AnalysisTable, opts?: { sampleRows?: number }): string {
  const sampleN = opts?.sampleRows ?? 5
  const colLines = t.columns.map((c) => formatColumnLine(c, t.rows))
  const samples = t.rows.length ? formatSampleRows({ ...t, rows: t.rows.slice(0, sampleN) }, sampleN) : ['  （无数据行）']
  const chartHint = suggestChartHints(t.columns)
  return [
    `表「${t.name}」（id: ${t.id}，${t.rows.length} 行 × ${t.columns.length} 列）`,
    '列（配图/过滤必须使用 field 精确值，勿臆造）：',
    ...colLines,
    '样例：',
    ...samples,
    chartHint ? `配图建议：${chartHint}` : '',
  ]
    .filter(Boolean)
    .join('\n')
}

/** 上下文用的短摘要（仍含 field）。 */
export function formatTableBrief(t: AnalysisTable, withSample = true): string {
  const cols = t.columns
    .slice(0, 16)
    .map((c) => {
      const unit = extractUnitHint(c.field) ?? extractUnitHint(c.title)
      return `\`${c.field}\`:${c.dataType}${unit ? `(${unit})` : ''}`
    })
    .join('、')
  const more = t.columns.length > 16 ? `…共${t.columns.length}列` : ''
  const lines = [`- 「${t.name}」(id: ${t.id}) ${t.rows.length} 行 × ${t.columns.length} 列：${cols}${more}`]
  if (withSample && t.rows.length) {
    lines.push(...formatSampleRows(t, 2))
  }
  if (t.views.length) {
    lines.push(
      `  视图：${t.views.map((v) => `「${v.name}」(${v.type}, id: ${v.id}${v.chart ? `, chart:${v.chart.chartType}` : ''})`).join('、')}`,
    )
  }
  return lines.join('\n')
}

function suggestChartHints(columns: ColumnMeta[]): string {
  const nums = columns.filter((c) => c.dataType === 'number')
  const cats = columns.filter((c) => c.dataType === 'string' || c.dataType === 'date' || c.dataType === 'datetime')
  if (!nums.length) return ''
  if (nums.length >= 2) {
    return `相关/分布可用 scatter：x=\`${nums[0]!.field}\` values=[\`${nums[1]!.field}\`]；对比可用 bar：x=\`${(cats[0] ?? nums[0])!.field}\` y=\`${nums[0]!.field}\``
  }
  if (cats.length) {
    return `对比可用 bar：x=\`${cats[0]!.field}\` y=\`${nums[0]!.field}\`（aggregation 按需）`
  }
  return `可用 bignumber：values=[\`${nums[0]!.field}\`]`
}

/** 供测试：按类型粗分列。 */
export function partitionColumnsByType(columns: ColumnMeta[]): Record<DataType | 'other', string[]> {
  const out: Record<string, string[]> = {}
  for (const c of columns) {
    const k = c.dataType || 'other'
    ;(out[k] ??= []).push(c.field)
  }
  return out as Record<DataType | 'other', string[]>
}

/** TableCatalog 系统消息前缀：agentLoop 每轮替换同前缀旧块，避免堆叠。 */
export const TABLE_CATALOG_MARK = '【TableCatalog】'

/**
 * 每轮注入的表目录：列类型 + 样例行（Join/Filter 须用精确 tableId / field）。
 */
export function buildTableCatalog(
  analysis: import('../../shared/types').Analysis | null,
  opts?: { maxTables?: number; sampleRows?: number },
): string {
  const maxTables = opts?.maxTables ?? 12
  const sampleRows = opts?.sampleRows ?? 3
  if (!analysis) {
    return `${TABLE_CATALOG_MARK}\n当前没有打开的分析。可用 list_analyses / create_analysis。`
  }
  if (!analysis.tables.length) {
    return `${TABLE_CATALOG_MARK}\n当前分析「${analysis.name}」(id: ${analysis.id}) 尚无表。可用 import_csv_text / import_ai_file 导入。`
  }
  const shown = analysis.tables.slice(0, maxTables)
  const blocks = shown.map((t) => formatTableSchema(t, { sampleRows }))
  const more =
    analysis.tables.length > maxTables
      ? `\n…另有 ${analysis.tables.length - maxTables} 张表未列出，请用 list_tables / get_table_schema。`
      : ''
  return [
    `${TABLE_CATALOG_MARK} 每轮刷新；配图/过滤必须使用 field 精确值；Join 必须显式 leftTableId 与 rightTableId。`,
    `分析：「${analysis.name}」(id: ${analysis.id})`,
    '',
    ...blocks,
    more,
  ]
    .filter((line, i, arr) => !(line === '' && arr[i - 1] === ''))
    .join('\n')
}
