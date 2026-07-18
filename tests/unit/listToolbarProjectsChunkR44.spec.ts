import { describe, expect, it } from 'vitest'
import { listPageChunkStrategy } from '@/modules/analysis/listPageChunk'
import { projectsChunkStrategy } from '@/shared/mock/projectsChunk'
import { workspaceViewChunkStrategy } from '@/modules/analysis/workspaceViewChunk'
import { tableChartWorkspaceChunkStrategy } from '@/modules/table/tableChartWorkspaceChunk'

describe('List / toolbar / projects chunk re-eval (Round 44)', () => {
  it('keeps list route-lazy; toolbar sync-shell; projects shared entry', () => {
    expect(listPageChunkStrategy().round44Reeval).toBe('keep-route-lazy')
    expect(workspaceViewChunkStrategy().round44Reeval).toBe('keep-sync-shell')
    expect(tableChartWorkspaceChunkStrategy().round44Reeval).toBe('keep-sync')
    expect(projectsChunkStrategy().round44Reeval).toBe('keep-shared')
  })
})
