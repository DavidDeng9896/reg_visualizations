import { describe, expect, it, vi } from 'vitest'
import {
  EDIT_DRAWER_FIT_ENGINE_SPLIT_DEFERRED,
  EDIT_DRAWER_PALETTE_SPLIT_DEFERRED,
  editDrawerFitEngineSplitMode,
  editDrawerPaletteSplitMode,
  scheduleFitRuntimeWarm,
} from '@/modules/chart/editDrawerChunk'

describe('editDrawerChunk', () => {
  it('defers fitEngine split — engine is runtime-owned, not drawer-owned (Round 34)', () => {
    expect(EDIT_DRAWER_FIT_ENGINE_SPLIT_DEFERRED).toBe(true)
    expect(editDrawerFitEngineSplitMode()).toBe('deferred-sync')
  })

  it('defers palette async chunk — seriesStyle helpers stay sync (Round 34)', () => {
    expect(EDIT_DRAWER_PALETTE_SPLIT_DEFERRED).toBe(true)
    expect(editDrawerPaletteSplitMode()).toBe('deferred-sync')
  })

  it('idle-warms fitEngine after Edit drawer opens (Round 35)', () => {
    const importFit = vi.fn(() => Promise.resolve({}))
    const idle = vi.fn((run: () => void) => run())
    scheduleFitRuntimeWarm(importFit, idle)
    expect(idle).toHaveBeenCalledTimes(1)
    expect(importFit).toHaveBeenCalledTimes(1)
  })
})
