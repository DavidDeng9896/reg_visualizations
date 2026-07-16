import { describe, expect, it } from 'vitest'
import { buildLegendOption, buildGridOption } from '@/modules/chart/chartLayout'
import type { ChartStyle } from '@/shared/types/analysis'

describe('buildLegendOption', () => {
  it('hides legend when legendShow is false', () => {
    expect(buildLegendOption({ legendShow: false })).toEqual({ show: false })
  })

  it('maps position and custom label', () => {
    const style: ChartStyle = {
      legendShow: true,
      legendPosition: 'bottom',
      legendLabel: 'Series',
    }
    const legend = buildLegendOption(style)
    expect(legend.show).toBe(true)
    expect(legend.orient).toBe('horizontal')
    expect(legend.bottom).toBe(0)
    expect(legend.formatter).toBeTypeOf('function')
    expect((legend.formatter as (n: string) => string)('A')).toBe('Series · A')
  })

  it('defaults to right vertical when position omitted', () => {
    const legend = buildLegendOption({})
    expect(legend.show).toBe(true)
    expect(legend.orient).toBe('vertical')
    expect(legend.right).toBe(10)
  })
})

describe('buildGridOption', () => {
  it('applies four margins with defaults', () => {
    expect(buildGridOption({})).toEqual({
      top: 60,
      right: 40,
      bottom: 50,
      left: 60,
    })
  })

  it('overrides each margin and supports right-heavy default', () => {
    expect(
      buildGridOption(
        { marginTop: 80, marginRight: 12, marginBottom: 90, marginLeft: 70 },
        { right: 80 },
      ),
    ).toEqual({ top: 80, right: 12, bottom: 90, left: 70 })
  })
})
