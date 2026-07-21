const SIDEBAR_WIDTH_KEY = 'ia.sidebarWidth'

export const DEFAULT_SIDEBAR_WIDTH = 280
export const MIN_SIDEBAR_WIDTH = 200
export const MAX_SIDEBAR_WIDTH = 480

/** Stable pane ids for sidebar splitter `aria-controls` (Round 121). */
export const WORKSPACE_MAIN_ID = 'workspace-main' as const
export const SIDEBAR_PANE_ID = 'ws-sidebar-pane' as const

/** Space-separated ids for the sidebar separator's `aria-controls`. */
export function sidebarSplitterAriaControls(): string {
  return `${WORKSPACE_MAIN_ID} ${SIDEBAR_PANE_ID}`
}

/**
 * Polite live-region copy when the sidebar width changes via keyboard
 * (or after drag). Mirrors chart/table splitter a11y from Round 120.
 */
export function sidebarWidthLiveText(width: number): string {
  return `侧栏宽度 ${clampSidebarWidth(width)} 像素`
}

/**
 * Round 122: double-click (or explicit reset) returns the sidebar to the
 * default width — mirrors chart/table splitter reset UX.
 */
export function resetSidebarWidth(): number {
  return DEFAULT_SIDEBAR_WIDTH
}

export function clampSidebarWidth(width: number | undefined): number {
  const w = typeof width === 'number' && Number.isFinite(width) ? width : DEFAULT_SIDEBAR_WIDTH
  return Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, Math.round(w)))
}

export function loadSidebarWidth(): number {
  if (typeof localStorage === 'undefined') return DEFAULT_SIDEBAR_WIDTH
  try {
    const raw = localStorage.getItem(SIDEBAR_WIDTH_KEY)
    if (!raw) return DEFAULT_SIDEBAR_WIDTH
    return clampSidebarWidth(Number(raw))
  } catch {
    return DEFAULT_SIDEBAR_WIDTH
  }
}

export function saveSidebarWidth(width: number): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, String(clampSidebarWidth(width)))
  } catch {
    /* ignore quota / private mode */
  }
}
