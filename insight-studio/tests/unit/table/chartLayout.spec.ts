import { describe, expect, it } from 'vitest'
import {
  chartSplitDirection,
  chartSplitReverse,
  chartSplitStorageKey,
} from '../../../src/modules/table/chartLayout'

describe('图表位置切换不得重建存储键', () => {
  it('storage key 只随分析/视图变化，不含 top/right 等方位', () => {
    const key = chartSplitStorageKey('a1', 'v1')
    expect(key).toBe('chart-split:a1:v1')
    expect(key).not.toMatch(/top|bottom|left|right/)
  })

  it('上/下仅反转分栏，方向仍为 vertical', () => {
    expect(chartSplitDirection('top')).toBe('vertical')
    expect(chartSplitDirection('bottom')).toBe('vertical')
    expect(chartSplitReverse('top')).toBe(false)
    expect(chartSplitReverse('bottom')).toBe(true)
  })

  it('左/右为 horizontal，右侧反转', () => {
    expect(chartSplitDirection('left')).toBe('horizontal')
    expect(chartSplitDirection('right')).toBe('horizontal')
    expect(chartSplitReverse('left')).toBe(false)
    expect(chartSplitReverse('right')).toBe(true)
  })
})
