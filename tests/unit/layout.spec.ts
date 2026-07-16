import { describe, expect, it } from 'vitest'
import {
  clampSplitRatio,
  DEFAULT_SPLIT_RATIO,
  effectiveChartPosition,
  MAX_SPLIT_RATIO,
  MIN_SPLIT_RATIO,
} from '@/modules/table/layout'

describe('workspace layout helpers', () => {
  it('clamps split ratio to safe bounds', () => {
    expect(clampSplitRatio(undefined)).toBe(DEFAULT_SPLIT_RATIO)
    expect(clampSplitRatio(0.01)).toBe(MIN_SPLIT_RATIO)
    expect(clampSplitRatio(0.99)).toBe(MAX_SPLIT_RATIO)
    expect(clampSplitRatio(0.55)).toBe(0.55)
  })

  it('degrades left/right to stacked on narrow viewports', () => {
    expect(effectiveChartPosition('left', 800)).toEqual({ position: 'top', degraded: true })
    expect(effectiveChartPosition('right', 800)).toEqual({ position: 'bottom', degraded: true })
    expect(effectiveChartPosition('bottom', 800)).toEqual({ position: 'bottom', degraded: false })
    expect(effectiveChartPosition('left', 1200)).toEqual({ position: 'left', degraded: false })
  })
})
