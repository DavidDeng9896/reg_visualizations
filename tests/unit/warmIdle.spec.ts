import { afterEach, describe, expect, it, vi } from 'vitest'
import { warmIdle } from '@/shared/ui/warmIdle'

describe('warmIdle', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('uses requestIdleCallback when available', () => {
    const run = vi.fn()
    const ric = vi.fn((cb: IdleRequestCallback) => {
      cb({ didTimeout: false, timeRemaining: () => 10 } as IdleDeadline)
      return 1
    })
    vi.stubGlobal('requestIdleCallback', ric)
    warmIdle(run, 3000)
    expect(ric).toHaveBeenCalledTimes(1)
    expect(ric.mock.calls[0][1]).toEqual({ timeout: 3000 })
    expect(run).toHaveBeenCalledTimes(1)
  })

  it('falls back to setTimeout when idle API is missing', () => {
    vi.useFakeTimers()
    vi.stubGlobal('requestIdleCallback', undefined)
    const run = vi.fn()
    warmIdle(run, 5000)
    expect(run).not.toHaveBeenCalled()
    vi.advanceTimersByTime(2000)
    expect(run).toHaveBeenCalledTimes(1)
  })
})
