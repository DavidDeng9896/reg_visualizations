import { describe, expect, it } from 'vitest'
import { equationOf, minPointsFor, runFit, type FitInputPoint } from '../../../src/modules/charts/fit/engine'
import type { RegressionConfig } from '../../../src/shared/types'

const pts = (xs: number[], ys: number[], extra: Partial<FitInputPoint> = {}): FitInputPoint[] =>
  xs.map((x, i) => ({ x, y: ys[i], rowId: `r${i}`, ...extra }))

const cfg = (over: Partial<RegressionConfig> = {}): RegressionConfig => ({ model: 'linear', ...over })

describe('minPointsFor', () => {
  it('linear≥2 / quadratic≥3 / 4pl≥4 / p2p≥2', () => {
    expect(minPointsFor('linear')).toBe(2)
    expect(minPointsFor('quadratic')).toBe(3)
    expect(minPointsFor('4pl')).toBe(4)
    expect(minPointsFor('point-to-point')).toBe(2)
  })
})

describe('runFit · linear', () => {
  it('完美线性：曲线 120 点、predict 正确、CI 带齐全', () => {
    const xs = [1, 2, 3, 4, 5]
    const fit = runFit(pts(xs, xs.map((x) => 2 * x + 1)), cfg())
    expect(fit.ok).toBe(true)
    expect(fit.curve).toHaveLength(120)
    expect(fit.predict(3)).toBeCloseTo(7, 8)
    expect(fit.r2).toBeCloseTo(1, 10)
    expect(fit.ciBand).toHaveLength(120)
    expect(fit.ciBand![60].lower).toBeLessThanOrEqual(fit.curve[60].y)
    expect(fit.ciBand![60].upper).toBeGreaterThanOrEqual(fit.curve[60].y)
    expect(fit.usedPoints).toBe(5)
  })

  it('点数不足 → ok:false + 警告 + 空曲线', () => {
    const fit = runFit(pts([1], [2]), cfg())
    expect(fit.ok).toBe(false)
    expect(fit.curve).toHaveLength(0)
    expect(fit.warnings.some((w) => w.includes('至少需要 2 个'))).toBe(true)
  })

  it('excludeFlagged=true 滤掉打标点（6F-1）', () => {
    const xs = [1, 2, 3, 4, 10]
    const ys = [2, 4, 6, 8, 100]
    const input = pts(xs, ys)
    input[4].flagged = true
    const withOutlier = runFit(input, cfg({ excludeFlagged: false }))
    const excluded = runFit(input, cfg({ excludeFlagged: true }))
    expect(excluded.usedPoints).toBe(4)
    expect(withOutlier.usedPoints).toBe(5)
    const slopeOf = (f: typeof excluded) => (f.params?.kind === 'linear' ? f.params.slope : Number.NaN)
    expect(Math.abs(slopeOf(excluded) - 2)).toBeLessThan(Math.abs(slopeOf(withOutlier) - 2))
  })

  it('非有限点被忽略', () => {
    const input = pts([1, 2, 3], [2, Number.NaN, 6])
    const fit = runFit(input, cfg())
    expect(fit.ok).toBe(true)
    expect(fit.usedPoints).toBe(2)
  })
})

describe('runFit · 权重', () => {
  it('weightsField 权重经 points 传入影响结果', () => {
    const xs = [1, 2, 3, 10]
    const ys = [2, 4, 6, 100]
    const flat = pts(xs, ys)
    const weighted = pts(xs, ys).map((p, i) => ({ ...p, weight: i === 3 ? 0.001 : 1 }))
    const a = runFit(flat, cfg())
    const b = runFit(weighted, cfg())
    const slopeOf = (f: typeof a) => (f.params?.kind === 'linear' ? f.params.slope : Number.NaN)
    expect(Math.abs(slopeOf(b) - 2)).toBeLessThan(Math.abs(slopeOf(a) - 2))
  })
})

describe('runFit · log 轴', () => {
  it('logX：在 log10 空间拟合 y = 3 + 2·log10(x)', () => {
    const xs = [1, 2, 5, 10, 20, 50, 100]
    const ys = xs.map((x) => 3 + 2 * Math.log10(x))
    const fit = runFit(pts(xs, ys), cfg(), { logX: true })
    expect(fit.ok).toBe(true)
    expect(fit.predict(100)).toBeCloseTo(7, 8)
    if (fit.params?.kind === 'linear') {
      expect(fit.params.slope).toBeCloseTo(2, 8)
      expect(fit.params.intercept).toBeCloseTo(3, 8)
    }
  })

  it('logX 非正 x 被过滤并警告', () => {
    const xs = [-5, 1, 10, 100]
    const ys = [0, 1, 2, 3]
    const fit = runFit(pts(xs, ys), cfg(), { logX: true })
    expect(fit.usedPoints).toBe(3)
    expect(fit.warnings.some((w) => w.includes('非正 X'))).toBe(true)
  })

  it('logY 非正 y 被过滤并警告', () => {
    const xs = [1, 2, 3, 4]
    const ys = [-1, 2, 4, 8]
    const fit = runFit(pts(xs, ys), cfg(), { logY: true })
    expect(fit.usedPoints).toBe(3)
    expect(fit.warnings.some((w) => w.includes('非正 Y'))).toBe(true)
  })

  it('logY 拟合指数关系 y = 10^(0.5x)', () => {
    const xs = [1, 2, 3, 4, 5]
    const ys = xs.map((x) => 10 ** (0.5 * x))
    const fit = runFit(pts(xs, ys), cfg(), { logY: true })
    expect(fit.ok).toBe(true)
    expect(fit.predict(6)).toBeCloseTo(1000, 0)
  })
})

