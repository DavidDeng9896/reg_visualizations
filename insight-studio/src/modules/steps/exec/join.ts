import type { AnalysisTable, JoinKey, JoinType, Row } from '../../../shared/types'
import { combineTables } from '../../../shared/join'
import { createTable } from '../../../shared/factories'
import type { StepExecCtx, StepExecResult, StepPreviewResult } from './types'

export interface JoinStepConfig {
  joinType: JoinType
  keys: JoinKey[]
  suffixes: [string, string]
}

function readConfig(config: Record<string, unknown>): JoinStepConfig {
  return {
    joinType: (config.joinType as JoinType) ?? 'left',
    keys: (config.keys as JoinKey[]) ?? [],
    suffixes: (config.suffixes as [string, string]) ?? ['_x', '_y'],
  }
}

function keyOf(row: Row, fields: string[]): string {
  return fields.map((f) => JSON.stringify(row[f] ?? null)).join('')
}

/** join 匹配统计：匹配输出行数 / 左未匹配行数 / 右未匹配行数。 */
export function computeJoinStats(
  left: AnalysisTable,
  right: AnalysisTable,
  config: Record<string, unknown>,
): { label: string; value: string }[] {
  const { keys } = readConfig(config)
  if (!left || !right || keys.length === 0) return []
  const leftFields = keys.map((k) => k.left)
  const rightFields = keys.map((k) => k.right)

  const rightIndex = new Map<string, number>()
  for (const r of right.rows) {
    const k = keyOf(r, rightFields)
    rightIndex.set(k, (rightIndex.get(k) ?? 0) + 1)
  }
  const leftKeys = new Set<string>()
  let matched = 0
  let leftUnmatched = 0
  for (const l of left.rows) {
    const k = keyOf(l, leftFields)
    leftKeys.add(k)
    const n = rightIndex.get(k) ?? 0
    if (n > 0) matched += n
    else leftUnmatched += 1
  }
  let rightUnmatched = 0
  for (const r of right.rows) {
    if (!leftKeys.has(keyOf(r, rightFields))) rightUnmatched += 1
  }
  return [
    { label: '匹配行数', value: String(matched) },
    { label: '左未匹配', value: String(leftUnmatched) },
    { label: '右未匹配', value: String(rightUnmatched) },
  ]
}

export function validateJoin(left: AnalysisTable, right: AnalysisTable, config: Record<string, unknown>): string | null {
  const { joinType, keys } = readConfig(config)
  if (!left || !right) return '需要左右两个输入表'
  if (joinType !== 'append' && keys.length === 0) return '请至少指定一个连接键'
  for (const k of keys) {
    if (!left.columns.some((c) => c.field === k.left)) return `左表缺少键列 "${k.left}"`
    if (!right.columns.some((c) => c.field === k.right)) return `右表缺少键列 "${k.right}"`
  }
  return null
}

export function executeJoin(
  left: AnalysisTable,
  right: AnalysisTable,
  config: Record<string, unknown>,
  name: string,
): StepExecResult {
  const err = validateJoin(left, right, config)
  if (err) return { status: 'failed', error: err }
  const { joinType, keys, suffixes } = readConfig(config)
  try {
    const out = combineTables(left, right, { joinType, keys, suffix: suffixes[1] })
    const table = createTable(name, out.columns, out.rows, 'step')
    return { status: 'configured', outputTables: [table] }
  } catch (e) {
    return { status: 'failed', error: e instanceof Error ? e.message : 'Join 执行失败' }
  }
}

export function previewJoin(
  left: AnalysisTable,
  right: AnalysisTable,
  config: Record<string, unknown>,
  limit: number,
): StepPreviewResult {
  const err = validateJoin(left, right, config)
  if (err) return { columns: [], rows: [], totalRows: 0, error: err }
  const { joinType, keys, suffixes } = readConfig(config)
  try {
    const out = combineTables(left, right, { joinType, keys, suffix: suffixes[1] })
    return {
      columns: out.columns,
      rows: out.rows.slice(0, limit),
      totalRows: out.rows.length,
      stats: computeJoinStats(left, right, config),
    }
  } catch (e) {
    return { columns: [], rows: [], totalRows: 0, error: e instanceof Error ? e.message : 'Join 预览失败' }
  }
}

export function execJoin(ctx: StepExecCtx): StepExecResult {
  const left = ctx.inputs['Left table'] as AnalysisTable | undefined
  const right = ctx.inputs['Right table'] as AnalysisTable | undefined
  if (!left || !right) return { status: 'failed', error: 'Join 需要左右两个输入表' }
  return executeJoin(left, right, ctx.step.config, ctx.step.name)
}
