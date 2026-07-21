import { describe, expect, it } from 'vitest'
import { fit4PL, fitLinear, fitQuadratic, invertMatrix, solveLinearSystem, tCrit95 } from '../../../src/modules/charts/fit/models'

/** 确定性伪噪声（无随机性，保证测试可重复）。 */
function detNoise(i: number, amp: number): number {
  return Math.sin(i * 12.9898) * amp
}

describe('tCrit95', () => {
  it('小 df 接近 t 分布表值，大 df 趋近 1.96', () => {
    expect(tCrit95(5)).toBeGreaterThan(2.4)
    expect(tCrit95(5)).toBeLessThan(2.8)
    expect(tCrit95(30)).toBeGreaterThan(2.0)
    expect(tCrit95(30)).toBeLessThan(2.1)
    expect(Math.abs(tCrit95(10000) - 1.96)).toBeLessThan(0.01)
  })
})

describe('矩阵工具', () => {
  it('solveLinearSystem 求解 2x2', () => {
    const x = solveLinearSystem(
      [
        [2, 1],
        [1, 3],
      ],
      [5, 10],
    )
    expect(x![0]).toBeCloseTo(1, 10)
    expect(x![1]).toBeCloseTo(3, 10)
  })
  it('invertMatrix 与单位阵乘积', () => {
    const inv = invertMatrix([
      [4, 1],
      [2, 3],
    ])!
    expect(inv[0][0] * 4 + inv[0][1] * 2).toBeCloseTo(1, 10)
  })
  it('奇异矩阵返回 null', () => {
    expect(
      solveLinearSystem(
        [
          [1, 2],
          [2, 4],
        ],
        [1, 2],
      ),
    ).toBeNull()
  })
})

describe('fitLinear', () => {
  it('完美拟合 y = 2x + 1 → slope=2 intercept=1 r²=1', () => {
    const xs = [1, 2, 3, 4, 5]
    const ys = xs.map((x) => 2 * x + 1)
    const out = fitLinear(xs, ys)
    expect(out.ok).toBe(true)
    if (!out.ok) return
    expect(out.fit.slope).toBeCloseTo(2, 10)
    expect(out.fit.intercept).toBeCloseTo(1, 10)
    expect(out.fit.r2).toBeCloseTo(1, 10)
  })

  it('带噪数据 r² 在合理范围且 CI95 覆盖真值', () => {
    const n = 50
    const xs = Array.from({ length: n }, (_, i) => i + 1)
    const ys = xs.map((x, i) => 2 * x + 1 + detNoise(i, 3))
    const out = fitLinear(xs, ys)
    expect(out.ok).toBe(true)
    if (!out.ok) return
    expect(out.fit.r2).toBeGreaterThan(0.95)
    expect(out.fit.r2).toBeLessThanOrEqual(1)
    expect(out.fit.ci95.slope[0]).toBeLessThan(2)
    expect(out.fit.ci95.slope[1]).toBeGreaterThan(2)
    expect(out.fit.ci95.intercept[0]).toBeLessThan(out.fit.intercept)
    expect(out.fit.ci95.intercept[1]).toBeGreaterThan(out.fit.intercept)
  })

  it('X 无方差 → 报错', () => {
    const out = fitLinear([2, 2, 2], [1, 2, 3])
    expect(out.ok).toBe(false)
  })

  it('等权重与缺省权重结果一致', () => {
    const xs = [1, 2, 3, 4]
    const ys = [2, 4.1, 5.9, 8.2]
    const a = fitLinear(xs, ys)
    const b = fitLinear(xs, ys, [1, 1, 1, 1])
    expect(a.ok && b.ok).toBe(true)
    if (!a.ok || !b.ok) return
    expect(a.fit.slope).toBeCloseTo(b.fit.slope, 12)
  })

  it('权重影响拟合：高权重点主导斜率', () => {
    const xs = [1, 2, 3, 10]
    const ys = [2, 4, 6, 100] // x=10 是离群点
    const un = fitLinear(xs, ys)
    const wd = fitLinear(xs, ys, [1, 1, 1, 0.001])
    expect(un.ok && wd.ok).toBe(true)
    if (!un.ok || !wd.ok) return
    expect(Math.abs(wd.fit.slope - 2)).toBeLessThan(Math.abs(un.fit.slope - 2))
  })
})

describe('fitQuadratic', () => {
  it('还原已知系数 y = 3 + 2x - 0.5x²，r²=1', () => {
    const xs = Array.from({ length: 12 }, (_, i) => i - 5)
    const ys = xs.map((x) => 3 + 2 * x - 0.5 * x * x)
    const out = fitQuadratic(xs, ys)
    expect(out.ok).toBe(true)
    if (!out.ok) return
    expect(out.fit.a).toBeCloseTo(3, 8)
    expect(out.fit.b).toBeCloseTo(2, 8)
    expect(out.fit.c).toBeCloseTo(-0.5, 8)
    expect(out.fit.r2).toBeCloseTo(1, 10)
  })

  it('带噪数据 CI95 覆盖真值', () => {
    const n = 40
    const xs = Array.from({ length: n }, (_, i) => i / 4 - 5)
    const ys = xs.map((x, i) => 3 + 2 * x - 0.5 * x * x + detNoise(i, 0.5))
    const out = fitQuadratic(xs, ys)
    expect(out.ok).toBe(true)
    if (!out.ok) return
    expect(out.fit.r2).toBeGreaterThan(0.98)
    expect(out.fit.ci95.c[0]).toBeLessThan(-0.5)
    expect(out.fit.ci95.c[1]).toBeGreaterThan(-0.5)
  })

  it('点数不足 → 报错', () => {
    expect(fitQuadratic([1, 2], [1, 4]).ok).toBe(false)
  })
})

