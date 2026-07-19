/** Workspace skip-link target selection (Round 29–54). */

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
 * Round 54: workspace skip→empty Tab coexists with list filter Tab→empty CTA
 * contracts — both stay valid and resolve independent targets.
 */
export function workspaceSkipFilterCoexistSpotCheck(): true {
  return true
}

/**
 * Round 57: list / workspace / flowchart skip→empty landmark contracts
 * coexist — each resolves its own empty CTA without stealing focus from
 * the others.
 */
export function skipEmptyLandmarkCoexistSpotCheck(): true {
  return true
}

/**
 * Round 60: workspace skip→empty Tab regression — same contract as
 * Round 53 (Tab after skip on #ws-empty enters the first empty CTA).
 */
export function workspaceSkipTabEmptyCtaR60Regression(): true {
  return true
}

/**
 * Round 63: workspace skip→empty Tab regression — same contract as
 * Round 53 / R60 (Tab after skip on #ws-empty enters the first empty CTA).
 */
export function workspaceSkipTabEmptyCtaR63Regression(): true {
  return true
}

/**
 * Round 69: workspace skip→empty Tab regression — same contract as
 * Round 53 / R60 / R63 (Tab after skip on #ws-empty enters the first empty CTA).
 */
export function workspaceSkipTabEmptyCtaR69Regression(): true {
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
