import { afterEach, describe, expect, it } from 'vitest'
import {
  anyWorkspaceDialogOpen,
  mainBehindWorkspaceOverlay,
  resetWorkspaceDialogFlags,
  setWorkspaceDialogOpen,
  skipLinkHiddenBehindOverlay,
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

  it('tracks ChartEditDrawer open flag for sidebar/main inert (Round 33)', () => {
    expect(anyWorkspaceDialogOpen()).toBe(false)
    setWorkspaceDialogOpen('chartEdit', true)
    expect(workspaceDialogFlags.chartEdit).toBe(true)
    expect(anyWorkspaceDialogOpen()).toBe(true)
    setWorkspaceDialogOpen('chartEdit', false)
    expect(anyWorkspaceDialogOpen()).toBe(false)
  })

  it('inerts main for all workspace overlays including transform (Round 35)', () => {
    expect(mainBehindWorkspaceOverlay()).toBe(false)
    setWorkspaceDialogOpen('transform', true)
    expect(mainBehindWorkspaceOverlay()).toBe(true)
    expect(anyWorkspaceDialogOpen()).toBe(true)
    setWorkspaceDialogOpen('transform', false)
    setWorkspaceDialogOpen('csv', true)
    expect(mainBehindWorkspaceOverlay()).toBe(true)
    setWorkspaceDialogOpen('csv', false)
    setWorkspaceDialogOpen('combine', true)
    expect(mainBehindWorkspaceOverlay()).toBe(true)
    setWorkspaceDialogOpen('combine', false)
    setWorkspaceDialogOpen('chartEdit', true)
    expect(mainBehindWorkspaceOverlay()).toBe(true)
  })

  it('hides skip-links while any workspace overlay is open (Round 34)', () => {
    expect(skipLinkHiddenBehindOverlay()).toBe(false)
    setWorkspaceDialogOpen('chartEdit', true)
    expect(skipLinkHiddenBehindOverlay()).toBe(true)
    setWorkspaceDialogOpen('chartEdit', false)
    setWorkspaceDialogOpen('transform', true)
    expect(skipLinkHiddenBehindOverlay()).toBe(true)
  })

  it('csv overlay inerts flowchart main (empty CTA behind overlay, Round 35)', () => {
    // Contract: flowchart empty lives under #workspace-main; csv → mainBehind.
    setWorkspaceDialogOpen('csv', true)
    expect(mainBehindWorkspaceOverlay()).toBe(true)
    expect(skipLinkHiddenBehindOverlay()).toBe(true)
  })
})