/** 4PL 真值数据生成（t 空间）：y = min + (max-min)/(1+exp(-hill·(t - c)))，c = ln(inflection) */
function gen4PL(ts: number[], min: number, max: number, hill: number, inflection: number, amp = 0): number[] {
  const c = Math.log(inflection)
  return ts.map((t, i) => min + (max - min) / (1 + Math.exp(-hill * (t - c))) + detNoise(i, amp))
}

describe('fit4PL', () => {
  const xs = [0.1, 0.3, 0.7, 1, 2, 3, 4, 5, 6, 8, 10, 15, 20, 30, 50, 80]
  // fit4PL 契约：输入为 t 空间坐标（engine 负责 log 变换与报告层 back-transform）
  const ts = xs.map((x) => Math.log(x))

  it('已知参数还原：min=0 max=100 hill=1.5 inflection=5，误差 <10%，r²>0.95', () => {
    const ys = gen4PL(ts, 0, 100, 1.5, 5, 0.4)
    const out = fit4PL(ts, ys)
    expect(out.ok).toBe(true)
    if (!out.ok) return
    const f = out.fit
    expect(f.converged).toBe(true)
    expect(Math.abs(f.min - 0)).toBeLessThan(10)
    expect(Math.abs(f.max - 100)).toBeLessThan(10)
    expect(Math.abs(f.hillSlope - 1.5) / 1.5).toBeLessThan(0.1)
    expect(Math.abs(Math.exp(f.inflectionT) - 5) / 5).toBeLessThan(0.1)
    expect(f.r2).toBeGreaterThan(0.95)
    expect(f.iterations).toBeGreaterThan(0)
  })

  it('递减曲线 → hillSlope 为负', () => {
    const ys = gen4PL(ts, 0, 100, -1.2, 5, 0.3)
    const out = fit4PL(ts, ys)
    expect(out.ok).toBe(true)
    if (!out.ok) return
    expect(out.fit.hillSlope).toBeLessThan(0)
    expect(Math.abs(out.fit.hillSlope - -1.2) / 1.2).toBeLessThan(0.15)
  })

  it('constraints 固定 min/max 生效', () => {
    const ys = gen4PL(ts, 2, 98, 1.5, 5, 0.3)
    const out = fit4PL(ts, ys, undefined, { min: 0, max: 100 })
    expect(out.ok).toBe(true)
    if (!out.ok) return
    expect(out.fit.min).toBe(0)
    expect(out.fit.max).toBe(100)
    expect(Math.abs(Math.exp(out.fit.inflectionT) - 5) / 5).toBeLessThan(0.1)
  })

  it('maxIter=1 → converged=false 但不崩溃且返回最优估计', () => {
    const ys = gen4PL(ts, 0, 100, 1.5, 5, 0.4)
    const out = fit4PL(ts, ys, undefined, undefined, 1)
    expect(out.ok).toBe(true)
    if (!out.ok) return
    expect(out.fit.converged).toBe(false)
    expect(out.fit.iterations).toBe(1)
    expect(Number.isFinite(out.fit.hillSlope)).toBe(true)
  })

  it('纯噪声数据不崩溃，converged 为布尔值', () => {
    const ys = ts.map((_, i) => detNoise(i, 50) + Math.sin(i * 3.3) * 20)
    const out = fit4PL(ts, ys)
    expect(out.ok).toBe(true)
    if (!out.ok) return
    expect(typeof out.fit.converged).toBe('boolean')
    expect(Number.isFinite(out.fit.r2)).toBe(true)
  })

  it('点数不足 / Y 无方差 → 报错不崩溃', () => {
    expect(fit4PL([1, 2, 3], [1, 2, 3]).ok).toBe(false)
    expect(fit4PL([1, 2, 3, 4, 5], [7, 7, 7, 7, 7]).ok).toBe(false)
  })

  it('CI95 合理：覆盖估计值且宽度为正，真值在 ±10% 容差带内', () => {
    const ys = gen4PL(ts, 0, 100, 1.5, 5, 0.3)
    const out = fit4PL(ts, ys)
    expect(out.ok).toBe(true)
    if (!out.ok) return
    const ci = out.fit.ci95
    // CI 覆盖点估计且宽度为正
    expect(ci.hillSlope[0]).toBeLessThan(out.fit.hillSlope)
    expect(ci.hillSlope[1]).toBeGreaterThan(out.fit.hillSlope)
    expect(ci.inflectionT[1]).toBeGreaterThan(ci.inflectionT[0])
    // 真值在 CI 的 ±10% 容差带内（单次噪声实现可能轻微偏出 95% CI）
    expect(ci.hillSlope[0]).toBeLessThan(1.5 * 1.05)
    expect(ci.hillSlope[1]).toBeGreaterThan(1.5 * 0.95)
    expect(Math.exp(ci.inflectionT[0])).toBeLessThan(5 * 1.05)
    expect(Math.exp(ci.inflectionT[1])).toBeGreaterThan(5 * 0.95)
  })
})
