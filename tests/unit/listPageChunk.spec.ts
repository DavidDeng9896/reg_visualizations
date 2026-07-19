import { describe, expect, it } from 'vitest'
import {
  LIST_PAGE_CHUNK_SPLIT_DEFERRED,
  createWarmBeatsWorkspacePrefetchTimeout,
  listPageChunkStrategy,
} from '@/modules/analysis/listPageChunk'
import { CREATE_ANALYSIS_WARM_TIMEOUT_MS } from '@/modules/analysis/createAnalysisChunk'

describe('listPageChunk (Round 39)', () => {
  it('keeps list as route-lazy; Create async-idle-warm; workspace after listReady', () => {
    expect(LIST_PAGE_CHUNK_SPLIT_DEFERRED).toBe(true)
    expect(listPageChunkStrategy()).toEqual({
      routeLazy: true,
      createDialog: 'async-idle-warm',
      workspacePrefetch: 'after-list-ready',
      createWarmTimeoutMs: 1500,
      splitDeferred: true,
      round39Reeval: 'keep-route-lazy',
      round40Reeval: 'keep-route-lazy',
      round41Reeval: 'keep-route-lazy',
      round42Reeval: 'keep-route-lazy',
      round43Reeval: 'keep-route-lazy',
      round44Reeval: 'keep-route-lazy',
      round45Reeval: 'keep-route-lazy',
      round46Reeval: 'keep-route-lazy',
      round47Reeval: 'keep-route-lazy',
      round48Reeval: 'keep-route-lazy',
      round49Reeval: 'keep-route-lazy',
      round50Reeval: 'keep-route-lazy',
      round51Reeval: 'keep-route-lazy',
      round52Reeval: 'keep-route-lazy',
      round53Reeval: 'keep-route-lazy',
      round54Reeval: 'keep-route-lazy',
      round55Reeval: 'keep-route-lazy',
      round56Reeval: 'keep-route-lazy',
      round57Reeval: 'keep-route-lazy',
      round58Reeval: 'keep-route-lazy',
      round59Reeval: 'keep-route-lazy',
      round60Reeval: 'keep-route-lazy',
      round61Reeval: 'keep-route-lazy',
      round62Reeval: 'keep-route-lazy',
      round63Reeval: 'keep-route-lazy',
      round64Reeval: 'keep-route-lazy',
      round65Reeval: 'keep-route-lazy',
      round66Reeval: 'keep-route-lazy',
      round67Reeval: 'keep-route-lazy',
      round68Reeval: 'keep-route-lazy',
      round69Reeval: 'keep-route-lazy',
      round70Reeval: 'keep-route-lazy',
    })
  })

  it('Create warm timeout beats default workspace idle so Create wins races', () => {
    expect(CREATE_ANALYSIS_WARM_TIMEOUT_MS).toBe(1500)
    expect(createWarmBeatsWorkspacePrefetchTimeout(CREATE_ANALYSIS_WARM_TIMEOUT_MS, 4000)).toBe(true)
    expect(createWarmBeatsWorkspacePrefetchTimeout(4000, 4000)).toBe(false)
  })
})
