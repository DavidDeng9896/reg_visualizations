import type { DashboardWidget, DashboardWidgetGrid } from '../../shared/types'

export const GRID_COLUMNS = 12
export const MIN_WIDGET_W = 2
export const MIN_WIDGET_H = 4

/** 布局项：带稳定 id，供挤压/紧凑算法使用。 */
export interface LayoutItem extends DashboardWidgetGrid {
  id: string
}

/** 将 grid 夹到合法范围。 */
export function clampWidget(grid: DashboardWidgetGrid, columns = GRID_COLUMNS): DashboardWidgetGrid {
  const w = Math.max(MIN_WIDGET_W, Math.min(columns, Math.round(grid.w)))
  const h = Math.max(MIN_WIDGET_H, Math.round(grid.h))
  const x = Math.max(0, Math.min(columns - w, Math.round(grid.x)))
  const y = Math.max(0, Math.round(grid.y))
  return { x, y, w, h }
}

export function overlaps(a: DashboardWidgetGrid, b: DashboardWidgetGrid): boolean {
  return !(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y)
}

function cloneItems(items: LayoutItem[]): LayoutItem[] {
  return items.map((it) => ({ ...it }))
}

function sortByRowCol(items: LayoutItem[]): LayoutItem[] {
  return items.slice().sort((a, b) => (a.y === b.y ? a.x - b.x : a.y - b.y))
}

function firstCollision(items: LayoutItem[], item: LayoutItem): LayoutItem | undefined {
  return items.find((other) => other.id !== item.id && overlaps(other, item))
}

/**
 * 垂直紧凑（React-Grid-Layout 默认策略）：
 * 按行优先排序后，尽量上移填缝，遇碰撞则下推到碰撞块下方。
 */
export function compactVertical(items: LayoutItem[], columns = GRID_COLUMNS): LayoutItem[] {
  const compareWith: LayoutItem[] = []
  for (const raw of sortByRowCol(items)) {
    const item = { ...clampWidget(raw, columns), id: raw.id }
    // 尽量上移
    while (item.y > 0) {
      item.y -= 1
      if (firstCollision(compareWith, item)) {
        item.y += 1
        break
      }
    }
    // 下推直到不撞
    let hit = firstCollision(compareWith, item)
    while (hit) {
      item.y = hit.y + hit.h
      hit = firstCollision(compareWith, item)
    }
    compareWith.push(item)
  }
  return compareWith
}

/**
 * 将 movingId 移到 (x,y)，并把挡住的块向下挤开，再垂直紧凑。
 * 主流看板（Grafana / RGL）默认交互。
 */
export function moveWithPush(
  items: LayoutItem[],
  movingId: string,
  x: number,
  y: number,
  columns = GRID_COLUMNS,
): LayoutItem[] {
  const layout = cloneItems(items)
  const moving = layout.find((it) => it.id === movingId)
  if (!moving) return layout

  const next = clampWidget({ ...moving, x, y }, columns)
  moving.x = next.x
  moving.y = next.y

  // 迭代把碰撞块往下推（最多 2*n 轮，避免死循环）
  const maxIter = Math.max(8, layout.length * 4)
  for (let i = 0; i < maxIter; i += 1) {
    let moved = false
    for (const other of layout) {
      if (other.id === movingId) continue
      if (!overlaps(moving, other)) continue
      other.y = moving.y + moving.h
      moved = true
    }
    // 连锁碰撞：被推开的块之间也可能互撞 → 再紧凑一轮局部
    if (!moved) break
    for (const a of sortByRowCol(layout)) {
      if (a.id === movingId) continue
      let hit = firstCollision(
        layout.filter((x) => x.id !== a.id),
        a,
      )
      while (hit) {
        a.y = hit.y + hit.h
        hit = firstCollision(
          layout.filter((x) => x.id !== a.id),
          a,
        )
      }
    }
  }

  return compactVertical(layout, columns)
}

/** 调整大小后挤压并紧凑。 */
export function resizeWithPush(
  items: LayoutItem[],
  resizingId: string,
  w: number,
  h: number,
  columns = GRID_COLUMNS,
): LayoutItem[] {
  const layout = cloneItems(items)
  const item = layout.find((it) => it.id === resizingId)
  if (!item) return layout
  const next = clampWidget({ ...item, w, h }, columns)
  item.w = next.w
  item.h = next.h
  // 把正下方被挡住的块挤开
  for (const other of layout) {
    if (other.id === resizingId) continue
    if (overlaps(item, other)) other.y = item.y + item.h
  }
  return compactVertical(layout, columns)
}

/** 在现有 widgets 下方找可放置的下一个空位（紧凑布局后扫描）。 */
export function findNextSlot(
  widgets: Pick<DashboardWidget, 'id' | 'grid'>[],
  w: number,
  h: number,
  columns = GRID_COLUMNS,
): DashboardWidgetGrid {
  const items = compactVertical(
    widgets.map((x) => ({ id: x.id, ...x.grid })),
    columns,
  )
  const want = clampWidget({ x: 0, y: 0, w, h }, columns)
  let y = 0
  const maxY = items.reduce((m, x) => Math.max(m, x.y + x.h), 0) + 64
  while (y <= maxY) {
    for (let x = 0; x <= columns - want.w; x += 1) {
      const candidate = { id: '__new__', x, y, w: want.w, h: want.h }
      if (!items.some((item) => overlaps(item, candidate))) {
        return { x, y, w: want.w, h: want.h }
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

export function widgetsToLayout(widgets: DashboardWidget[]): LayoutItem[] {
  return widgets.map((w) => ({ id: w.id, ...w.grid }))
}

export function applyLayoutToWidgets(
  widgets: DashboardWidget[],
  layout: LayoutItem[],
): DashboardWidget[] {
  const byId = new Map(layout.map((l) => [l.id, l]))
  return widgets.map((w) => {
    const l = byId.get(w.id)
    if (!l) return w
    return { ...w, grid: { x: l.x, y: l.y, w: l.w, h: l.h } }
  })
}
