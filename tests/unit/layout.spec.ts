import { describe, expect, it } from 'vitest'
import {
  CHART_PANE_ID,
  chartSplitterAriaLabel,
  clampSplitRatio,
  DEFAULT_SPLIT_RATIO,
  effectiveChartPosition,
  isSplitterResetKey,
  MAX_SPLIT_RATIO,
  MIN_SPLIT_RATIO,
  resetSplitRatio,
  splitRatioLiveText,
  splitterAriaControls,
  TABLE_PANE_ID,
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

  it('exposes stable pane ids and live text for splitter a11y (Round 120)', () => {
    expect(CHART_PANE_ID).toBe('ws-chart-pane')
    expect(TABLE_PANE_ID).toBe('ws-table-pane')
    expect(splitterAriaControls()).toBe('ws-chart-pane ws-table-pane')
    expect(splitRatioLiveText(0.45)).toBe('图表区占比 45%')
    expect(splitRatioLiveText(0.01)).toBe('图表区占比 20%')
    expect(splitRatioLiveText(0.99)).toBe('图表区占比 80%')
  })

  it('resets split ratio to default for double-click UX (Round 122)', () => {
    expect(resetSplitRatio()).toBe(DEFAULT_SPLIT_RATIO)
    expect(resetSplitRatio()).toBe(0.45)
  })

  it('treats 0 as keyboard reset key for splitter default (Round 123)', () => {
    expect(isSplitterResetKey('0')).toBe(true)
    expect(isSplitterResetKey('Home')).toBe(false)
    expect(isSplitterResetKey('End')).toBe(false)
    expect(isSplitterResetKey('ArrowLeft')).toBe(false)
    expect(chartSplitterAriaLabel()).toContain('按 0 恢复默认')
  })
})

