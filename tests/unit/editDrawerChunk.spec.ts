import { describe, expect, it } from 'vitest'
import {
  EDIT_DRAWER_FIT_ENGINE_SPLIT_DEFERRED,
  EDIT_DRAWER_PALETTE_SPLIT_DEFERRED,
  editDrawerFitEngineSplitMode,
  editDrawerPaletteSplitMode,
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
})
