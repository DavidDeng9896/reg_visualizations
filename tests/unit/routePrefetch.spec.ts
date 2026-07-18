import { describe, expect, it, vi } from 'vitest'
import {
  analysisRoutePrefetchPaths,
  scheduleRoutePrefetch,
  warmMatchedComponents,
} from '@/shared/ui/routePrefetch'

describe('routePrefetch', () => {
  it('lists cold-start routes to warm (Round 33)', () => {
    expect(analysisRoutePrefetchPaths()).toEqual(['/', '/analyses/__prefetch__'])
  })

  it('invokes lazy component factories on matched records', () => {
    const loader = vi.fn().mockResolvedValue({ default: {} })
    expect(
      warmMatchedComponents({
        matched: [{ components: { default: loader } }],
      }),
    ).toBe(1)
    expect(loader).toHaveBeenCalledTimes(1)
  })

  it('schedules resolve + warm for each path via idle helper', () => {
    const loader = vi.fn().mockResolvedValue({ default: {} })
    const resolve = vi.fn((path: string) => ({
      matched: [{ components: { default: loader } }],
      path,
    }))
    const idle = vi.fn((run: () => void) => run())
    scheduleRoutePrefetch({ resolve }, { idle })
    expect(idle).toHaveBeenCalledTimes(1)
    expect(resolve).toHaveBeenCalledWith('/')
    expect(resolve).toHaveBeenCalledWith('/analyses/__prefetch__')
    expect(loader).toHaveBeenCalledTimes(2)
  })
})
