import { describe, expect, it, vi } from 'vitest'
import {
  CREATE_ANALYSIS_IDLE_WARM,
  createAnalysisLoadMode,
  scheduleCreateAnalysisWarm,
} from '@/modules/analysis/createAnalysisChunk'

describe('createAnalysisChunk', () => {
  it('keeps CreateAnalysisDialog as deferred async (Round 38)', () => {
    expect(CREATE_ANALYSIS_IDLE_WARM).toBe(true)
    expect(createAnalysisLoadMode()).toBe('async-idle-warm')
  })

  it('idle-warms CreateAnalysisDialog after list interaction (Round 38)', () => {
    const importCreate = vi.fn(() => Promise.resolve({}))
    const idle = vi.fn((run: () => void) => run())
    scheduleCreateAnalysisWarm(importCreate, idle)
    expect(idle).toHaveBeenCalledTimes(1)
    expect(importCreate).toHaveBeenCalledTimes(1)
  })
})
