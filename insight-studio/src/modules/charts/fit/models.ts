/**
 * 拟合模型数学核心（纯 TS，无 DOM / Vue 依赖）。
 * - Linear：加权最小二乘（闭式解 + 协方差 CI95）
 * - Quadratic：3×3 正规方程（加权）+ CI95
 * - 4PL：Levenberg-Marquardt + 数值 Jacobian；统一在 t = ln(x) 空间求解（要求 x > 0）
 *   f(t) = min + (max-min) / (1 + exp(-hill·(t - c)))
 *   固定 ln 底使报告的 hillSlope 与教科书 Hill slope 定义一致（底数无关）；
 *   报告层 inflection = exp(c)。
 */

/* ------------------------------- 数值工具 ------------------------------- */

/** Lanczos 近似 ln Γ(x)（g=7，误差 <1e-12）。 */
function logGamma(x: number): number {
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059,
    12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
  ]
  if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - logGamma(1 - x)
  const z = x - 1
  let s = c[0]
  for (let i = 1; i < c.length; i += 1) s += c[i] / (z + i)
  const t = z + 7.5
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(s)
}

/** 不完全 beta 连分式（Numerical Recipes betacf）。 */
function betaCF(a: number, b: number, x: number): number {
  const qab = a + b
  const qap = a + 1
  const qam = a - 1
  let c = 1
  let d = 1 - (qab * x) / qap
  if (Math.abs(d) < 1e-300) d = 1e-300
  d = 1 / d
  let h = d
  for (let m = 1; m <= 200; m += 1) {
    const m2 = 2 * m
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2))
    d = 1 + aa * d
    if (Math.abs(d) < 1e-300) d = 1e-300
    c = 1 + aa / c
    if (Math.abs(c) < 1e-300) c = 1e-300
    d = 1 / d
    h *= d * c
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2))
    d = 1 + aa * d
    if (Math.abs(d) < 1e-300) d = 1e-300
    c = 1 + aa / c
    if (Math.abs(c) < 1e-300) c = 1e-300
    d = 1 / d
    const del = d * c
    h *= del
    if (Math.abs(del - 1) < 3e-14) break
  }
  return h
}

/** 正则化不完全 beta 函数 I_x(a, b)。 */
function regIncompleteBeta(a: number, b: number, x: number): number {
  if (x <= 0) return 0
  if (x >= 1) return 1
  const bt = Math.exp(logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log(1 - x))
  if (x < (a + 1) / (a + b + 2)) return (bt * betaCF(a, b, x)) / a
  return 1 - (bt * betaCF(b, a, 1 - x)) / b
}

/**
 * Student-t 双侧 95% 临界值（精确解，相对误差 <1e-9，任意 df≥1 适用）。
 * 利用恒等式 P(|T| > t) = I_{ν/(ν+t²)}(ν/2, 1/2)，对 t 二分求解尾部概率 = 0.05。
 */
export function tCrit95(df: number): number {
  if (!Number.isFinite(df) || df <= 0) return 1.959963984540054
  const tail = (t: number) => regIncompleteBeta(df / 2, 0.5, df / (df + t * t))
  let lo = 0
  let hi = 1
  while (tail(hi) > 0.05) hi *= 2 // 上界必然存在（t→∞ 时尾部→0）
  for (let i = 0; i < 100; i += 1) {
    const mid = (lo + hi) / 2
    if (tail(mid) > 0.05) lo = mid
    else hi = mid
  }
  return (lo + hi) / 2
}

type Mat = number[][]

