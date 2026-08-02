/**
 * MODEL TABLES 数据构建（6G-1）：
 * - MODEL VARIABLES：参数 + 估计值 + CI95 上下限 + r² 行
 * - MODEL OUTPUT：X / Y / Y pred / Residual（按 x 排序，含打标状态）
 * 输出为纯 JSON（可序列化，随 BuildOutput 传递）。
 */
import type { RegressionModel } from '../../../shared/types'
import { MODEL_LABELS, type FitInputPoint, type FitResult } from './engine'

export interface FitVariableRow {
  name: string
  estimate: number | null
  ciLow: number | null
  ciHigh: number | null
}

export interface FitOutputRow {
  x: number
  y: number
  yPred: number
  residual: number
  flagged: boolean
}

export interface FitGroupSummary {
  /** 组名（无分组时为 ''）。 */
  group: string
  model: RegressionModel
  modelLabel: string
  r2: number | null
  converged: boolean | null
  iterations: number | null
  usedPoints: number
  variables: FitVariableRow[]
  output: FitOutputRow[]
  warnings: string[]
}

/** 参数表行（不含 r²；point-to-point 非回归 → 空表）。 */
export function modelVariablesOf(fit: FitResult): FitVariableRow[] {
  const p = fit.params
  if (!p) return []
  const row = (name: string, estimate: number, ci?: [number, number]): FitVariableRow => ({
    name,
    estimate,
    ciLow: ci?.[0] ?? null,
    ciHigh: ci?.[1] ?? null,
  })
  switch (p.kind) {
    case 'linear':
      return [row('Slope', p.slope, p.ci95.slope), row('Intercept', p.intercept, p.ci95.intercept)]
    case 'quadratic':
      return [row('a (constant)', p.a, p.ci95.a), row('b (x)', p.b, p.ci95.b), row('c (x²)', p.c, p.ci95.c)]
    case '4pl':
      return [
        row('Min', p.min, p.ci95.min),
        row('Max', p.max, p.ci95.max),
        row('Hill Slope', p.hillSlope, p.ci95.hillSlope),
        row('Inflection Point', p.inflectionPoint, p.ci95.inflectionPoint),
      ]
    default:
      return []
  }
}

/** MODEL OUTPUT 行：全部输入点（含 flagged）按 x 排序，pred/residual 由模型计算。 */
export function modelOutputOf(fit: FitResult, points: FitInputPoint[]): FitOutputRow[] {
  if (!fit.ok) return []
  return points
    .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y))
    .map((p) => {
      const yPred = fit.predict(p.x)
      return {
        x: p.x,
        y: p.y,
        yPred,
        residual: Number.isFinite(yPred) ? p.y - yPred : Number.NaN,
        flagged: !!p.flagged,
      }
    })
    .sort((a, b) => a.x - b.x)
}

/** 经验 AUC（梯形积分，排除打标点，按 x 排序；对齐 Prism 的 Area Under Curve）。 */
export function aucOf(fit: FitResult, points: FitInputPoint[]): number | null {
  if (!fit.ok) return null
  const pts = points
    .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y) && !p.flagged)
    .sort((a, b) => a.x - b.x)
  if (pts.length < 2) return null
  let auc = 0
  for (let i = 1; i < pts.length; i += 1) {
    auc += ((pts[i].x - pts[i - 1].x) * (pts[i].y + pts[i - 1].y)) / 2
  }
  return auc
}

/** 汇总一组拟合 → BuildOutput.fits 条目。 */
export function summarizeFit(group: string, fit: FitResult, points: FitInputPoint[]): FitGroupSummary {
  const variables = modelVariablesOf(fit)
  if (fit.r2 !== null) variables.push({ name: 'R²', estimate: fit.r2, ciLow: null, ciHigh: null })
  const auc = aucOf(fit, points)
  if (auc !== null) variables.push({ name: 'AUC', estimate: auc, ciLow: null, ciHigh: null })
  return {
    group,
    model: fit.model,
    modelLabel: MODEL_LABELS[fit.model],
    r2: fit.r2,
    converged: fit.converged,
    iterations: fit.iterations,
    usedPoints: fit.usedPoints,
    variables,
    output: modelOutputOf(fit, points),
    warnings: fit.warnings,
  }
}
