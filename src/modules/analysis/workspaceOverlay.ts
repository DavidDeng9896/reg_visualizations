/**
 * Workspace modal open flags shared across shell / table / sidebar (Round 32–37).
 * Keeps sidebar chrome inert while CSV / Combine / Transform / ChartEdit /
 * New view dialogs are open without prop-drilling through async chunks.
 *
 * Round 34: ChartEditDrawer teleports to body; main inert for csv / combine /
 * chartEdit (covers flowchart mode).
 * Round 35: TransformDialog also teleports to body → transform joins
 * `mainBehindWorkspaceOverlay` (unified with csv / combine / chartEdit).
 * Round 36: CSV / Combine also teleport to body; all four overlays share
 * `data-ia-*` markers and Esc-yields-to-feedback contract.
 * Round 37: New view teleports to body → joins workspace dialog flags so
 * main / shell / toast inert align with other overlays.
 */

import { reactive } from 'vue'

export type WorkspaceDialogId = 'csv' | 'combine' | 'transform' | 'chartEdit' | 'newView'

export const workspaceDialogFlags = reactive<Record<WorkspaceDialogId, boolean>>({
  csv: false,
  combine: false,
  transform: false,
  chartEdit: false,
  newView: false,
})

export function setWorkspaceDialogOpen(id: WorkspaceDialogId, open: boolean): void {
  workspaceDialogFlags[id] = open
}

export function anyWorkspaceDialogOpen(): boolean {
  return (
    workspaceDialogFlags.csv ||
    workspaceDialogFlags.combine ||
    workspaceDialogFlags.transform ||
    workspaceDialogFlags.chartEdit ||
    workspaceDialogFlags.newView
  )
}

/**
 * Whether `#workspace-main` (flowchart or table/chart) should be inert.
 * All teleported workspace overlays (csv, combine, transform, chartEdit, newView).
 */
export function mainBehindWorkspaceOverlay(): boolean {
  return anyWorkspaceDialogOpen()
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
  workspaceDialogFlags.newView = false
}
