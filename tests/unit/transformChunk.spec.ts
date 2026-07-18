import { describe, expect, it, vi } from 'vitest'
import {
  TRANSFORM_PIPELINE_SPLIT_DEFERRED,
  schedulePipelineWarm,
  transformPipelineSplitMode,
} from '@/modules/transform/transformChunk'

describe('transformChunk', () => {
  it('defers pipeline async split — Save validation stays sync (Round 36)', () => {
    expect(TRANSFORM_PIPELINE_SPLIT_DEFERRED).toBe(true)
    expect(transformPipelineSplitMode()).toBe('deferred-sync')
  })

  it('idle-warms pipeline after Transform dialog opens (Round 36)', () => {
    const importPipeline = vi.fn(() => Promise.resolve({}))
    const idle = vi.fn((run: () => void) => run())
    schedulePipelineWarm(importPipeline, idle)
    expect(idle).toHaveBeenCalledTimes(1)
    expect(importPipeline).toHaveBeenCalledTimes(1)
  })
})
