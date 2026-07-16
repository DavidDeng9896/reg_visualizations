import { describe, expect, it } from 'vitest'
import { swapAxesConfigure, swapAxesStyle } from '@/modules/chart/swapAxes'
import type { ChartConfigure, ChartStyle } from '@/shared/types/analysis'

describe('swapAxesConfigure', () => {
  it('swaps X/Y field mapping, labels, and scales', () => {
    const configure: ChartConfigure = {
      xField: 'dose',
      yField: 'response',
      xLabel: 'Dose',
      yLabel: 'Response',
      xScale: 'log',
      yScale: 'linear',
    }
    const next = swapAxesConfigure(configure)
    expect(next.xField).toBe('response')
    expect(next.yField).toBe('dose')
    expect(next.xLabel).toBe('Response')
    expect(next.yLabel).toBe('Dose')
    expect(next.xScale).toBe('linear')
    expect(next.yScale).toBe('log')
  })

  it('leaves unrelated configure fields intact', () => {
    const configure: ChartConfigure = {
      xField: 'a',
      yField: 'b',
      seriesField: 'group',
      fitModel: 'linear',
      colorPalette: 'dark',
    }
    const next = swapAxesConfigure(configure)
    expect(next.seriesField).toBe('group')
    expect(next.fitModel).toBe('linear')
    expect(next.colorPalette).toBe('dark')
  })
})

describe('swapAxesStyle', () => {
  it('swaps axis range style settings', () => {
    const style: ChartStyle = {
      xRangeMode: 'manual',
      xMin: 1,
      xMax: 10,
      yRangeMode: 'auto',
      yMin: undefined,
      yMax: 100,
    }
    const next = swapAxesStyle(style)
    expect(next.xRangeMode).toBe('auto')
    expect(next.xMin).toBeUndefined()
    expect(next.xMax).toBe(100)
    expect(next.yRangeMode).toBe('manual')
    expect(next.yMin).toBe(1)
    expect(next.yMax).toBe(10)
  })
})
