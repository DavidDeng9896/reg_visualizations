import { describe, expect, it } from 'vitest'
import {
  columnSelectLabel,
  fromNativeSelectValue,
  toNativeSelectValue,
} from '@/modules/chart/fieldSelect'

describe('fieldSelect', () => {
  it('formats column option labels with data type', () => {
    expect(columnSelectLabel({ title: 'Dose', dataType: 'number' })).toBe('Dose (number)')
    expect(columnSelectLabel({ title: 'Sample', dataType: 'string' })).toBe('Sample (string)')
  })

  it('maps empty native select value to undefined for clearable fields', () => {
    expect(fromNativeSelectValue('')).toBeUndefined()
    expect(fromNativeSelectValue('dose')).toBe('dose')
  })

  it('maps undefined field back to empty string for native select', () => {
    expect(toNativeSelectValue(undefined)).toBe('')
    expect(toNativeSelectValue('dose')).toBe('dose')
  })
})
