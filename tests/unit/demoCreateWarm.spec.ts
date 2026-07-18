import { describe, expect, it, vi } from 'vitest'
import {
  CREATE_ANALYSIS_WARM_TIMEOUT_MS,
  demoSuccessPathWarmsCreate,
  scheduleCreateAnalysisWarm,
} from '@/modules/analysis/createAnalysisChunk'

describe('demoCreateWarm (Round 41)', () => {
  it('keeps empty-list Demo success path from scheduling Create warm', () => {
    expect(demoSuccessPathWarmsCreate()).toBe(false)
  })

  it('still allows Create triggers to idle-warm independently of Demo', () => {
    const importCreate = vi.fn(() => Promise.resolve({}))
    const idle = vi.fn((run: () => void) => run())
    scheduleCreateAnalysisWarm(importCreate, idle)
    expect(idle).toHaveBeenCalledWith(expect.any(Function), CREATE_ANALYSIS_WARM_TIMEOUT_MS)
    expect(importCreate).toHaveBeenCalledTimes(1)
  })
})
