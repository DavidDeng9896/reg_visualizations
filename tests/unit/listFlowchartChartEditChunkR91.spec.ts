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

describe('List / Flowchart / ChartEdit cold-path re-eval (Round 91)', () => {
  it('keeps list route-lazy after Transform Cancel×toast + flowchart empty CTA helpers', () => {
    expect(LIST_PAGE_CHUNK_SPLIT_DEFERRED).toBe(true)
    expect(listPageChunkStrategy().round91Reeval).toBe('keep-route-lazy')
  })

  it('keeps flowchart async-idle-warm after R91 a11y helpers', () => {
    expect(FLOWCHART_COLD_WARM_DEFERRED).toBe(true)
    expect(flowchartLoadMode()).toBe('async-idle-warm')
    expect(flowchartChunkStrategy().round91Reeval).toBe('keep-async-idle-warm')
  })

  it('keeps ChartEdit fitEngine/palette deferred-sync after Esc×toast + New view Cancel', () => {
    expect(EDIT_DRAWER_FIT_ENGINE_SPLIT_DEFERRED).toBe(true)
    expect(EDIT_DRAWER_PALETTE_SPLIT_DEFERRED).toBe(true)
    expect(editDrawerFitEngineSplitMode()).toBe('deferred-sync')
    expect(editDrawerPaletteSplitMode()).toBe('deferred-sync')
    expect(editDrawerChunkStrategy().round91Reeval).toBe('keep-deferred-sync')
  })
})
