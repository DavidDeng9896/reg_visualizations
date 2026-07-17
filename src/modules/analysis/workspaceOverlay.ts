/**
 * Workspace modal open flags shared across shell / table / sidebar (Round 32).
 * Keeps sidebar chrome inert while CSV / Combine / Transform dialogs are open
 * without prop-drilling through async chunks.
 */

import { reactive } from 'vue'

export type WorkspaceDialogId = 'csv' | 'combine' | 'transform'

export const workspaceDialogFlags = reactive<Record<WorkspaceDialogId, boolean>>({
  csv: false,
  combine: false,
  transform: false,
})

export function setWorkspaceDialogOpen(id: WorkspaceDialogId, open: boolean): void {
  workspaceDialogFlags[id] = open
}

export function anyWorkspaceDialogOpen(): boolean {
  return (
    workspaceDialogFlags.csv ||
    workspaceDialogFlags.combine ||
    workspaceDialogFlags.transform
  )
}

/** Test helper — reset all flags between specs. */
export function resetWorkspaceDialogFlags(): void {
  workspaceDialogFlags.csv = false
  workspaceDialogFlags.combine = false
  workspaceDialogFlags.transform = false
}
