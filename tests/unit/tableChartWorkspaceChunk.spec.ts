import { describe, expect, it } from 'vitest'
import {
  tableChartWorkspaceChunkStrategy,
  tableChartWorkspaceMountMode,
} from '@/modules/table/tableChartWorkspaceChunk'

describe('tableChartWorkspaceChunk (Round 42–46)', () => {
  it('keeps toolbar sync with grid/chart (no async toolbar chunk)', () => {
    expect(tableChartWorkspaceMountMode()).toBe('sync')
    expect(tableChartWorkspaceChunkStrategy()).toEqual({
      mount: 'sync',
      toolbar: 'sync-with-grid-chart',
      round42Reeval: 'keep-sync',
      round44Reeval: 'keep-sync',
      round45Reeval: 'keep-sync',
      round46Reeval: 'keep-sync',
    })
  })
})
