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
import { projectsChunkStrategy } from '@/shared/mock/projectsChunk'
import { workspaceViewChunkStrategy } from '@/modules/analysis/workspaceViewChunk'
import { tableChartWorkspaceChunkStrategy } from '@/modules/table/tableChartWorkspaceChunk'

describe('List / Create / CSV cold-path re-eval (Round 45)', () => {
  it('keeps list route-lazy after skip/aria-controls + Cancel ring helpers', () => {
    expect(LIST_PAGE_CHUNK_SPLIT_DEFERRED).toBe(true)
    expect(listPageChunkStrategy().round45Reeval).toBe('keep-route-lazy')
  })

  it('keeps Create async-idle-warm and Papa deferred-dynamic', () => {
    expect(CREATE_ANALYSIS_IDLE_WARM).toBe(true)
    expect(createAnalysisLoadMode()).toBe('async-idle-warm')
    expect(CREATE_ANALYSIS_WARM_TIMEOUT_MS).toBe(1500)
    expect(createAnalysisChunkStrategy().round45Reeval).toBe('keep-async-idle-warm')
    expect(CSV_PAPAPARSE_STATIC_DEFERRED).toBe(true)
    expect(csvPapaLoadMode()).toBe('deferred-dynamic')
    expect(csvParseChunkStrategy().round45Reeval).toBe('keep-deferred-dynamic')
  })

  it('keeps toolbar sync-shell and projects shared entry', () => {
    expect(workspaceViewChunkStrategy().round45Reeval).toBe('keep-sync-shell')
    expect(tableChartWorkspaceChunkStrategy().round45Reeval).toBe('keep-sync')
    expect(projectsChunkStrategy().round45Reeval).toBe('keep-shared')
  })
})
