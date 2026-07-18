import { describe, expect, it } from 'vitest'
import {
  LIST_PAGE_CHUNK_SPLIT_DEFERRED,
  listPageChunkStrategy,
} from '@/modules/analysis/listPageChunk'
import {
  PROJECTS_CHUNK_SPLIT_DEFERRED,
  projectsChunkStrategy,
} from '@/shared/mock/projectsChunk'
import {
  workspaceViewChunkStrategy,
  workspaceViewSplitDeferred,
} from '@/modules/analysis/workspaceViewChunk'

describe('List / projects / workspace cold-path re-eval (Round 51)', () => {
  it('keeps list route-lazy after Demo CTA×toast + skip→Tab + empty CTA a11y', () => {
    expect(LIST_PAGE_CHUNK_SPLIT_DEFERRED).toBe(true)
    expect(listPageChunkStrategy().round51Reeval).toBe('keep-route-lazy')
  })

  it('keeps projects shared and workspace sync-shell', () => {
    expect(PROJECTS_CHUNK_SPLIT_DEFERRED).toBe(true)
    expect(projectsChunkStrategy().round51Reeval).toBe('keep-shared')
    expect(workspaceViewSplitDeferred()).toBe(true)
    expect(workspaceViewChunkStrategy().round51Reeval).toBe('keep-sync-shell')
  })
})
