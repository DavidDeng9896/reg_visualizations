import { afterEach, describe, expect, it } from 'vitest'
import {
  anyWorkspaceDialogOpen,
  mainBehindWorkspaceOverlay,
  resetWorkspaceDialogFlags,
  setWorkspaceDialogOpen,
  skipLinkHiddenBehindOverlay,
} from '@/modules/analysis/workspaceOverlay'

describe('overlayCoexistence (Round 38)', () => {
  afterEach(() => {
    resetWorkspaceDialogFlags()
  })

  it('New view alone hides skip-link and inerts main (CSV/Combine empty CTAs behind)', () => {
    setWorkspaceDialogOpen('newView', true)
    expect(anyWorkspaceDialogOpen()).toBe(true)
    expect(mainBehindWorkspaceOverlay()).toBe(true)
    expect(skipLinkHiddenBehindOverlay()).toBe(true)
  })

  it('CSV / Combine empty-CTA paths stay behind New view inert (no skip leak)', () => {
    // Simulate: New view opened from table toolbar while flowchart/workspace empty CTAs exist under main.
    setWorkspaceDialogOpen('newView', true)
    expect(mainBehindWorkspaceOverlay()).toBe(true)
    // Opening CSV while New view is up is unusual; if both flags set, still fully behind overlay.
    setWorkspaceDialogOpen('csv', true)
    expect(anyWorkspaceDialogOpen()).toBe(true)
    expect(skipLinkHiddenBehindOverlay()).toBe(true)
    setWorkspaceDialogOpen('csv', false)
    setWorkspaceDialogOpen('combine', true)
    expect(mainBehindWorkspaceOverlay()).toBe(true)
    expect(skipLinkHiddenBehindOverlay()).toBe(true)
  })

  it('closing New view restores skip visibility when no other overlay remains', () => {
    setWorkspaceDialogOpen('newView', true)
    expect(skipLinkHiddenBehindOverlay()).toBe(true)
    setWorkspaceDialogOpen('newView', false)
    expect(skipLinkHiddenBehindOverlay()).toBe(false)
    expect(mainBehindWorkspaceOverlay()).toBe(false)
  })
})
