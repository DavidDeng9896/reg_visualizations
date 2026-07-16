import { describe, expect, it } from 'vitest'
import {
  echartsValueAxisType,
  isLogScaleApplicable,
  logScaleDataWarning,
  supportsAxisScale,
} from '@/modules/chart/axisScale'

describe('supportsAxisScale', () => {
  it('allows scale on line/scatter/box and bar value axis', () => {
    expect(supportsAxisScale('line')).toBe(true)
    expect(supportsAxisScale('scatter')).toBe(true)
    expect(supportsAxisScale('box')).toBe(true)
    expect(supportsAxisScale('bar')).toBe(true)
  })

  it('disallows scale on pie/heatmap/table', () => {
    expect(supportsAxisScale('pie')).toBe(false)
    expect(supportsAxisScale('heatmap')).toBe(false)
    expect(supportsAxisScale('table')).toBe(false)
  })
})

describe('echartsValueAxisType', () => {
  it('maps linear → value and log → log', () => {
    expect(echartsValueAxisType('linear')).toBe('value')
    expect(echartsValueAxisType(undefined)).toBe('value')
    expect(echartsValueAxisType('log')).toBe('log')
  })
})

describe('isLogScaleApplicable / logScaleDataWarning', () => {
  it('rejects non-positive values for log', () => {
    expect(isLogScaleApplicable([1, 2, 3])).toBe(true)
    expect(isLogScaleApplicable([0.1, 10])).toBe(true)
    expect(isLogScaleApplicable([1, 0, 2])).toBe(false)
    expect(isLogScaleApplicable([-1, 2])).toBe(false)
    expect(isLogScaleApplicable([])).toBe(false)
  })

  it('returns Chinese warning when log is chosen but data has non-positive values', () => {
    expect(logScaleDataWarning('log', [1, 2])).toBeUndefined()
    expect(logScaleDataWarning('linear', [-1, 0])).toBeUndefined()
    expect(logScaleDataWarning('log', [1, 0, 2])).toMatch(/对数|正值/)
  })
})
