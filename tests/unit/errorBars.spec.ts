import { describe, expect, it } from 'vitest'
import {
  errorBarsAppliesTo,
  errorBarsAvailableForAggregation,
  errorBarsHint,
} from '@/modules/chart/errorBars'

describe('errorBarsAppliesTo', () => {
  it('allows bar / scatter / box only', () => {
    expect(errorBarsAppliesTo('bar')).toBe(true)
    expect(errorBarsAppliesTo('scatter')).toBe(true)
    expect(errorBarsAppliesTo('box')).toBe(true)
    expect(errorBarsAppliesTo('line')).toBe(false)
    expect(errorBarsAppliesTo('pie')).toBe(false)
    expect(errorBarsAppliesTo('heatmap')).toBe(false)
    expect(errorBarsAppliesTo('table')).toBe(false)
  })
})

describe('errorBarsAvailableForAggregation', () => {
  it('requires mean aggregation', () => {
    expect(errorBarsAvailableForAggregation('mean')).toBe(true)
    expect(errorBarsAvailableForAggregation(undefined)).toBe(true)
    expect(errorBarsAvailableForAggregation('sum')).toBe(false)
    expect(errorBarsAvailableForAggregation('count')).toBe(false)
  })
})

describe('errorBarsHint', () => {
  it('explains line exclusion and mean requirement', () => {
    expect(errorBarsHint('line')).toMatch(/Line|不提供/)
    expect(errorBarsHint('bar', 'sum')).toMatch(/Mean/)
    expect(errorBarsHint('bar', 'mean')).toMatch(/SD|SEM|Mean/)
    expect(errorBarsHint('pie')).toMatch(/不适用|饼/)
  })
})
