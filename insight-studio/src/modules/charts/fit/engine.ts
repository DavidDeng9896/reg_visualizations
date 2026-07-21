/**
 * 拟合引擎编排层：
 * runFit(points, config, opts) → FitResult
 * - 最少点数校验（不足返回 ok:false + 警告，不画线）
 * - excludeFlagged 滤点（6F-1）
 * - log 轴 → log10 空间拟合，预测/曲线 back-transform
 * - 4PL 固定要求 x > 0（内部在 t = ln(x) 或 log10(x) 空间求解）
 * - 曲线 120 采样点；Linear/Quadratic 附 95% CI 带
 */
import type { RegressionConfig, RegressionModel } from '../../../shared/types'
import { fit4PL, fitLinear, fitQuadratic, predict4PL, tCrit95 } from './models'

export interface FitInputPoint {
  x: number
  y: number
  rowId?: string
  flagged?: boolean
  weight?: number
}

export interface FitOptions {
  /** X 轴为 log（且数据为正）→ 在 log10(x) 空间拟合。 */
  logX?: boolean
  /** Y 轴为 log（且数据为正）→ 在 log10(y) 空间拟合。 */
  logY?: boolean
}

export type FitParams =
  | { kind: 'point-to-point' }
  | { kind: 'linear'; slope: number; intercept: number; ci95: { slope: [number, number]; intercept: [number, number] } }
  | { kind: 'quadratic'; a: number; b: number; c: number; ci95: { a: [number, number]; b: [number, number]; c: [number, number] } }
  | {
      kind: '4pl'
      min: number
      max: number
      hillSlope: number
      inflectionPoint: number
      ci95: { min: [number, number]; max: [number, number]; hillSlope: [number, number]; inflectionPoint: [number, number] }
      converged: boolean
      iterations: number
    }

export interface FitResult {
  model: RegressionModel
  /** false = 拟合不可用（点数不足 / 奇异 / 无正数等），只画数据不画线。 */
  ok: boolean
  warnings: string[]
  params: FitParams | null
  r2: number | null
  converged: boolean | null
  iterations: number | null
  /** 原始坐标预测。ok=false 时为恒 NaN。 */
  predict: (x: number) => number
  /** 原始坐标曲线（≥100 采样点；point-to-point 为排序后的数据点）。 */
  curve: { x: number; y: number }[]
  /** Linear/Quadratic 的 95% 均值置信带（原始坐标）。 */
  ciBand?: { x: number; lower: number; upper: number }[]
  /** 参与拟合的点数（滤除后）。 */
  usedPoints: number
}

export const MODEL_LABELS: Record<RegressionModel, string> = {
  none: 'None',
  'point-to-point': 'Point-to-Point',
  linear: 'Linear',
  quadratic: 'Quadratic',
  '4pl': '4PL',
}

export function minPointsFor(model: RegressionModel): number {
  switch (model) {
    case 'linear':
      return 2
    case 'quadratic':
      return 3
    case '4pl':
      return 4
    case 'point-to-point':
      return 2
    default:
      return 0
  }
}

const CURVE_SAMPLES = 120

function failed(model: RegressionModel, warnings: string[], usedPoints: number): FitResult {
  return {
    model,
    ok: false,
    warnings,
    params: null,
    r2: null,
    converged: null,
    iterations: null,
    predict: () => Number.NaN,
    curve: [],
    usedPoints,
  }
}

/** 拟合空间变换描述。 */
interface Space {
  /** x 原始 → 拟合 t（4PL 用 ln/log10，其余模型恒等或 log10）。 */
  tx: (x: number) => number
  /** 拟合 t → 原始 x。 */
  bx: (t: number) => number
  /** y 原始 → 拟合。 */
  ty: (y: number) => number
  /** 拟合 → 原始 y。 */
  by: (v: number) => number
}

function makeSpace(model: RegressionModel, opts: FitOptions): Space {
  const logX = !!opts.logX
  const logY = !!opts.logY
  if (model === '4pl') {
    // 4PL 内部模型 exp(-hill·(t-c))：t 必须与 inflection 同量纲
    return {
      tx: logX ? (x) => Math.log10(x) : (x) => Math.log(x),
      bx: logX ? (t) => 10 ** t : (t) => Math.exp(t),
      ty: logY ? (y) => Math.log10(y) : (y) => y,
      by: logY ? (v) => 10 ** v : (v) => v,
    }
  }
  return {
    tx: logX ? (x) => Math.log10(x) : (x) => x,
    bx: logX ? (t) => 10 ** t : (t) => t,
    ty: logY ? (y) => Math.log10(y) : (y) => y,
    by: logY ? (v) => 10 ** v : (v) => v,
  }
}

