import { describe, expect, it } from 'vitest'
import {
  clampNumber,
  formatOptionalNumber,
  numberOutOfRangeStatus,
  opacityLiveStatus,
  parseClampedOptionalNumber,
  parseOpacity,
  parseOptionalNumber,
} from '@/modules/chart/nativeNumber'

describe('nativeNumber', () => {
  it('formats optional numbers for native inputs', () => {
    expect(formatOptionalNumber(undefined)).toBe('')
    expect(formatOptionalNumber(null)).toBe('')
    expect(formatOptionalNumber(Number.NaN)).toBe('')
    expect(formatOptionalNumber(0)).toBe('0')
    expect(formatOptionalNumber(12.5)).toBe('12.5')
  })

  it('parses optional numbers from raw strings', () => {
    expect(parseOptionalNumber('')).toBeUndefined()
    expect(parseOptionalNumber('  ')).toBeUndefined()
    expect(parseOptionalNumber('abc')).toBeUndefined()
    expect(parseOptionalNumber('42')).toBe(42)
    expect(parseOptionalNumber('-3.5')).toBe(-3.5)
  })

  it('clamps and parses bounded optional numbers', () => {
    expect(clampNumber(5, 0, 10)).toBe(5)
    expect(clampNumber(-1, 0, 10)).toBe(0)
    expect(clampNumber(99, 0, 10)).toBe(10)
    expect(parseClampedOptionalNumber('', 120, 4000)).toBeUndefined()
    expect(parseClampedOptionalNumber('80', 120, 4000)).toBe(120)
    expect(parseClampedOptionalNumber('5000', 120, 4000)).toBe(4000)
    expect(parseClampedOptionalNumber('800', 120, 4000)).toBe(800)
  })

  it('parses opacity and announces live percent', () => {
    expect(parseOpacity('0.5')).toBe(0.5)
    expect(parseOpacity('0')).toBe(0.1)
    expect(parseOpacity('2')).toBe(1)
    expect(parseOpacity('x', 0.1, 1)).toBe(0.1)
    expect(opacityLiveStatus(0.85)).toBe('透明度 85%')
    expect(opacityLiveStatus(0.1)).toBe('透明度 10%')
    expect(opacityLiveStatus(1)).toBe('透明度 100%')
  })

  it('announces out-of-range numeric fields', () => {
    expect(numberOutOfRangeStatus('宽度', undefined, 120, 4000)).toBe('')
    expect(numberOutOfRangeStatus('宽度', 800, 120, 4000)).toBe('')
    expect(numberOutOfRangeStatus('宽度', 50, 120, 4000)).toContain('超出范围')
    expect(numberOutOfRangeStatus('高度', 5000, 120, 4000)).toContain('120–4000')
  })
})
