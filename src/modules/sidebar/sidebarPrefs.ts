const SIDEBAR_WIDTH_KEY = 'ia.sidebarWidth'

export const DEFAULT_SIDEBAR_WIDTH = 280
export const MIN_SIDEBAR_WIDTH = 200
export const MAX_SIDEBAR_WIDTH = 480

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
