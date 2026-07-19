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
  PROJECTS_CHUNK_SPLIT_DEFERRED,
  projectsChunkStrategy,
} from '@/shared/mock/projectsChunk'

describe('List / Create / CSV / projects cold-path re-eval (Round 60)', () => {
  it('keeps list route-lazy after ChartEdit Esc×toast + sidebar empty CTA helpers', () => {
    expect(LIST_PAGE_CHUNK_SPLIT_DEFERRED).toBe(true)
    expect(listPageChunkStrategy().round60Reeval).toBe('keep-route-lazy')
  })

  it('keeps Create async-idle-warm, Papa deferred-dynamic, and projects shared', () => {
    expect(CREATE_ANALYSIS_IDLE_WARM).toBe(true)
    expect(createAnalysisLoadMode()).toBe('async-idle-warm')
    expect(CREATE_ANALYSIS_WARM_TIMEOUT_MS).toBe(1500)
    expect(createAnalysisChunkStrategy().round60Reeval).toBe('keep-async-idle-warm')
    expect(CSV_PAPAPARSE_STATIC_DEFERRED).toBe(true)
    expect(csvPapaLoadMode()).toBe('deferred-dynamic')
    expect(csvParseChunkStrategy().round60Reeval).toBe('keep-deferred-dynamic')
    expect(PROJECTS_CHUNK_SPLIT_DEFERRED).toBe(true)
    expect(projectsChunkStrategy().round60Reeval).toBe('keep-shared')
  })
})