describe('runFit · point-to-point', () => {
  it('按 x 排序连接，predict 分段线性插值', () => {
    const input = pts([3, 1, 2], [30, 10, 20])
    const fit = runFit(input, cfg({ model: 'point-to-point' }))
    expect(fit.ok).toBe(true)
    expect(fit.curve.map((p) => p.x)).toEqual([1, 2, 3])
    expect(fit.predict(1.5)).toBeCloseTo(15, 8)
    expect(fit.r2).toBeNull()
  })
})

describe('runFit · quadratic', () => {
  it('还原系数 + CI 带', () => {
    const xs = Array.from({ length: 10 }, (_, i) => i)
    const ys = xs.map((x) => 1 + 2 * x + 0.5 * x * x)
    const fit = runFit(pts(xs, ys), cfg({ model: 'quadratic' }))
    expect(fit.ok).toBe(true)
    if (fit.params?.kind === 'quadratic') {
      expect(fit.params.a).toBeCloseTo(1, 8)
      expect(fit.params.b).toBeCloseTo(2, 8)
      expect(fit.params.c).toBeCloseTo(0.5, 8)
    }
    expect(fit.ciBand).toHaveLength(120)
  })
})

describe('runFit · 4PL', () => {
  const xs = [0.1, 0.3, 0.7, 1, 2, 3, 4, 5, 6, 8, 10, 15, 20, 30, 50, 80]
  const gen = (min: number, max: number, hill: number, c: number) =>
    xs.map((x, i) => min + (max - min) / (1 + Math.exp(-hill * (Math.log(x) - Math.log(c)))) + Math.sin(i * 12.9898) * 0.3)

  it('线性轴拟合：inflection 以原始单位报告', () => {
    const fit = runFit(pts(xs, gen(0, 100, 1.5, 5)), cfg({ model: '4pl' }))
    expect(fit.ok).toBe(true)
    expect(fit.converged).toBe(true)
    if (fit.params?.kind === '4pl') {
      expect(Math.abs(fit.params.inflectionPoint - 5) / 5).toBeLessThan(0.1)
      expect(Math.abs(fit.params.max - 100)).toBeLessThan(10)
      expect(fit.params.ci95.min[0]).toBeLessThanOrEqual(fit.params.ci95.min[1])
    }
    expect(fit.curve).toHaveLength(120)
    expect(fit.r2!).toBeGreaterThan(0.95)
  })

  it('logX 轴拟合：inflection 同样以原始单位报告', () => {
    const fit = runFit(pts(xs, gen(0, 100, 1.5, 5)), cfg({ model: '4pl' }), { logX: true })
    expect(fit.ok).toBe(true)
    if (fit.params?.kind === '4pl') {
      expect(Math.abs(fit.params.inflectionPoint - 5) / 5).toBeLessThan(0.1)
    }
  })

  it('非正 x 对 4PL 必过滤', () => {
    const xs2 = [0, ...xs]
    const ys2 = [50, ...gen(0, 100, 1.5, 5)]
    const fit = runFit(pts(xs2, ys2), cfg({ model: '4pl' }))
    expect(fit.usedPoints).toBe(xs.length)
    expect(fit.warnings.some((w) => w.includes('非正 X'))).toBe(true)
  })

  it('constraints 固定 min/max 生效', () => {
    const fit = runFit(pts(xs, gen(0, 100, 1.5, 5)), cfg({ model: '4pl', constraints: { min: 0, max: 100 } }))
    expect(fit.ok).toBe(true)
    if (fit.params?.kind === '4pl') {
      expect(fit.params.min).toBe(0)
      expect(fit.params.max).toBe(100)
    }
  })

  it('点数不足 → ok:false + 警告', () => {
    const fit = runFit(pts([1, 2, 3], [1, 2, 3]), cfg({ model: '4pl' }))
    expect(fit.ok).toBe(false)
    expect(fit.warnings.some((w) => w.includes('至少需要 4 个'))).toBe(true)
  })
})

describe('equationOf', () => {
  it('各模型方程字符串', () => {
    const lin = runFit(pts([1, 2, 3], [3, 5, 7]), cfg())
    expect(equationOf(lin)).toContain('y =')
    expect(equationOf(lin)).toContain('2')
    const p2p = runFit(pts([1, 2], [1, 2]), cfg({ model: 'point-to-point' }))
    expect(equationOf(p2p)).toBe('Point-to-Point')
  })
})
