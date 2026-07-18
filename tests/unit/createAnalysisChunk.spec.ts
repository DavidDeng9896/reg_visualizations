import { describe, expect, it, vi } from 'vitest'
import {
  CREATE_ANALYSIS_IDLE_WARM,
  CREATE_ANALYSIS_WARM_TIMEOUT_MS,
  createAnalysisLoadMode,
  demoCtaLeavesCreateWarmIndependent,
  scheduleCreateAnalysisWarm,
} from '@/modules/analysis/createAnalysisChunk'

describe('createAnalysisChunk', () => {
  it('keeps CreateAnalysisDialog as deferred async (Round 38)', () => {
    expect(CREATE_ANALYSIS_IDLE_WARM).toBe(true)
    expect(createAnalysisLoadMode()).toBe('async-idle-warm')
  })

  it('idle-warms CreateAnalysisDialog after list interaction (Round 38–39)', () => {
    const importCreate = vi.fn(() => Promise.resolve({}))
    const idle = vi.fn((run: () => void) => run())
    scheduleCreateAnalysisWarm(importCreate, idle)
    expect(idle).toHaveBeenCalledTimes(1)
    expect(idle).toHaveBeenCalledWith(expect.any(Function), CREATE_ANALYSIS_WARM_TIMEOUT_MS)
    expect(importCreate).toHaveBeenCalledTimes(1)
  })

  it('keeps Demo CTA independent of Create warm (Round 39)', () => {
    expect(demoCtaLeavesCreateWarmIndependent()).toBe(true)
    expect(CREATE_ANALYSIS_WARM_TIMEOUT_MS).toBe(1500)
  })
})