/** 高斯消元（部分主元）解 Ax=b；奇异返回 null。 */
export function solveLinearSystem(a: Mat, b: number[]): number[] | null {
  const n = a.length
  const m: Mat = a.map((row, i) => [...row, b[i]])
  for (let col = 0; col < n; col += 1) {
    let piv = col
    for (let r = col + 1; r < n; r += 1) {
      if (Math.abs(m[r][col]) > Math.abs(m[piv][col])) piv = r
    }
    if (Math.abs(m[piv][col]) < 1e-14) return null
    if (piv !== col) {
      const tmp = m[col]
      m[col] = m[piv]
      m[piv] = tmp
    }
    const d = m[col][col]
    for (let r = 0; r < n; r += 1) {
      if (r === col) continue
      const f = m[r][col] / d
      if (f === 0) continue
      for (let c = col; c <= n; c += 1) m[r][c] -= f * m[col][c]
    }
  }
  return m.map((row, i) => row[n] / m[i][i])
}

/** Gauss-Jordan 求逆；奇异返回 null。 */
export function invertMatrix(a: Mat): Mat | null {
  const n = a.length
  const m: Mat = a.map((row, i) => [...row, ...row.map((_, j) => (i === j ? 1 : 0))])
  for (let col = 0; col < n; col += 1) {
    let piv = col
    for (let r = col + 1; r < n; r += 1) {
      if (Math.abs(m[r][col]) > Math.abs(m[piv][col])) piv = r
    }
    if (Math.abs(m[piv][col]) < 1e-14) return null
    if (piv !== col) {
      const tmp = m[col]
      m[col] = m[piv]
      m[piv] = tmp
    }
    const d = m[col][col]
    for (let c = 0; c < 2 * n; c += 1) m[col][c] /= d
    for (let r = 0; r < n; r += 1) {
      if (r === col) continue
      const f = m[r][col]
      if (f === 0) continue
      for (let c = 0; c < 2 * n; c += 1) m[r][c] -= f * m[col][c]
    }
  }
  return m.map((row) => row.slice(n))
}

/** 加权均值。 */
function weightedMean(v: number[], w: number[]): number {
  let sw = 0
  let sv = 0
  for (let i = 0; i < v.length; i += 1) {
    sw += w[i]
    sv += w[i] * v[i]
  }
  return sw > 0 ? sv / sw : 0
}

/** 加权 r² = 1 - SSE/SST。 */
export function weightedR2(ys: number[], residuals: number[], ws: number[]): number {
  const yBar = weightedMean(ys, ws)
  let sse = 0
  let sst = 0
  for (let i = 0; i < ys.length; i += 1) {
    sse += ws[i] * residuals[i] * residuals[i]
    sst += ws[i] * (ys[i] - yBar) ** 2
  }
  if (sst <= 0) return 1
  return 1 - sse / sst
}

export interface ModelOk<T> {
  ok: true
  fit: T
}
export interface ModelErr {
  ok: false
  error: string
}
export type ModelOutcome<T> = ModelOk<T> | ModelErr

const err = <T>(error: string): ModelOutcome<T> => ({ ok: false, error })

/* ------------------------------- Linear ------------------------------- */

export interface LinearFit {
  kind: 'linear'
  slope: number
  intercept: number
  r2: number
  seSlope: number
  seIntercept: number
  ci95: { slope: [number, number]; intercept: [number, number] }
  /** 残差方差 s²（df = n-2）。 */
  sigma2: number
  df: number
  /** cov = s²·(XᵀWX)⁻¹（基 [1, x]），供预测 CI 带。 */
  cov: [[number, number], [number, number]]
}

