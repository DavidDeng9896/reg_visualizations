import { describe, expect, it } from 'vitest'
import { multiSelectCountStatus } from '@/shared/ui/selectStatus'

describe('selectStatus', () => {
  it('announces multi-select selection count for live regions', () => {
    expect(multiSelectCountStatus(0)).toBe('已选 0 项')
    expect(multiSelectCountStatus(2)).toBe('已选 2 项')
    expect(multiSelectCountStatus(2, '左连接键')).toBe('左连接键 2 项')
  })

  it('clamps negative or fractional counts', () => {
    expect(multiSelectCountStatus(-1)).toBe('已选 0 项')
    expect(multiSelectCountStatus(2.9)).toBe('已选 2 项')
  })
})
