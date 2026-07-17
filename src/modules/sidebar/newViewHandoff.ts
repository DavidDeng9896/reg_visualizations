/** New-view dialog defaults + focus restore for workspace → sidebar handoff (Round 30). */

import type { ViewType } from '@/shared/types/analysis'

export function newViewDialogDefaults(opts: { tableId: string; parentId: string }): {
  tableId: string
  parentId: string
  name: string
  viewType: ViewType
} {
  return {
    tableId: opts.tableId,
    parentId: opts.parentId,
    name: 'New view',
    viewType: 'table',
  }
}

/** Prefer an explicit restore target (e.g. the New view CTA) over whatever currently has focus. */
export function resolveNewViewRestoreFocus(
  explicit: HTMLElement | null | undefined,
  doc: Document = document,
): HTMLElement | null {
  if (explicit && doc.contains(explicit)) return explicit
  return doc.activeElement instanceof HTMLElement ? doc.activeElement : null
}

/**
 * After successful create, never restore the opener CTA — it may unmount
 * (e.g. no-views hint). Prefer the new tree node; else workspace main.
 */
export type AfterCreateFocus = 'tree-node' | 'workspace-main'

export function resolveAfterCreateFocus(opts: {
  createdNodeId: string | null
}): AfterCreateFocus {
  if (opts.createdNodeId) return 'tree-node'
  return 'workspace-main'
}
