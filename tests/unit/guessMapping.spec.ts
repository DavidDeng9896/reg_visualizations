import { describe, expect, it } from 'vitest'
import { guessConfigure, missingRequiredFields } from '@/modules/chart/guessMapping'
import type { TableColumn } from '@/shared/types/analysis'

const columns: TableColumn[] = [
  { field: 'compound', title: 'compound', dataType: 'string' },
  { field: 'dose', title: 'dose', dataType: 'number' },
  { field: 'response', title: 'response', dataType: 'number' },
  { field: 'plate', title: 'plate', dataType: 'string' },
]

describe('guessConfigure', () => {
  it('maps bar x=category y=number', () => {
    const cfg = guessConfigure('bar', columns)
    expect(cfg.xField).toBe('compound')
    expect(cfg.yField).toBe('dose')
    expect(missingRequiredFields('bar', cfg)).toEqual([])
  })

  it('maps scatter two numeric axes', () => {
    const cfg = guessConfigure('scatter', columns)
    expect(cfg.xField).toBe('dose')
    expect(cfg.yField).toBe('response')
    expect(cfg.seriesField).toBe('compound')
  })

  it('maps pie categories', () => {
    const cfg = guessConfigure('pie', columns)
    expect(cfg.categoriesField).toBe('compound')
  })

  it('maps heatmap row/col/value', () => {
    const cfg = guessConfigure('heatmap', columns)
    expect(cfg.heatmapRowField).toBeTruthy()
    expect(cfg.heatmapColField).toBeTruthy()
    expect(cfg.heatmapValueField).toBeTruthy()
    expect(missingRequiredFields('heatmap', cfg)).toEqual([])
  })

  it('remaps categorical X to numeric when switching bar → line', () => {
    const bar = guessConfigure('bar', columns)
    expect(bar.xField).toBe('compound')
    const line = guessConfigure('line', columns, bar)
    expect(line.xField).toBe('dose')
    expect(line.yField).toBe('response')
    expect(missingRequiredFields('line', line)).toEqual([])
  })

  it('keeps pie measure from previous y when switching bar → pie', () => {
    const bar = guessConfigure('bar', columns)
    const pie = guessConfigure('pie', columns, bar)
    expect(pie.categoriesField).toBe('compound')
    expect(pie.measureField).toBe('dose')
  })
})
