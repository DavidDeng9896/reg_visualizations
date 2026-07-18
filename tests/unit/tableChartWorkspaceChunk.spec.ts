import { describe, expect, it } from 'vitest'
import {
  TABLE_CHART_WORKSPACE_SYNC,
  tableChartWorkspaceMountMode,
} from '@/modules/table/tableChartWorkspaceChunk'

describe('tableChartWorkspaceChunk', () => {
  it('keeps TableChartWorkspace sync in the workspace shell (Round 32–36)', () => {
    expect(TABLE_CHART_WORKSPACE_SYNC).toBe(true)
    expect(tableChartWorkspaceMountMode()).toBe('sync')
  })
})
