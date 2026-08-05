/** AI 对话窗停靠 / 悬浮几何与 localStorage。 */

export const PANEL_STORAGE_KEY = 'insight.ai.panel.v1'
export const DOCK_SNAP_PX = 24
export const VIEW_MARGIN = 8
export const HEADER_OFFSET = 48
export const DEFAULT_WIDTH = 480

export type PanelMode = 'docked' | 'floating'

export interface FloatingRect {
  x: number
  y: number
  w: number
}

export interface PanelLayoutState {
  mode: PanelMode
  floating: FloatingRect
}

export function defaultLayout(): PanelLayoutState {
  return {
    mode: 'docked',
    floating: { x: 0, y: HEADER_OFFSET, w: DEFAULT_WIDTH },
  }
}

export function clampFloating(
  rect: FloatingRect,
  viewport: { width: number; height: number },
): FloatingRect {
  const w = Math.min(Math.max(rect.w, 320), Math.max(320, viewport.width - VIEW_MARGIN * 2))
  const maxX = Math.max(VIEW_MARGIN, viewport.width - w - VIEW_MARGIN)
  const maxY = Math.max(VIEW_MARGIN, viewport.height - 200)
  return {
    w,
    x: Math.min(maxX, Math.max(VIEW_MARGIN, rect.x)),
    y: Math.min(maxY, Math.max(VIEW_MARGIN, rect.y)),
  }
}

/** 松手时是否应吸附为停靠（右缘靠近视口右）。 */
export function shouldDock(rect: FloatingRect, viewportWidth: number): boolean {
  const right = rect.x + rect.w
  return viewportWidth - right <= DOCK_SNAP_PX
}

export function readLayout(): PanelLayoutState {
  const base = defaultLayout()
  try {
    const raw = localStorage.getItem(PANEL_STORAGE_KEY)
    if (!raw) return base
    const parsed = JSON.parse(raw) as Partial<PanelLayoutState>
    const mode: PanelMode = parsed.mode === 'floating' ? 'floating' : 'docked'
    const f = parsed.floating ?? base.floating
    const floating: FloatingRect = {
      x: Number(f.x) || 0,
      y: Number(f.y) || HEADER_OFFSET,
      w: Number(f.w) || DEFAULT_WIDTH,
    }
    return { mode, floating }
  } catch {
    return base
  }
}

export function writeLayout(state: PanelLayoutState): void {
  try {
    localStorage.setItem(PANEL_STORAGE_KEY, JSON.stringify(state))
  } catch {
    /* ignore */
  }
}

/** 停靠态默认矩形（贴右）。 */
export function dockedRect(viewport: { width: number; height: number }, w = DEFAULT_WIDTH): FloatingRect {
  const width = Math.min(w, Math.max(320, viewport.width - VIEW_MARGIN * 2))
  return {
    x: Math.max(VIEW_MARGIN, viewport.width - width),
    y: HEADER_OFFSET,
    w: width,
  }
}
