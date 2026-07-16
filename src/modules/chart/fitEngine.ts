export type FitModel = 'ptp' | 'linear' | 'quadratic' | '4pl'

/** 4PL 可选渐近线约束（docs line-charts：约束 min·max） */
export interface FitConstraints {
  /** 下渐近线；缺省用数据 Y 最小值 */
  min?: number
  /** 上渐近线；缺省用数据 Y 最大值 */
  max?: number
  /** Linear / Quadratic：强制过原点 */
  throughOrigin?: boolean
}

export interface FitResult {
  curve: [number, number][]
  variables: Record<string, number>
  output: Record<string, unknown>[]
  /** false 表示未产出可用拟合曲线 */
  ok: boolean
  /** 面向用户的边界/失败说明 */
  warning?: string
}

const MODEL_LABEL: Record<FitModel, string> = {
  ptp: 'Point-to-Point',
  linear: '线性拟合',
  quadratic: '二次拟合',
  '4pl': '4PL',
}

/** 各模型最少有效点数（4PL 四参数至少 4 点） */
export const MIN_FIT_POINTS: Record<FitModel, number> = {
  ptp: 1,
  linear: 2,
  quadratic: 3,
  '4pl': 4,
}

function emptyFail(warning: string): FitResult {
  return { curve: [], variables: {}, output: [], ok: false, warning }
}

function linReg(xs: number[], ys: number[], throughOrigin = false) {
  if (throughOrigin) {
    let num = 0
    let den = 0
    for (let i = 0; i < xs.length; i++) {
      num += xs[i] * ys[i]
      den += xs[i] * xs[i]
    }
    const slope = den === 0 ? 0 : num / den
    return { slope, intercept: 0, den }
  }
  const n = xs.length
  const mx = xs.reduce((a, b) => a + b, 0) / n
  const my = ys.reduce((a, b) => a + b, 0) / n
  let num = 0
  let den = 0
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (ys[i] - my)
    den += (xs[i] - mx) ** 2
  }
  const slope = den === 0 ? 0 : num / den
  const intercept = my - slope * mx
  return { slope, intercept, den }
}

/** Quadratic through origin: y = a x² + b x */
function quadThroughOrigin(xs: number[], ys: number[]): [number, number] | null {
  let sx4 = 0
  let sx3 = 0
  let sx2 = 0
  let sx2y = 0
  let sxy = 0
  for (let i = 0; i < xs.length; i++) {
    const x = xs[i]
    const y = ys[i]
    const x2 = x * x
    sx4 += x2 * x2
    sx3 += x2 * x
    sx2 += x2
    sx2y += x2 * y
    sxy += x * y
  }
  const det = sx4 * sx2 - sx3 * sx3
  if (Math.abs(det) < 1e-12) return null
  const a = (sx2y * sx2 - sx3 * sxy) / det
  const b = (sx4 * sxy - sx3 * sx2y) / det
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null
  return [a, b]
}

/** Simple 4PL via grid search on hill + inflection (demo-quality) */
function fit4pl(xs: number[], ys: number[], constraints?: FitConstraints) {
  const dataMin = Math.min(...ys)
  const dataMax = Math.max(...ys)
  const min = constraints?.min != null && Number.isFinite(constraints.min) ? constraints.min : dataMin
  const max = constraints?.max != null && Number.isFinite(constraints.max) ? constraints.max : dataMax
  let best = { hill: 1, inf: xs.reduce((a, b) => a + b, 0) / xs.length, err: Infinity }
  for (const hill of [0.5, 1, 1.5, 2, 3]) {
    for (let k = 0; k < 20; k++) {
      const inf = xs[0] + ((xs[xs.length - 1] - xs[0]) * k) / 19
      let err = 0
      for (let i = 0; i < xs.length; i++) {
        const pred = min + (max - min) / (1 + Math.pow(inf / (xs[i] || 1e-9), hill))
        err += (pred - ys[i]) ** 2
      }
      if (err < best.err) best = { hill, inf, err }
    }
  }
  return { min, max, hill: best.hill, inflection: best.inf, err: best.err }
}

function validatePoints(
  points: [number, number][],
  model: FitModel,
  constraints?: FitConstraints,
): string | null {
  if (!points.length) return '没有可用于拟合的数据点'
  const need = MIN_FIT_POINTS[model]
  if (points.length < need) {
    return `${MODEL_LABEL[model]} 至少需要 ${need} 个有效点（当前 ${points.length}）`
  }
  if (model === '4pl') {
    const xs = points.map((p) => p[0])
    const ys = points.map((p) => p[1])
    const xMin = Math.min(...xs)
    const xMax = Math.max(...xs)
    const yMin = Math.min(...ys)
    const yMax = Math.max(...ys)
    if (xMin === xMax) return '4PL 需要 X 值有跨度；当前全部相同，无法估计拐点'
    if (yMin === yMax && constraints?.min == null && constraints?.max == null) {
      return '4PL 需要 Y 值有变化以估计上下渐近线；当前全部相同'
    }
    const cMin = constraints?.min
    const cMax = constraints?.max
    if (cMin != null && cMax != null && Number.isFinite(cMin) && Number.isFinite(cMax) && cMin >= cMax) {
      return '4PL 渐近约束无效：min 必须小于 max'
    }
  }
  return null
}

