import { afterEach, describe, expect, it } from 'vitest'
import {
  anyWorkspaceDialogOpen,
  resetWorkspaceDialogFlags,
  setWorkspaceDialogOpen,
  workspaceDialogFlags,
} from '@/modules/analysis/workspaceOverlay'

describe('workspaceOverlay', () => {
  afterEach(() => {
    resetWorkspaceDialogFlags()
  })

  it('tracks CSV / Combine / Transform dialog open flags (Round 32)', () => {
    expect(anyWorkspaceDialogOpen()).toBe(false)
    setWorkspaceDialogOpen('csv', true)
    expect(workspaceDialogFlags.csv).toBe(true)
    expect(anyWorkspaceDialogOpen()).toBe(true)
    setWorkspaceDialogOpen('combine', true)
    setWorkspaceDialogOpen('csv', false)
    expect(anyWorkspaceDialogOpen()).toBe(true)
    setWorkspaceDialogOpen('combine', false)
    setWorkspaceDialogOpen('transform', true)
    expect(anyWorkspaceDialogOpen()).toBe(true)
    setWorkspaceDialogOpen('transform', false)
    expect(anyWorkspaceDialogOpen()).toBe(false)
  })
})
