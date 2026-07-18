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
  TRANSFORM_PIPELINE_SPLIT_DEFERRED,
  transformChunkStrategy,
  transformPipelineSplitMode,
} from '@/modules/transform/transformChunk'

describe('List / Flowchart / Transform cold-path re-eval (Round 53)', () => {
  it('keeps list route-lazy after workspace skip→empty Tab + flowchart CTA×toast helpers', () => {
    expect(LIST_PAGE_CHUNK_SPLIT_DEFERRED).toBe(true)
    expect(listPageChunkStrategy().round53Reeval).toBe('keep-route-lazy')
  })

  it('keeps flowchart async-idle-warm after R53 a11y helpers', () => {
    expect(FLOWCHART_COLD_WARM_DEFERRED).toBe(true)
    expect(flowchartLoadMode()).toBe('async-idle-warm')
    expect(flowchartChunkStrategy().round53Reeval).toBe('keep-async-idle-warm')
  })

  it('keeps Transform pipeline deferred-sync with idle warm on open', () => {
    expect(TRANSFORM_PIPELINE_SPLIT_DEFERRED).toBe(true)
    expect(transformPipelineSplitMode()).toBe('deferred-sync')
    expect(transformChunkStrategy().round53Reeval).toBe('keep-deferred-sync')
  })
})
