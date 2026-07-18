import { describe, expect, it, vi } from 'vitest'
import {
  analysisRoutePrefetchPaths,
  analysisWorkspacePrefetchPaths,
  scheduleRoutePrefetch,
  scheduleWorkspaceRoutePrefetch,
  warmMatchedComponents,
} from '@/shared/ui/routePrefetch'

describe('routePrefetch', () => {
  it('cold-start warms list only — not workspace (Round 34)', () => {
    expect(analysisRoutePrefetchPaths()).toEqual(['/'])
    expect(analysisWorkspacePrefetchPaths()).toEqual(['/analyses/__prefetch__'])
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

  it('schedules list resolve via idle helper on boot', () => {
    const loader = vi.fn().mockResolvedValue({ default: {} })
    const resolve = vi.fn((path: string) => ({
      matched: [{ components: { default: loader } }],
      path,
    }))
    const idle = vi.fn((run: () => void) => run())
    scheduleRoutePrefetch({ resolve }, { idle })
    expect(idle).toHaveBeenCalledTimes(1)
    expect(resolve).toHaveBeenCalledWith('/')
    expect(resolve).not.toHaveBeenCalledWith('/analyses/__prefetch__')
    expect(loader).toHaveBeenCalledTimes(1)
  })

  it('schedules workspace warm from list page (Round 34)', () => {
    const loader = vi.fn().mockResolvedValue({ default: {} })
    const resolve = vi.fn((path: string) => ({
      matched: [{ components: { default: loader } }],
      path,
    }))
    const idle = vi.fn((run: () => void) => run())
    scheduleWorkspaceRoutePrefetch({ resolve }, { idle })
    expect(idle).toHaveBeenCalledTimes(1)
    expect(resolve).toHaveBeenCalledWith('/analyses/__prefetch__')
    expect(loader).toHaveBeenCalledTimes(1)
  })
})
