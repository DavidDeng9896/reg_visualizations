import { describe, expect, it } from 'vitest'
import { axisExtent } from '@/modules/chart/axisRange'

describe('axisExtent', () => {
  it('returns undefined for automatic mode', () => {
    expect(axisExtent({ mode: 'auto', min: 0, max: 10 })).toBeUndefined()
    expect(axisExtent({})).toBeUndefined()
  })

  it('returns manual min/max', () => {
    expect(axisExtent({ mode: 'manual', min: -1, max: 5 })).toEqual({ min: -1, max: 5 })
  })

  it('allows open-ended manual bounds', () => {
    expect(axisExtent({ mode: 'manual', min: 0 })).toEqual({ min: 0 })
    expect(axisExtent({ mode: 'manual', max: 100 })).toEqual({ max: 100 })
  })

  it('rejects invalid min >= max', () => {
    expect(axisExtent({ mode: 'manual', min: 5, max: 5 })).toBeUndefined()
    expect(axisExtent({ mode: 'manual', min: 10, max: 1 })).toBeUndefined()
  })
})
