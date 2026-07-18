import { describe, expect, it } from 'vitest'
import {
  CREATE_ANALYSIS_IDLE_WARM,
  CREATE_ANALYSIS_WARM_TIMEOUT_MS,
  createAnalysisLoadMode,
} from '@/modules/analysis/createAnalysisChunk'
import {
  CSV_PAPAPARSE_STATIC_DEFERRED,
  csvPapaLoadMode,
} from '@/modules/table/csvParseChunk'
import {
  LIST_PAGE_CHUNK_SPLIT_DEFERRED,
  listPageChunkStrategy,
} from '@/modules/analysis/listPageChunk'

describe('Create/CSV/List cold-path re-eval (Round 43)', () => {
  it('keeps Create async-idle-warm on the list cold path', () => {
    expect(CREATE_ANALYSIS_IDLE_WARM).toBe(true)
    expect(createAnalysisLoadMode()).toBe('async-idle-warm')
    expect(CREATE_ANALYSIS_WARM_TIMEOUT_MS).toBe(1500)
  })

  it('keeps PapaParse deferred-dynamic for CSV chrome', () => {
    expect(CSV_PAPAPARSE_STATIC_DEFERRED).toBe(true)
    expect(csvPapaLoadMode()).toBe('deferred-dynamic')
  })

  it('keeps list route-lazy after filter/aria-controls helpers', () => {
    expect(LIST_PAGE_CHUNK_SPLIT_DEFERRED).toBe(true)
    expect(listPageChunkStrategy().round43Reeval).toBe('keep-route-lazy')
  })
})
