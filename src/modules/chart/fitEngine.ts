export type FitModel = 'ptp' | 'linear' | 'quadratic' | '4pl'

export interface FitResult {
  curve: [number, number][]
  variables: Record<string, number>
  output: Record<string, unknown>[]
}

function linReg(xs: number[], ys: number[]) {
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
  return { slope, intercept }
}

/** Simple 4PL via grid search on hill + inflection (demo-quality) */
function fit4pl(xs: number[], ys: number[]) {
  const min = Math.min(...ys)
  const max = Math.max(...ys)
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
  return { min, max, hill: best.hill, inflection: best.inf }
}

export function fitSeries(points: [number, number][], model: FitModel): FitResult {
  const sorted = [...points].sort((a, b) => a[0] - b[0])
  const xs = sorted.map((p) => p[0])
  const ys = sorted.map((p) => p[1])
  const xMin = xs[0]
  const xMax = xs[xs.length - 1]
  const curve: [number, number][] = []
  const output: Record<string, unknown>[] = []
  let variables: Record<string, number> = {}

  if (model === 'ptp') {
    for (const p of sorted) curve.push([p[0], p[1]])
    variables = {}
  } else if (model === 'linear') {
    const { slope, intercept } = linReg(xs, ys)
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
    // fit y = a x^2 + b x + c via normal equations (3x3)
    const sx = xs.reduce((a, b) => a + b, 0)
    const sx2 = xs.reduce((a, b) => a + b * b, 0)
    const sx3 = xs.reduce((a, b) => a + b ** 3, 0)
    const sx4 = xs.reduce((a, b) => a + b ** 4, 0)
    const sy = ys.reduce((a, b) => a + b, 0)
    const sxy = xs.reduce((a, b, i) => a + b * ys[i], 0)
    const sx2y = xs.reduce((a, b, i) => a + b * b * ys[i], 0)
    const n = xs.length
    // Solve using Cramer's-ish elimination simplified with matrix inverse for 3x3
    const A = [
      [sx4, sx3, sx2],
      [sx3, sx2, sx],
      [sx2, sx, n],
    ]
    const B = [sx2y, sxy, sy]
    const coeff = solve3(A, B)
    const [a, b, c] = coeff
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
    const p = fit4pl(xs, ys)
    variables = { min: p.min, max: p.max, hillSlope: p.hill, inflection: p.inflection }
    for (let i = 0; i <= 50; i++) {
      const x = xMin + ((xMax - xMin) * i) / 50
      const y = p.min + (p.max - p.min) / (1 + Math.pow(p.inflection / (x || 1e-9), p.hill))
      curve.push([x, y])
    }
  }

  return { curve, variables, output }
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
