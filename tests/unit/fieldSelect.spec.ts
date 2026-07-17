import { describe, expect, it } from 'vitest'
import {
  CFG_MISS_ALERT_ID,
  cfgMissDescribedBy,
  columnSelectLabel,
  fromNativeSelectValue,
  selectedOptionValues,
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

  it('links required selects to cfg-miss alert via aria-describedby', () => {
    expect(CFG_MISS_ALERT_ID).toBe('chart-cfg-miss')
    expect(cfgMissDescribedBy(true)).toBe(CFG_MISS_ALERT_ID)
    expect(cfgMissDescribedBy(false)).toBeUndefined()
  })

  it('reads selected values from a native multi-select', () => {
    const select = document.createElement('select')
    select.multiple = true
    for (const [value, selected] of [
      ['a', true],
      ['b', false],
      ['c', true],
    ] as const) {
      const opt = document.createElement('option')
      opt.value = value
      opt.selected = selected
      select.appendChild(opt)
    }
    expect(selectedOptionValues(select)).toEqual(['a', 'c'])
  })
})
