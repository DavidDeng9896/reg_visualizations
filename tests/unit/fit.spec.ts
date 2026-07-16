import { describe, expect, it } from 'vitest'
import { fitSeries } from '@/modules/chart/fitEngine'

describe('fitEngine', () => {
  it('fits linear y = 2x + 1', () => {
    const pts: [number, number][] = [
      [0, 1],
      [1, 3],
      [2, 5],
      [3, 7],
    ]
    const r = fitSeries(pts, 'linear')
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
    expect(r.curve).toEqual(pts)
  })
})