export function fitSeries(
  points: [number, number][],
  model: FitModel,
  constraints?: FitConstraints,
): FitResult {
  const gate = validatePoints(points, model, constraints)
  if (gate) return emptyFail(gate)

  const sorted = [...points].sort((a, b) => a[0] - b[0])
  const xs = sorted.map((p) => p[0])
  const ys = sorted.map((p) => p[1])
  const xMin = xs[0]
  const xMax = xs[xs.length - 1]
  const curve: [number, number][] = []
  const output: Record<string, unknown>[] = []
  let variables: Record<string, number> = {}

  try {
    if (model === 'ptp') {
      for (const p of sorted) curve.push([p[0], p[1]])
      variables = {}
    } else if (model === 'linear') {
      const throughOrigin = !!constraints?.throughOrigin
      const { slope, intercept, den } = linReg(xs, ys, throughOrigin)
      if (den === 0) {
        return emptyFail(
          throughOrigin
            ? '线性过原点拟合失败：X 全为 0，无法估计斜率'
            : '线性拟合失败：X 值无变化，无法估计斜率',
        )
      }
      variables = { slope, intercept }
      for (let i = 0; i <= 50; i++) {
        const x = xMin + ((xMax - xMin) * i) / 50
        const y = slope * x + intercept
        curve.push([x, y])
      }
      for (let i = 0; i < xs.length; i++) {
        const pred = slope * xs[i] + intercept
        output.push({ x: xs[i], y: ys[i], predicted: pred, residual: ys[i] - pred })
      }
    } else if (model === 'quadratic') {
      const throughOrigin = !!constraints?.throughOrigin
      let a: number
      let b: number
      let c: number
      if (throughOrigin) {
        const coeff = quadThroughOrigin(xs, ys)
        if (!coeff) {
          return emptyFail('二次过原点拟合数值不稳定，请检查数据')
        }
        ;[a, b] = coeff
        c = 0
      } else {
        // fit y = a x^2 + b x + c via normal equations (3x3)
        const sx = xs.reduce((sum, v) => sum + v, 0)
        const sx2 = xs.reduce((sum, v) => sum + v * v, 0)
        const sx3 = xs.reduce((sum, v) => sum + v ** 3, 0)
        const sx4 = xs.reduce((sum, v) => sum + v ** 4, 0)
        const sy = ys.reduce((sum, v) => sum + v, 0)
        const sxy = xs.reduce((sum, v, i) => sum + v * ys[i], 0)
        const sx2y = xs.reduce((sum, v, i) => sum + v * v * ys[i], 0)
        const n = xs.length
        const A = [
          [sx4, sx3, sx2],
          [sx3, sx2, sx],
          [sx2, sx, n],
        ]
        const B = [sx2y, sxy, sy]
        const coeff = solve3(A, B)
        if (coeff.some((v) => !Number.isFinite(v))) {
          return emptyFail('二次拟合数值不稳定，请检查数据点是否共线或过少')
        }
        ;[a, b, c] = coeff
      }
      variables = { a, b, c }
      for (let i = 0; i <= 50; i++) {
        const x = xMin + ((xMax - xMin) * i) / 50
        curve.push([x, a * x * x + b * x + c])
      }
      for (let i = 0; i < xs.length; i++) {
        const pred = a * xs[i] ** 2 + b * xs[i] + c
        output.push({ x: xs[i], y: ys[i], predicted: pred, residual: ys[i] - pred })
      }
    } else {
      const p = fit4pl(xs, ys, constraints)
      if (!Number.isFinite(p.inflection) || !Number.isFinite(p.hill)) {
        return emptyFail('4PL 拟合失败：未能收敛到有效参数，请检查剂量-响应数据')
      }
      if (!(p.max > p.min)) {
        return emptyFail('4PL 渐近约束无效：min 必须小于 max')
      }
      variables = { min: p.min, max: p.max, hillSlope: p.hill, inflection: p.inflection }
      for (let i = 0; i <= 50; i++) {
        const x = xMin + ((xMax - xMin) * i) / 50
        const y = p.min + (p.max - p.min) / (1 + Math.pow(p.inflection / (x || 1e-9), p.hill))
        if (!Number.isFinite(y)) {
          return emptyFail('4PL 曲线含非有限值，请检查 X 是否含 0 或极端量级')
        }
        curve.push([x, y])
      }
      for (let i = 0; i < xs.length; i++) {
        const pred =
          p.min + (p.max - p.min) / (1 + Math.pow(p.inflection / (xs[i] || 1e-9), p.hill))
        output.push({ x: xs[i], y: ys[i], predicted: pred, residual: ys[i] - pred })
      }
    }
  } catch (err) {
    return emptyFail(`${MODEL_LABEL[model]} 拟合异常：${String(err)}`)
  }

  return { curve, variables, output, ok: true }
}

function solve3(A: number[][], B: number[]): number[] {
  const m = A.map((row, i) => [...row, B[i]])
  const n = 3
  for (let i = 0; i < n; i++) {
    let max = i
    for (let k = i + 1; k < n; k++) if (Math.abs(m[k][i]) > Math.abs(m[max][i])) max = k
    ;[m[i], m[max]] = [m[max], m[i]]
    const piv = m[i][i] || 1e-12
    for (let j = i; j <= n; j++) m[i][j] /= piv
    for (let k = 0; k < n; k++) {
      if (k === i) continue
      const f = m[k][i]
      for (let j = i; j <= n; j++) m[k][j] -= f * m[i][j]
    }
  }
  return m.map((row) => row[n])
}
