import { describe, expect, it } from 'vitest'
import {
  CREATE_ANALYSIS_IDLE_WARM,
  CREATE_ANALYSIS_WARM_TIMEOUT_MS,
  createAnalysisLoadMode,
  createAnalysisChunkStrategy,
} from '@/modules/analysis/createAnalysisChunk'
import {
  CSV_PAPAPARSE_STATIC_DEFERRED,
  csvPapaLoadMode,
  csvParseChunkStrategy,
} from '@/modules/table/csvParseChunk'
import {
  LIST_PAGE_CHUNK_SPLIT_DEFERRED,
  listPageChunkStrategy,
} from '@/modules/analysis/listPageChunk'
import {
  TRANSFORM_PIPELINE_SPLIT_DEFERRED,
  transformChunkStrategy,
  transformPipelineSplitMode,
} from '@/modules/transform/transformChunk'

describe('List / Create / CSV / Transform cold-path re-eval (Round 76)', () => {
  it('keeps list route-lazy after Transform Cancel×toast + flowchart empty CTA helpers', () => {
    expect(LIST_PAGE_CHUNK_SPLIT_DEFERRED).toBe(true)
    expect(listPageChunkStrategy().round76Reeval).toBe('keep-route-lazy')
  })

  it('keeps Create async-idle-warm, Papa deferred-dynamic, and Transform deferred-sync', () => {
    expect(CREATE_ANALYSIS_IDLE_WARM).toBe(true)
    expect(createAnalysisLoadMode()).toBe('async-idle-warm')
    expect(CREATE_ANALYSIS_WARM_TIMEOUT_MS).toBe(1500)
    expect(createAnalysisChunkStrategy().round76Reeval).toBe('keep-async-idle-warm')
    expect(CSV_PAPAPARSE_STATIC_DEFERRED).toBe(true)
    expect(csvPapaLoadMode()).toBe('deferred-dynamic')
    expect(csvParseChunkStrategy().round76Reeval).toBe('keep-deferred-dynamic')
    expect(TRANSFORM_PIPELINE_SPLIT_DEFERRED).toBe(true)
    expect(transformPipelineSplitMode()).toBe('deferred-sync')
    expect(transformChunkStrategy().round76Reeval).toBe('keep-deferred-sync')
  })
})
