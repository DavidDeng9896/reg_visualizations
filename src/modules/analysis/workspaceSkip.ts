/** Workspace skip-link target selection (Round 29+31). */

/**
 * `#sidebar-empty` stays a complementary landmark (routeFocus-protected) but is
 * not a workspace skip target — skip must land in main content, not the aside.
 */
export function includeSidebarEmptyInWorkspaceSkip(): boolean {
  return false
}

export function workspaceSkipHref(opts: {
  mode: 'flowchart' | 'workspace'
  flowchartEmpty: boolean
  workspaceEmpty: boolean
  /** Accepted for call-site clarity; never redirects skip to the sidebar. */
  sidebarEmpty?: boolean
}): string {
  // sidebarEmpty is intentionally ignored — skip stays on main content.
  if (opts.mode === 'flowchart' && opts.flowchartEmpty) return '#flow-empty'
  if (opts.mode === 'workspace' && opts.workspaceEmpty) return '#ws-empty'
  return '#workspace-main'
}
