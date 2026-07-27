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

function allCollisions(items: LayoutItem[], item: LayoutItem): LayoutItem[] {
  return items.filter((other) => other.id !== item.id && overlaps(other, item))
}

/**
 * 垂直紧凑：保留 x，把块尽量上推填缝。
 * `staticIds` 中的块钉死不动（拖拽中的活动块），其它块绕开它们。
 * 从 y=0 扫描下推，避免逐步 y-- 导致大坐标卡顿。
 */
export function compactVertical(
  items: LayoutItem[],
  columns = GRID_COLUMNS,
  staticIds?: ReadonlySet<string>,
): LayoutItem[] {
  const pinned = staticIds ?? new Set<string>()
  const pinnedItems = items
    .filter((it) => pinned.has(it.id))
    .map((it) => ({ id: it.id, ...clampWidget(it, columns) }))

  const compareWith: LayoutItem[] = [...pinnedItems]
  const moved: LayoutItem[] = []

  for (const raw of sortByRowCol(items)) {
    if (pinned.has(raw.id)) continue
    const item: LayoutItem = {
      id: raw.id,
      ...clampWidget({ ...raw, y: 0 }, columns),
    }
    let hit = firstCollision(compareWith, item)
    while (hit) {
      item.y = hit.y + hit.h
      hit = firstCollision(compareWith, item)
    }
    compareWith.push(item)
    moved.push(item)
  }

  const byId = new Map<string, LayoutItem>()
  for (const p of pinnedItems) byId.set(p.id, p)
  for (const m of moved) byId.set(m.id, m)
  return items.map((it) => byId.get(it.id)!).filter(Boolean)
}

/**
 * 拖拽中：把活动块钉在目标格，撞到的块往下挤，再只紧凑「非活动」块。
 * 这样上下拖动不会被紧凑吸回去，也不会把整页洗乱。
 */
export function moveWithPush(
  items: LayoutItem[],
  movingId: string,
  x: number,
  y: number,
  columns = GRID_COLUMNS,
  opts: { pinMover?: boolean } = {},
): LayoutItem[] {
  const pinMover = opts.pinMover !== false
  const layout = cloneItems(items)
  const moving = layout.find((it) => it.id === movingId)
  if (!moving) return layout

  const next = clampWidget({ ...moving, x, y }, columns)
  moving.x = next.x
  moving.y = next.y

  // 把碰撞块（及连锁）推到活动块下方
  const maxIter = Math.max(8, layout.length * 6)
  for (let iter = 0; iter < maxIter; iter += 1) {
    const hits = allCollisions(layout, moving)
    if (!hits.length) {
      // 非活动块之间也可能互撞
      let cascaded = false
      for (const a of sortByRowCol(layout)) {
        if (a.id === movingId) continue
        let hit = firstCollision(
          layout.filter((o) => o.id !== a.id),
          a,
        )
        while (hit) {
          a.y = hit.y + hit.h
          cascaded = true
          hit = firstCollision(
            layout.filter((o) => o.id !== a.id),
            a,
          )
        }
      }
      if (!cascaded) break
      continue
    }
    for (const other of hits) {
      other.y = moving.y + moving.h
    }
  }

  if (pinMover) {
    return compactVertical(layout, columns, new Set([movingId]))
  }
  return compactVertical(layout, columns)
}

/** 调整大小：钉住当前块，挤开碰撞后紧凑邻居。 */
export function resizeWithPush(
  items: LayoutItem[],
  resizingId: string,
  w: number,
  h: number,
  columns = GRID_COLUMNS,
  opts: { pinMover?: boolean } = {},
): LayoutItem[] {
  const pinMover = opts.pinMover !== false
  const layout = cloneItems(items)
  const item = layout.find((it) => it.id === resizingId)
  if (!item) return layout
  const next = clampWidget({ ...item, w, h }, columns)
  item.w = next.w
  item.h = next.h

  for (const other of layout) {
    if (other.id === resizingId) continue
    if (overlaps(item, other)) other.y = item.y + item.h
  }

  if (pinMover) {
    return compactVertical(layout, columns, new Set([resizingId]))
  }
  return compactVertical(layout, columns)
}

/** 松手后：取消钉住，全量垂直紧凑。 */
export function finalizeLayout(items: LayoutItem[], columns = GRID_COLUMNS): LayoutItem[] {
  return compactVertical(items, columns)
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

export function layoutsEqual(a: LayoutItem[], b: LayoutItem[]): boolean {
  if (a.length !== b.length) return false
  const map = new Map(b.map((l) => [l.id, l]))
  return a.every((l) => {
    const o = map.get(l.id)
    return !!o && o.x === l.x && o.y === l.y && o.w === l.w && o.h === l.h
  })
}
