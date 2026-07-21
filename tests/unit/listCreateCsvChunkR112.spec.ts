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

describe('List / Create / CSV cold-path re-eval (Round 112)', () => {
  it('keeps list route-lazy after CSV/Combine Esc×toast + empty CTA helpers', () => {
    expect(LIST_PAGE_CHUNK_SPLIT_DEFERRED).toBe(true)
    expect(listPageChunkStrategy().round112Reeval).toBe('keep-route-lazy')
  })

  it('keeps Create async-idle-warm and Papa deferred-dynamic', () => {
    expect(CREATE_ANALYSIS_IDLE_WARM).toBe(true)
    expect(createAnalysisLoadMode()).toBe('async-idle-warm')
    expect(CREATE_ANALYSIS_WARM_TIMEOUT_MS).toBe(1500)
    expect(createAnalysisChunkStrategy().round112Reeval).toBe('keep-async-idle-warm')
    expect(CSV_PAPAPARSE_STATIC_DEFERRED).toBe(true)
    expect(csvPapaLoadMode()).toBe('deferred-dynamic')
    expect(csvParseChunkStrategy().round112Reeval).toBe('keep-deferred-dynamic')
  })
})
