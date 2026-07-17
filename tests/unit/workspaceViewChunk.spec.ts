import { describe, expect, it } from 'vitest'
import { workspaceViewSplitDeferred } from '@/modules/analysis/workspaceViewChunk'

describe('workspaceViewChunk', () => {
  it('keeps AnalysisWorkspaceView sync-shell split deferred (Round 31)', () => {
    expect(workspaceViewSplitDeferred()).toBe(true)
  })
})
