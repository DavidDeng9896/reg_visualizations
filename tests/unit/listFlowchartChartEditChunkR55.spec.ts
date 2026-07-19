import { describe, expect, it } from 'vitest'
import {
  LIST_PAGE_CHUNK_SPLIT_DEFERRED,
  listPageChunkStrategy,
} from '@/modules/analysis/listPageChunk'
import {
  FLOWCHART_COLD_WARM_DEFERRED,
  flowchartChunkStrategy,
  flowchartLoadMode,
} from '@/modules/flowchart/flowchartChunk'
import {
  EDIT_DRAWER_FIT_ENGINE_SPLIT_DEFERRED,
  EDIT_DRAWER_PALETTE_SPLIT_DEFERRED,
  editDrawerChunkStrategy,
  editDrawerFitEngineSplitMode,
  editDrawerPaletteSplitMode,
} from '@/modules/chart/editDrawerChunk'

describe('List / Flowchart / ChartEdit cold-path re-eval (Round 55)', () => {
  it('keeps list route-lazy after New view Cancel×toast + sidebar empty CTA helpers', () => {
    expect(LIST_PAGE_CHUNK_SPLIT_DEFERRED).toBe(true)
    expect(listPageChunkStrategy().round55Reeval).toBe('keep-route-lazy')
  })

  it('keeps flowchart async-idle-warm after R55 a11y helpers', () => {
    expect(FLOWCHART_COLD_WARM_DEFERRED).toBe(true)
    expect(flowchartLoadMode()).toBe('async-idle-warm')
    expect(flowchartChunkStrategy().round55Reeval).toBe('keep-async-idle-warm')
  })

  it('keeps ChartEdit fitEngine/palette deferred-sync after Cancel×toast', () => {
    expect(EDIT_DRAWER_FIT_ENGINE_SPLIT_DEFERRED).toBe(true)
    expect(EDIT_DRAWER_PALETTE_SPLIT_DEFERRED).toBe(true)
    expect(editDrawerFitEngineSplitMode()).toBe('deferred-sync')
    expect(editDrawerPaletteSplitMode()).toBe('deferred-sync')
    expect(editDrawerChunkStrategy().round55Reeval).toBe('keep-deferred-sync')
  })
})
