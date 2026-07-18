/**
 * Workspace modal open flags shared across shell / table / sidebar (Round 32–34).
 * Keeps sidebar chrome inert while CSV / Combine / Transform / ChartEdit dialogs
 * are open without prop-drilling through async chunks.
 *
 * Round 34: ChartEditDrawer teleports to body; main content is inert for
 * csv / combine / chartEdit (covers flowchart mode). Transform stays inside
 * the table workspace and only inerts `ws-surface`, not `#workspace-main`.
 */

import { reactive } from 'vue'

export type WorkspaceDialogId = 'csv' | 'combine' | 'transform' | 'chartEdit'

export const workspaceDialogFlags = reactive<Record<WorkspaceDialogId, boolean>>({
  csv: false,
  combine: false,
  transform: false,
  chartEdit: false,
})

export function setWorkspaceDialogOpen(id: WorkspaceDialogId, open: boolean): void {
  workspaceDialogFlags[id] = open
}

export function anyWorkspaceDialogOpen(): boolean {
  return (
    workspaceDialogFlags.csv ||
    workspaceDialogFlags.combine ||
    workspaceDialogFlags.transform ||
    workspaceDialogFlags.chartEdit
  )
}

/**
 * Whether `#workspace-main` (flowchart or table/chart) should be inert.
 * Excludes Transform — its dialog still lives under main until teleported.
 */
export function mainBehindWorkspaceOverlay(): boolean {
  return (
    workspaceDialogFlags.csv ||
    workspaceDialogFlags.combine ||
    workspaceDialogFlags.chartEdit
  )
}

/** Skip-links outside inert regions should hide while any overlay owns focus. */
export function skipLinkHiddenBehindOverlay(): boolean {
  return anyWorkspaceDialogOpen()
}

/** Test helper — reset all flags between specs. */
export function resetWorkspaceDialogFlags(): void {
  workspaceDialogFlags.csv = false
  workspaceDialogFlags.combine = false
  workspaceDialogFlags.transform = false
  workspaceDialogFlags.chartEdit = false
}