export function fitLinear(xs: number[], ys: number[], ws?: number[]): ModelOutcome<LinearFit> {
  const n = xs.length
  if (n < 2) return err('Linear 至少需要 2 个点')
  const w = ws ?? xs.map(() => 1)
  let sw = 0
  let swx = 0
  let swy = 0
  let swxx = 0
  let swxy = 0
  for (let i = 0; i < n; i += 1) {
    const wi = w[i]
    sw += wi
    swx += wi * xs[i]
    swy += wi * ys[i]
    swxx += wi * xs[i] * xs[i]
    swxy += wi * xs[i] * ys[i]
  }
  const det = sw * swxx - swx * swx
  if (Math.abs(det) < 1e-14) return err('X 无方差，无法拟合 Linear')
  const slope = (sw * swxy - swx * swy) / det
  const intercept = (swy - slope * swx) / sw
  const residuals = ys.map((y, i) => y - (intercept + slope * xs[i]))
  const r2 = weightedR2(ys, residuals, w)
  let sse = 0
  for (let i = 0; i < n; i += 1) sse += w[i] * residuals[i] ** 2
  const df = n - 2
  const sigma2 = df > 0 ? sse / df : 0
  // (XᵀWX)⁻¹ = 1/det · [[swxx, -swx], [-swx, sw]]
  const cov: [[number, number], [number, number]] = [
    [(sigma2 * swxx) / det, (-sigma2 * swx) / det],
    [(-sigma2 * swx) / det, (sigma2 * sw) / det],
  ]
  const seIntercept = Math.sqrt(Math.max(cov[0][0], 0))
  const seSlope = Math.sqrt(Math.max(cov[1][1], 0))
  const t = tCrit95(df)
  return {
    ok: true,
    fit: {
      kind: 'linear',
      slope,
      intercept,
      r2,
      seSlope,
      seIntercept,
      ci95: {
        slope: [slope - t * seSlope, slope + t * seSlope],
        intercept: [intercept - t * seIntercept, intercept + t * seIntercept],
      },
      sigma2,
      df,
      cov,
    },
  }
}

/* ------------------------------- Quadratic ------------------------------- */

export interface QuadraticFit {
  kind: 'quadratic'
  /** y = a + b·x + c·x² */
  a: number
  b: number
  c: number
  r2: number
  ci95: { a: [number, number]; b: [number, number]; c: [number, number] }
  sigma2: number
  df: number
  /** cov = s²·(XᵀWX)⁻¹（基 [1, x, x²]），供预测 CI 带。 */
  cov: Mat
}

export function fitQuadratic(xs: number[], ys: number[], ws?: number[]): ModelOutcome<QuadraticFit> {
  const n = xs.length
  if (n < 3) return err('Quadratic 至少需要 3 个点')
  const w = ws ?? xs.map(() => 1)
  // 正规方程 (XᵀWX)β = XᵀWy，基 [1, x, x²]
  const xtx: Mat = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ]
  const xty = [0, 0, 0]
  for (let i = 0; i < n; i += 1) {
    const basis = [1, xs[i], xs[i] * xs[i]]
    for (let r = 0; r < 3; r += 1) {
      xty[r] += w[i] * basis[r] * ys[i]
      for (let c = 0; c < 3; c += 1) xtx[r][c] += w[i] * basis[r] * basis[c]
    }
  }
  const beta = solveLinearSystem(xtx, xty)
  if (!beta) return err('X 无方差，无法拟合 Quadratic')
  const [a, b, c] = beta
  const residuals = ys.map((y, i) => y - (a + b * xs[i] + c * xs[i] * xs[i]))
  const r2 = weightedR2(ys, residuals, w)
  let sse = 0
  for (let i = 0; i < n; i += 1) sse += w[i] * residuals[i] ** 2
  const df = n - 3
  const sigma2 = df > 0 ? sse / df : 0
  const inv = invertMatrix(xtx)
  const cov: Mat = inv
    ? inv.map((row) => row.map((v) => v * sigma2))
    : [
        [0, 0, 0],
        [0, 0, 0],
        [0, 0, 0],
      ]
  const t = tCrit95(df)
  const ci = (est: number, idx: number): [number, number] => {
    const se = Math.sqrt(Math.max(cov[idx][idx], 0))
    return [est - t * se, est + t * se]
  }
  return {
    ok: true,
    fit: { kind: 'quadratic', a, b, c, r2, ci95: { a: ci(a, 0), b: ci(b, 1), c: ci(c, 2) }, sigma2, df, cov },
  }
}

/* ------------------------------- 4PL ------------------------------- */

export interface FourPLFit {
  kind: '4pl'
  min: number
  max: number
  hillSlope: number
  /** t 空间的拐点（c）；报告层负责 back-transform。 */
  inflectionT: number
  ci95: { min: [number, number]; max: [number, number]; hillSlope: [number, number]; inflectionT: [number, number] }
  r2: number
  converged: boolean
  iterations: number
}