export function runFit(input: FitInputPoint[], config: RegressionConfig, opts: FitOptions = {}): FitResult {
  const model = config.model
  const warnings: string[] = []
  if (model === 'none') return failed(model, warnings, 0)

  const space = makeSpace(model, opts)

  // 1) 基础清洗：有限数值；权重缺省/非法 → 等权
  let pts = input
    .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y))
    .map((p) => ({ ...p, weight: p.weight !== undefined && Number.isFinite(p.weight) && p.weight > 0 ? p.weight : 1 }))

  // 2) excludeFlagged（6F-1）
  if (config.excludeFlagged) pts = pts.filter((p) => !p.flagged)

  // 3) log / 4PL 正数约束
  const needPosX = opts.logX || model === '4pl'
  if (needPosX) {
    const before = pts.length
    pts = pts.filter((p) => p.x > 0)
    const dropped = before - pts.length
    if (dropped > 0) warnings.push(`拟合忽略 ${dropped} 个非正 X 点（${opts.logX ? 'Log 轴' : '4PL'}要求 X > 0）`)
  }
  if (opts.logY) {
    const before = pts.length
    pts = pts.filter((p) => p.y > 0)
    const dropped = before - pts.length
    if (dropped > 0) warnings.push(`拟合忽略 ${dropped} 个非正 Y 点（Log 轴要求 Y > 0）`)
  }

  // 4) 最少点数
  const minPts = minPointsFor(model)
  if (pts.length < minPts) {
    warnings.push(`${MODEL_LABELS[model]} 至少需要 ${minPts} 个数据点（当前 ${pts.length} 个），未绘制拟合线`)
    return failed(model, warnings, pts.length)
  }

  const ts = pts.map((p) => space.tx(p.x))
  const ys = pts.map((p) => space.ty(p.y))
  const ws = pts.map((p) => p.weight!)
  const tMin = Math.min(...ts)
  const tMax = Math.max(...ts)

  /* ----------------------------- point-to-point ----------------------------- */
  if (model === 'point-to-point') {
    const sorted = pts
      .map((p, i) => ({ t: ts[i], x: p.x, y: p.y }))
      .sort((a, b) => a.t - b.t)
    const predict = (x: number): number => {
      const t = space.tx(x)
      if (!Number.isFinite(t) || sorted.length === 0) return Number.NaN
      if (t <= sorted[0].t) return sorted[0].y
      if (t >= sorted[sorted.length - 1].t) return sorted[sorted.length - 1].y
      for (let i = 1; i < sorted.length; i += 1) {
        if (t <= sorted[i].t) {
          const f = (t - sorted[i - 1].t) / (sorted[i].t - sorted[i - 1].t || 1)
          return sorted[i - 1].y + f * (sorted[i].y - sorted[i - 1].y)
        }
      }
      return sorted[sorted.length - 1].y
    }
    return {
      model,
      ok: true,
      warnings,
      params: { kind: 'point-to-point' },
      r2: null,
      converged: null,
      iterations: null,
      predict,
      curve: sorted.map((s) => ({ x: s.x, y: s.y })),
      usedPoints: pts.length,
    }
  }

  /* --------------------------------- linear --------------------------------- */
  if (model === 'linear') {
    const out = fitLinear(ts, ys, ws)
    if (!out.ok) {
      warnings.push(out.error)
      return failed(model, warnings, pts.length)
    }
    const f = out.fit
    const predict = (x: number) => space.by(f.intercept + f.slope * space.tx(x))
    const curve: { x: number; y: number }[] = []
    const ciBand: { x: number; lower: number; upper: number }[] = []
    const tCrit = tCrit95(f.df)
    for (let i = 0; i < CURVE_SAMPLES; i += 1) {
      const t = tMin + ((tMax - tMin) * i) / (CURVE_SAMPLES - 1)
      const v = f.intercept + f.slope * t
      // var(ŷ) = [1,t]·cov·[1,t]ᵀ
      const varY = f.cov[0][0] + 2 * t * f.cov[0][1] + t * t * f.cov[1][1]
      const half = tCrit * Math.sqrt(Math.max(varY, 0))
      curve.push({ x: space.bx(t), y: space.by(v) })
      ciBand.push({ x: space.bx(t), lower: space.by(v - half), upper: space.by(v + half) })
    }
    return {
      model,
      ok: true,
      warnings,
      params: { kind: 'linear', slope: f.slope, intercept: f.intercept, ci95: f.ci95 },
      r2: f.r2,
      converged: true,
      iterations: null,
      predict,
      curve,
      ciBand,
      usedPoints: pts.length,
    }
  }

  /* -------------------------------- quadratic -------------------------------- */
  if (model === 'quadratic') {
    const out = fitQuadratic(ts, ys, ws)
    if (!out.ok) {
      warnings.push(out.error)
      return failed(model, warnings, pts.length)
    }
    const f = out.fit
    const evalQ = (t: number) => f.a + f.b * t + f.c * t * t
    const predict = (x: number) => space.by(evalQ(space.tx(x)))
    const curve: { x: number; y: number }[] = []
    const ciBand: { x: number; lower: number; upper: number }[] = []
    const tCrit = tCrit95(f.df)
    for (let i = 0; i < CURVE_SAMPLES; i += 1) {
      const t = tMin + ((tMax - tMin) * i) / (CURVE_SAMPLES - 1)
      const v = evalQ(t)
      const basis = [1, t, t * t]
      let varY = 0
      for (let r = 0; r < 3; r += 1) {
        for (let c = 0; c < 3; c += 1) varY += basis[r] * f.cov[r][c] * basis[c]
      }
      const half = tCrit * Math.sqrt(Math.max(varY, 0))
      curve.push({ x: space.bx(t), y: space.by(v) })
      ciBand.push({ x: space.bx(t), lower: space.by(v - half), upper: space.by(v + half) })
    }
    return {
      model,
      ok: true,
      warnings,
      params: { kind: 'quadratic', a: f.a, b: f.b, c: f.c, ci95: f.ci95 },
      r2: f.r2,
      converged: true,
      iterations: null,
      predict,
      curve,
      ciBand,
      usedPoints: pts.length,
    }
  }

  /* ---------------------------------- 4PL ---------------------------------- */
  const out = fit4PL(ts, ys, ws, config.constraints)
  if (!out.ok) {
    warnings.push(out.error)
    return failed(model, warnings, pts.length)
  }
  const f = out.fit
  if (!f.converged) warnings.push('4PL 未完全收敛，参数为当前最优估计（可尝试设置 Constraints）')
  const predict = (x: number) => {
    if (x <= 0) return Number.NaN
    return space.by(predict4PL(f, space.tx(x)))
  }
  const curve: { x: number; y: number }[] = []
  for (let i = 0; i < CURVE_SAMPLES; i += 1) {
    const t = tMin + ((tMax - tMin) * i) / (CURVE_SAMPLES - 1)
    curve.push({ x: space.bx(t), y: space.by(predict4PL(f, t)) })
  }
  const ciT = f.ci95
  const backCI = (ci: [number, number]): [number, number] => [space.bx(ci[0]), space.bx(ci[1])]
  const byCI = (ci: [number, number]): [number, number] => [space.by(ci[0]), space.by(ci[1])]
  return {
    model,
    ok: true,
    warnings,
    params: {
      kind: '4pl',
      min: space.by(f.min),
      max: space.by(f.max),
      hillSlope: f.hillSlope,
      inflectionPoint: space.bx(f.inflectionT),
      ci95: {
        min: byCI(ciT.min),
        max: byCI(ciT.max),
        hillSlope: ciT.hillSlope,
        inflectionPoint: backCI(ciT.inflectionT),
      },
      converged: f.converged,
      iterations: f.iterations,
    },
    r2: f.r2,
    converged: f.converged,
    iterations: f.iterations,
    predict,
    curve,
    usedPoints: pts.length,
  }
}

/** 人类可读方程（tooltip / 面板用）。 */
export function equationOf(fit: FitResult): string {
  const p = fit.params
  if (!p) return ''
  const fmt = (v: number) => {
    if (!Number.isFinite(v)) return '—'
    const abs = Math.abs(v)
    if (abs !== 0 && (abs >= 1e5 || abs < 1e-3)) return v.toExponential(2)
    return Number(v.toPrecision(4)).toString()
  }
  switch (p.kind) {
    case 'linear':
      return `y = ${fmt(p.intercept)} + ${fmt(p.slope)}·x`
    case 'quadratic':
      return `y = ${fmt(p.a)} + ${fmt(p.b)}·x + ${fmt(p.c)}·x²`
    case '4pl':
      return `4PL: min=${fmt(p.min)}  max=${fmt(p.max)}  hill=${fmt(p.hillSlope)}  inflection=${fmt(p.inflectionPoint)}`
    default:
      return 'Point-to-Point'
  }
}
