import { describe, expect, it } from 'vitest'
import {
  CFG_MISS_ALERT_ID,
  cfgMissDescribedBy,
  columnSelectLabel,
  focusCfgMissAfterBlockedSave,
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

  it('focuses cfg-miss alert after blocked Save (fallback to aria-invalid)', () => {
    const root = document.createElement('div')
    const alert = document.createElement('p')
    alert.id = CFG_MISS_ALERT_ID
    root.appendChild(alert)
    document.body.appendChild(root)

    expect(focusCfgMissAfterBlockedSave(root)).toBe(true)
    expect(document.activeElement).toBe(alert)
    expect(alert.tabIndex).toBe(-1)

    root.remove()
  })

  it('falls back to first aria-invalid control when alert missing', () => {
    const root = document.createElement('div')
    const select = document.createElement('select')
    select.setAttribute('aria-invalid', 'true')
    root.appendChild(select)
    document.body.appendChild(root)

    expect(focusCfgMissAfterBlockedSave(root)).toBe(true)
    expect(document.activeElement).toBe(select)

    root.remove()
  })

  it('returns false when root empty', () => {
    expect(focusCfgMissAfterBlockedSave(null)).toBe(false)
    expect(focusCfgMissAfterBlockedSave(document.createElement('div'))).toBe(false)
  })
})
