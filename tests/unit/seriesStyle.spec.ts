import { describe, expect, it } from 'vitest'
import {
  defaultChartTitle,
  listSeriesKeys,
  opacityAppliesTo,
  opacityHint,
  paletteColors,
  resolveSeriesColor,
} from '@/modules/chart/seriesStyle'
import type { ChartConfigure } from '@/shared/types/analysis'

describe('defaultChartTitle', () => {
  it('uses view or table name as default title', () => {
    expect(defaultChartTitle('Dose Response')).toBe('Dose Response')
    expect(defaultChartTitle('  My View  ')).toBe('My View')
  })

  it('falls back to empty when name missing', () => {
    expect(defaultChartTitle('')).toBe('')
    expect(defaultChartTitle('   ')).toBe('')
    expect(defaultChartTitle(undefined)).toBe('')
  })
})

describe('paletteColors', () => {
  it('returns light/dark/alternate palettes', () => {
    expect(paletteColors('light').length).toBeGreaterThanOrEqual(6)
    expect(paletteColors('dark')[0]).toMatch(/^#/)
    expect(paletteColors('alternate')).not.toEqual(paletteColors('light'))
  })
})

describe('listSeriesKeys', () => {
  const rows = [
    { dose: 1, response: 2, group: 'A' },
    { dose: 2, response: 3, group: 'B' },
    { dose: 3, response: 4, group: 'A' },
  ]

  it('lists unique series field values for bar/line/scatter', () => {
    const cfg: ChartConfigure = { xField: 'dose', yField: 'response', seriesField: 'group' }
    expect(listSeriesKeys('bar', rows, cfg)).toEqual(['A', 'B'])
    expect(listSeriesKeys('scatter', rows, cfg)).toEqual(['A', 'B'])
  })

  it('returns single value key when no series field', () => {
    const cfg: ChartConfigure = { xField: 'dose', yField: 'response' }
    expect(listSeriesKeys('line', rows, cfg)).toEqual(['value'])
  })

  it('lists pie categories as series keys', () => {
    const pieRows = [
      { cat: 'X', n: 1 },
      { cat: 'Y', n: 2 },
      { cat: 'X', n: 3 },
    ]
    expect(
      listSeriesKeys('pie', pieRows, { categoriesField: 'cat', measureField: 'n' }),
    ).toEqual(['X', 'Y'])
  })

  it('returns empty for table/heatmap without meaningful series override', () => {
    expect(listSeriesKeys('table', rows, {})).toEqual([])
    expect(listSeriesKeys('heatmap', rows, {})).toEqual([])
  })
})

describe('resolveSeriesColor', () => {
  it('prefers style override over palette slot', () => {
    const colors = paletteColors('light')
    expect(resolveSeriesColor({ A: '#ff0000' }, 'A', colors, 0)).toBe('#ff0000')
    expect(resolveSeriesColor({}, 'A', colors, 0)).toBe(colors[0])
    expect(resolveSeriesColor(undefined, 'B', colors, 1)).toBe(colors[1])
  })
})

describe('opacityAppliesTo / opacityHint', () => {
  it('applies to point/bar chart types', () => {
    expect(opacityAppliesTo('bar')).toBe(true)
    expect(opacityAppliesTo('scatter')).toBe(true)
    expect(opacityAppliesTo('box')).toBe(true)
    expect(opacityAppliesTo('pie')).toBe(true)
    expect(opacityAppliesTo('line')).toBe(true)
  })

  it('does not apply to heatmap/table', () => {
    expect(opacityAppliesTo('heatmap')).toBe(false)
    expect(opacityAppliesTo('table')).toBe(false)
  })

  it('explains applicability for UI hint', () => {
    expect(opacityHint('bar')).toMatch(/柱|点|透明/)
    expect(opacityHint('heatmap')).toMatch(/不适用|热力/)
  })
})
