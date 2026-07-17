import { describe, expect, it } from 'vitest'
import { formatPreviewCell, slicePreviewRows } from '@/shared/ui/previewTable'

describe('previewTable', () => {
  it('formats nullish and primitive cells for native preview tables', () => {
    expect(formatPreviewCell(null)).toBe('')
    expect(formatPreviewCell(undefined)).toBe('')
    expect(formatPreviewCell(12.5)).toBe('12.5')
    expect(formatPreviewCell(true)).toBe('true')
    expect(formatPreviewCell('abc')).toBe('abc')
  })

  it('slices preview rows to the requested limit', () => {
    const rows = Array.from({ length: 25 }, (_, i) => ({ id: i }))
    expect(slicePreviewRows(rows, 20)).toHaveLength(20)
    expect(slicePreviewRows(rows, 20)[0]).toEqual({ id: 0 })
    expect(slicePreviewRows(rows, 0)).toEqual([])
    expect(slicePreviewRows([], 20)).toEqual([])
  })
})