export interface FourPLConstraints {
  min?: number
  max?: number
}

/** t 空间 4PL：f(t) = min + (max-min)/(1+exp(-hill·(t-c))) */
function fourPL(t: number, p: number[]): number {
  const [mn, mx, c, hill] = p
  const z = -hill * (t - c)
  if (z > 700) return mn
  if (z < -700) return mx
  return mn + (mx - mn) / (1 + Math.exp(z))
}

/**
 * Levenberg-Marquardt 求解 4PL（数值 Jacobian，中央差分）。
 * - 初始启发式：min/max 取数据极值、c 取 t 中位数、hill 按增减性取 ±1
 * - constraints 固定 min/max（从优化变量中剔除）
 * - 不崩溃策略：λ 自适应放大至 1e11 仍失败 → converged=false 返回当前最优
 */
export function fit4PL(ts: number[], ys: number[], ws?: number[], constraints?: FourPLConstraints, maxIter = 200): ModelOutcome<FourPLFit> {
  const n = ts.length
  const fixedMin = constraints?.min !== undefined && Number.isFinite(constraints.min)
  const fixedMax = constraints?.max !== undefined && Number.isFinite(constraints.max)
  const k = 4 - (fixedMin ? 1 : 0) - (fixedMax ? 1 : 0)
  if (n < 4) return err('4PL 至少需要 4 个点')
  if (n < k) return err('4PL 数据点不足以估计自由参数')
  const w = ws ?? ts.map(() => 1)

  let yMin = Infinity
  let yMax = -Infinity
  for (const y of ys) {
    if (y < yMin) yMin = y
    if (y > yMax) yMax = y
  }
  if (!(yMax > yMin)) return err('Y 无方差，无法拟合 4PL')

  const order = ts.map((_, i) => i).sort((a, b) => ts[a] - ts[b])
  const sortedT = order.map((i) => ts[i])
  const sortedY = order.map((i) => ys[i])
  const medT = sortedT[Math.floor(sortedT.length / 2)]
  // hill 符号启发：低 t 处均值 > 高 t 处均值 → 递减曲线 → hill < 0
  const q = Math.max(1, Math.floor(n / 4))
  const lowMean = sortedY.slice(0, q).reduce((s, v) => s + v, 0) / q
  const highMean = sortedY.slice(n - q).reduce((s, v) => s + v, 0) / q
  const hill0 = lowMean > highMean ? -1 : 1

  // 全参数向量 p = [min, max, c, hill]；free 标记哪些参与迭代
  const p0 = [fixedMin ? constraints!.min! : yMin, fixedMax ? constraints!.max! : yMax, medT, hill0]
  const freeIdx: number[] = []
  if (!fixedMin) freeIdx.push(0)
  if (!fixedMax) freeIdx.push(1)
  freeIdx.push(2, 3)

  let p = [...p0]

  const sseOf = (pv: number[]): number => {
    let s = 0
    for (let i = 0; i < n; i += 1) {
      const r = ys[i] - fourPL(ts[i], pv)
      s += w[i] * r * r
    }
    return s
  }

  let sse = sseOf(p)
  let lambda = 1e-3
  let converged = false
  let iter = 0

  for (iter = 1; iter <= maxIter; iter += 1) {
    // 数值 Jacobian（仅自由参数列）+ 加权正规方程 A δ = g
    const a: Mat = Array.from({ length: k }, () => Array.from({ length: k }, () => 0))
    const g = Array.from({ length: k }, () => 0)
    const jac: number[][] = []
    for (let i = 0; i < n; i += 1) {
      const row: number[] = []
      for (const j of freeIdx) {
        const h = 1e-7 * (1 + Math.abs(p[j]))
        const pp = [...p]
        const pm = [...p]
        pp[j] += h
        pm[j] -= h
        row.push((fourPL(ts[i], pp) - fourPL(ts[i], pm)) / (2 * h))
      }
      jac.push(row)
    }
    for (let i = 0; i < n; i += 1) {
      const r = ys[i] - fourPL(ts[i], p)
      for (let c1 = 0; c1 < k; c1 += 1) {
        g[c1] += w[i] * jac[i][c1] * r
        for (let c2 = 0; c2 < k; c2 += 1) a[c1][c2] += w[i] * jac[i][c1] * jac[i][c2]
      }
    }
    const gradInf = Math.max(...g.map((v) => Math.abs(v)))
    if (gradInf < 1e-9) {
      converged = true
      break
    }

    // LM 步：尝试 (A + λ·diag(A)) δ = g，失败则放大 λ 重试
    let stepped = false
    for (let attempt = 0; attempt < 60; attempt += 1) {
      const damped: Mat = a.map((row, ri) => row.map((v, ci) => (ri === ci ? v + lambda * Math.max(v, 1e-12) : v)))
      const delta = solveLinearSystem(damped, g)
      if (!delta || delta.some((d) => !Number.isFinite(d))) {
        lambda *= 10
        if (lambda > 1e11) break
        continue
      }
      const cand = [...p]
      freeIdx.forEach((j, di) => {
        cand[j] = p[j] + delta[di]
      })
      const sseNew = sseOf(cand)
      if (Number.isFinite(sseNew) && sseNew < sse) {
        const rel = (sse - sseNew) / (1 + sse)
        p = cand
        sse = sseNew
        lambda = Math.max(lambda / 3, 1e-12)
        stepped = true
        if (rel < 1e-12) converged = true
        break
      }
      lambda *= 10
      if (lambda > 1e11) break
    }
    if (converged) break
    if (!stepped) break // λ 爆炸或无法下降 → 不收敛，保留当前最优
  }

  // 协方差与 CI95
  const residuals = ys.map((y, i) => y - fourPL(ts[i], p))
  const r2 = weightedR2(ys, residuals, w)
  const df = n - k
  const sigma2 = df > 0 ? sse / df : 0
  // 重建最终点的 A
  const a: Mat = Array.from({ length: k }, () => Array.from({ length: k }, () => 0))
  const jac: number[][] = []
  for (let i = 0; i < n; i += 1) {
    const row: number[] = []
    for (const j of freeIdx) {
      const h = 1e-7 * (1 + Math.abs(p[j]))
      const pp = [...p]
      const pm = [...p]
      pp[j] += h
      pm[j] -= h
      row.push((fourPL(ts[i], pp) - fourPL(ts[i], pm)) / (2 * h))
    }
    jac.push(row)
  }
  for (let i = 0; i < n; i += 1) {
    for (let c1 = 0; c1 < k; c1 += 1) {
      for (let c2 = 0; c2 < k; c2 += 1) a[c1][c2] += w[i] * jac[i][c1] * jac[i][c2]
    }
  }
  const inv = invertMatrix(a)
  const t = tCrit95(df)
  const ciFor = (paramIdx: number, est: number): [number, number] => {
    const fi = freeIdx.indexOf(paramIdx)
    if (fi < 0 || !inv) return [est, est] // 固定参数 CI 退化为点
    const se = Math.sqrt(Math.max(inv[fi][fi] * sigma2, 0))
    return [est - t * se, est + t * se]
  }

  return {
    ok: true,
    fit: {
      kind: '4pl',
      min: p[0],
      max: p[1],
      hillSlope: p[3],
      inflectionT: p[2],
      ci95: {
        min: ciFor(0, p[0]),
        max: ciFor(1, p[1]),
        inflectionT: ciFor(2, p[2]),
        hillSlope: ciFor(3, p[3]),
      },
      r2,
      converged,
      iterations: Math.min(iter, maxIter),
    },
  }
}

/** 4PL 预测（t 空间）。 */
export function predict4PL(fit: FourPLFit, t: number): number {
  return fourPL(t, [fit.min, fit.max, fit.inflectionT, fit.hillSlope])
}
