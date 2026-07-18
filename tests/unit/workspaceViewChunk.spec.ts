import { describe, expect, it } from 'vitest'
import {
  workspaceViewChunkStrategy,
  workspaceViewSplitDeferred,
} from '@/modules/analysis/workspaceViewChunk'

describe('workspaceViewChunk', () => {
  it('keeps AnalysisWorkspaceView sync-shell split deferred (Round 32–44)', () => {
    expect(workspaceViewSplitDeferred()).toBe(true)
    expect(workspaceViewChunkStrategy()).toEqual({
      splitDeferred: true,
      toolbar: 'sync-with-table-chart',
      round36Reeval: 'keep-sync-shell',
      round42Reeval: 'keep-sync-shell',
      round44Reeval: 'keep-sync-shell',
    })
  })
})
