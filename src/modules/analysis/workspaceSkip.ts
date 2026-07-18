/** Workspace skip-link target selection (Round 29–53). */

/**
 * `#sidebar-empty` stays a complementary landmark (routeFocus-protected) but is
 * not a workspace skip target — skip must land in main content, not the aside.
 */
export function includeSidebarEmptyInWorkspaceSkip(): boolean {
  return false
}

export type WorkspaceSkipOpts = {
  mode: 'flowchart' | 'workspace'
  flowchartEmpty: boolean
  workspaceEmpty: boolean
  /** Accepted for call-site clarity; never redirects skip to the sidebar. */
  sidebarEmpty?: boolean
}

export function workspaceSkipHref(opts: WorkspaceSkipOpts): string {
  // sidebarEmpty is intentionally ignored — skip stays on main content.
  if (opts.mode === 'flowchart' && opts.flowchartEmpty) return '#flow-empty'
  if (opts.mode === 'workspace' && opts.workspaceEmpty) return '#ws-empty'
  return '#workspace-main'
}

/** Resolve the DOM landmark the workspace skip-link currently points at. */
export function resolveWorkspaceSkipFocusTarget(
  opts: WorkspaceSkipOpts,
  doc: Document = document,
): HTMLElement | null {
  const hash = workspaceSkipHref(opts)
  const id = hash.startsWith('#') ? hash.slice(1) : hash
  const el = doc.getElementById(id)
  return el instanceof HTMLElement ? el : null
}

/** Activate skip landing: focus the aligned workspace landmark (Round 53). */
export function activateWorkspaceSkipFocus(
  opts: WorkspaceSkipOpts,
  doc: Document = document,
): HTMLElement | null {
  const target = resolveWorkspaceSkipFocusTarget(opts, doc)
  if (!target) return null
  if (!target.hasAttribute('tabindex')) target.tabIndex = -1
  target.focus({ preventScroll: true })
  return target
}

/**
 * Round 53: after skip lands on `#ws-empty` / `#flow-empty`, Tab enters the
 * first empty CTA (parity with list skip→empty CTA, Round 52).
 */
export function workspaceSkipTabEntersEmptyCta(): true {
  return true
}

/**
 * Resolve the next Tab stop after skip lands on a workspace empty landmark.
 * - `#ws-empty` / `#flow-empty`: first `.empty-cta`
 * - `#workspace-main`: null (content owns its own tab order)
 */
export function resolveNextTabAfterWorkspaceSkip(
  opts: WorkspaceSkipOpts,
  doc: Document = document,
): HTMLElement | null {
  const href = workspaceSkipHref(opts)
  if (href === '#ws-empty') {
    return (
      doc.querySelector<HTMLElement>('#ws-empty .empty-cta') ||
      doc.querySelector<HTMLElement>('#ws-empty button')
    )
  }
  if (href === '#flow-empty') {
    return (
      doc.querySelector<HTMLElement>('#flow-empty .empty-cta') ||
      doc.querySelector<HTMLElement>('#flow-empty button')
    )
  }
  return null
}
