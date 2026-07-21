/**
 * 聚合与误差棒统计（纯函数）。
 * 约定：空值/非数值一律剔除；SD 为样本标准差（n-1）；SEM = SD / √n。
 */
import type { Aggregation, CellValue, ErrorBarType, Row } from '../../../shared/types'
import { isBlank } from '../../../shared/pipeline'

export function toFiniteNumber(v: CellValue | undefined): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'boolean') return v ? 1 : 0
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v)
    if (Number.isFinite(n)) return n
  }
  return null
}

/** 提取某列的全部有效数值（剔除空值与非数值）。 */
export function numericValues(rows: Row[], field: string): number[] {
  const out: number[] = []
  for (const row of rows) {
    const n = toFiniteNumber(row[field])
    if (n !== null) out.push(n)
  }
  return out
}

/** 对数值数组做聚合；空数组 → null。 */
export function aggregateValues(values: number[], method: Aggregation): number | null {
  if (!values.length) return null
  switch (method) {
    case 'count':
      return values.length
    case 'sum':
      return values.reduce((a, b) => a + b, 0)
    case 'min':
      return Math.min(...values)
    case 'max':
      return Math.max(...values)
    case 'mean':
      return values.reduce((a, b) => a + b, 0) / values.length
    case 'median':
      return quantile(values, 0.5)
    case 'none':
      return null
    default:
      return null
  }
}

/**
 * 行级聚合入口：
 * - method === 'count'：field 为空 → 行数；否则非空单元格计数（Count non-blank）。
 * - 其他聚合：剔除空值/非数值后计算。
 */
export function aggregateRows(rows: Row[], field: string | null, method: Aggregation): number | null {
  if (method === 'count') {
    return field ? rows.filter((r) => !isBlank(r[field])).length : rows.length
  }
  if (!field) return null
  return aggregateValues(numericValues(rows, field), method)
}

/** 线性插值分位数（输入无需有序）。 */
export function quantile(values: number[], q: number): number | null {
  if (!values.length) return null
  const s = values.slice().sort((a, b) => a - b)
  const pos = (s.length - 1) * q
  const lo = Math.floor(pos)
  const hi = Math.ceil(pos)
  if (lo === hi) return s[lo]
  return s[lo] + (s[hi] - s[lo]) * (pos - lo)
}

/** 样本标准差（n-1）；n<2 → null。 */
export function standardDeviation(values: number[]): number | null {
  const n = values.length
  if (n < 2) return null
  const mean = values.reduce((a, b) => a + b, 0) / n
  const variance = values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / (n - 1)
  return Math.sqrt(variance)
}

/** 均值标准误 SEM = SD / √n；n<2 → null。 */
export function standardError(values: number[]): number | null {
  const sd = standardDeviation(values)
  if (sd === null) return null
  return sd / Math.sqrt(values.length)
}

/** 按误差棒类型取误差幅度。 */
export function errorValue(values: number[], type: ErrorBarType): number | null {
  switch (type) {
    case 'sd':
      return standardDeviation(values)
    case 'sem':
      return standardError(values)
    default:
      return null
  }
}

export interface FiveNumber {
  /** 须端（1.5×IQR 内最值）。 */
  low: number
  q1: number
  q2: number
  q3: number
  high: number
  outliers: number[]
}

/** 箱线五数：须 = 1.5×IQR 内的最值；须外为离群点。 */
export function fiveNumber(values: number[]): FiveNumber | null {
  if (!values.length) return null
  const q1 = quantile(values, 0.25)!
  const q2 = quantile(values, 0.5)!
  const q3 = quantile(values, 0.75)!
  const iqr = q3 - q1
  const loFence = q1 - 1.5 * iqr
  const hiFence = q3 + 1.5 * iqr
  const inside = values.filter((v) => v >= loFence && v <= hiFence)
  const outliers = values.filter((v) => v < loFence || v > hiFence)
  return { low: Math.min(...inside), q1, q2, q3, high: Math.max(...inside), outliers }
}

export const AGGREGATION_LABELS: Record<Aggregation, string> = {
  none: 'None',
  count: 'Count',
  sum: 'Sum',
  mean: 'Average',
  median: 'Median',
  min: 'Min',
  max: 'Max',
}

/** 聚合显示名（胶囊 / 轴默认标签用，如 `Average of Concentration`）。 */
export function aggregationLabel(method?: Aggregation): string {
  return AGGREGATION_LABELS[method ?? 'count'] ?? 'Count'
}
