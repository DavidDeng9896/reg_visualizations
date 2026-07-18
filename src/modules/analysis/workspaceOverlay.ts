/**
 * Workspace modal open flags shared across shell / table / sidebar (Round 32–36).
 * Keeps sidebar chrome inert while CSV / Combine / Transform / ChartEdit dialogs
 * are open without prop-drilling through async chunks.
 *
 * Round 34: ChartEditDrawer teleports to body; main inert for csv / combine /
 * chartEdit (covers flowchart mode).
 * Round 35: TransformDialog also teleports to body → transform joins
 * `mainBehindWorkspaceOverlay` (unified with csv / combine / chartEdit).
 * Round 36: CSV / Combine also teleport to body; all four overlays share
 * `data-ia-*` markers and Esc-yields-to-feedback contract.
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
 * All teleported / sibling overlays (csv, combine, transform, chartEdit).
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
}
