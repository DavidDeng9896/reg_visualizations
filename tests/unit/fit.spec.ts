import { describe, expect, it } from 'vitest'
import { fitSeries, MIN_FIT_POINTS } from '@/modules/chart/fitEngine'

describe('fitEngine', () => {
  it('fits linear y = 2x + 1', () => {
    const pts: [number, number][] = [
      [0, 1],
      [1, 3],
      [2, 5],
      [3, 7],
    ]
    const r = fitSeries(pts, 'linear')
    expect(r.ok).toBe(true)
    expect(r.variables.slope).toBeCloseTo(2, 5)
    expect(r.variables.intercept).toBeCloseTo(1, 5)
    expect(r.curve.length).toBeGreaterThan(10)
  })

  it('point-to-point keeps points', () => {
    const pts: [number, number][] = [
      [1, 2],
      [3, 4],
    ]
    const r = fitSeries(pts, 'ptp')
    expect(r.ok).toBe(true)
    expect(r.curve).toEqual(pts)
  })

  it('rejects empty points', () => {
    const r = fitSeries([], '4pl')
    expect(r.ok).toBe(false)
    expect(r.warning).toMatch(/没有可用/)
  })

  it('rejects 4PL with fewer than 4 points', () => {
    const pts: [number, number][] = [
      [1, 10],
      [2, 20],
      [3, 30],
    ]
    const r = fitSeries(pts, '4pl')
    expect(r.ok).toBe(false)
    expect(r.warning).toContain(String(MIN_FIT_POINTS['4pl']))
    expect(r.curve).toEqual([])
  })

  it('rejects 4PL when Y is constant', () => {
    const pts: [number, number][] = [
      [1, 5],
      [2, 5],
      [3, 5],
      [4, 5],
    ]
    const r = fitSeries(pts, '4pl')
    expect(r.ok).toBe(false)
    expect(r.warning).toMatch(/Y 值/)
  })

  it('rejects 4PL when X is constant', () => {
    const pts: [number, number][] = [
      [2, 1],
      [2, 3],
      [2, 5],
      [2, 7],
    ]
    const r = fitSeries(pts, '4pl')
    expect(r.ok).toBe(false)
    expect(r.warning).toMatch(/X 值/)
  })

  it('fits 4PL on sigmoid-like data', () => {
    const pts: [number, number][] = [
      [0.1, 1],
      [1, 2],
      [10, 8],
      [100, 9],
      [1000, 9.5],
    ]
    const r = fitSeries(pts, '4pl')
    expect(r.ok).toBe(true)
    expect(r.variables.min).toBeDefined()
    expect(r.variables.max).toBeDefined()
    expect(r.curve.length).toBeGreaterThan(10)
  })

  it('rejects linear when X has no span', () => {
    const pts: [number, number][] = [
      [3, 1],
      [3, 5],
    ]
    const r = fitSeries(pts, 'linear')
    expect(r.ok).toBe(false)
    expect(r.warning).toMatch(/X/)
  })

  it('applies 4PL min/max asymptote constraints', () => {
    const pts: [number, number][] = [
      [0.1, 1],
      [1, 2],
      [10, 8],
      [100, 9],
      [1000, 9.5],
    ]
    const r = fitSeries(pts, '4pl', { min: 0, max: 10 })
    expect(r.ok).toBe(true)
    expect(r.variables.min).toBe(0)
    expect(r.variables.max).toBe(10)
  })

  it('rejects 4PL when constrained min >= max', () => {
    const pts: [number, number][] = [
      [0.1, 1],
      [1, 2],
      [10, 8],
      [100, 9],
    ]
    const r = fitSeries(pts, '4pl', { min: 5, max: 5 })
    expect(r.ok).toBe(false)
    expect(r.warning).toMatch(/min.*max|渐近/i)
  })

  it('fits linear through origin', () => {
    const pts: [number, number][] = [
      [1, 2],
      [2, 4],
      [3, 6.1],
    ]
    const free = fitSeries(pts, 'linear')
    const forced = fitSeries(pts, 'linear', { throughOrigin: true })
    expect(forced.ok).toBe(true)
    expect(forced.variables.intercept).toBe(0)
    expect(forced.variables.slope).toBeCloseTo(28.3 / 14, 5)
    expect(free.variables.intercept).not.toBe(0)
  })

  it('fits quadratic through origin with c = 0', () => {
    const pts: [number, number][] = [
      [1, 3],
      [2, 10],
      [3, 21],
    ]
    const r = fitSeries(pts, 'quadratic', { throughOrigin: true })
    expect(r.ok).toBe(true)
    expect(r.variables.c).toBe(0)
    expect(r.variables.a).toBeCloseTo(2, 5)
    expect(r.variables.b).toBeCloseTo(1, 5)
  })
})
