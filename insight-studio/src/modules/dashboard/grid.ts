import type { DashboardWidget, DashboardWidgetGrid } from '../../shared/types'

export const GRID_COLUMNS = 12
export const MIN_WIDGET_W = 2
export const MIN_WIDGET_H = 4

/** 将 grid 夹到合法范围。 */
export function clampWidget(grid: DashboardWidgetGrid, columns = GRID_COLUMNS): DashboardWidgetGrid {
  const w = Math.max(MIN_WIDGET_W, Math.min(columns, Math.round(grid.w)))
  const h = Math.max(MIN_WIDGET_H, Math.round(grid.h))
  const x = Math.max(0, Math.min(columns - w, Math.round(grid.x)))
  const y = Math.max(0, Math.round(grid.y))
  return { x, y, w, h }
}

function overlaps(a: DashboardWidgetGrid, b: DashboardWidgetGrid): boolean {
  return !(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y)
}

/** 在现有 widgets 下方找可放置的下一个空位（简单扫描）。 */
export function findNextSlot(
  widgets: Pick<DashboardWidget, 'grid'>[],
  w: number,
  h: number,
  columns = GRID_COLUMNS,
): DashboardWidgetGrid {
  const want = clampWidget({ x: 0, y: 0, w, h }, columns)
  let y = 0
  // 限制扫描深度，避免无限循环
  const maxY = widgets.reduce((m, x) => Math.max(m, x.grid.y + x.grid.h), 0) + 64
  while (y <= maxY) {
    for (let x = 0; x <= columns - want.w; x += 1) {
      const candidate = { x, y, w: want.w, h: want.h }
      if (!widgets.some((item) => overlaps(item.grid, candidate))) {
        return candidate
      }
    }
    y += 1
  }
  return { x: 0, y: maxY, w: want.w, h: want.h }
}

export function moveWidget(
  grid: DashboardWidgetGrid,
  dx: number,
  dy: number,
  columns = GRID_COLUMNS,
): DashboardWidgetGrid {
  return clampWidget({ ...grid, x: grid.x + dx, y: grid.y + dy }, columns)
}

export function resizeWidget(
  grid: DashboardWidgetGrid,
  dw: number,
  dh: number,
  columns = GRID_COLUMNS,
): DashboardWidgetGrid {
  return clampWidget({ ...grid, w: grid.w + dw, h: grid.h + dh }, columns)
}
