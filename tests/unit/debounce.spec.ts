import { describe, expect, it, vi } from 'vitest'
import { debounce } from '@/shared/utils/debounce'

describe('debounce', () => {
  it('delays invocation until quiet period', () => {
    vi.useFakeTimers()
    const fn = vi.fn()
    const d = debounce(fn, 120)
    d()
    d()
    d()
    expect(fn).not.toHaveBeenCalled()
    vi.advanceTimersByTime(119)
    expect(fn).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(fn).toHaveBeenCalledTimes(1)
    vi.useRealTimers()
  })

  it('cancel prevents pending call', () => {
    vi.useFakeTimers()
    const fn = vi.fn()
    const d = debounce(fn, 50)
    d()
    d.cancel()
    vi.advanceTimersByTime(100)
    expect(fn).not.toHaveBeenCalled()
    vi.useRealTimers()
  })
})
