/**
 * 图例与主图防重叠：根据 DOM 矩形计算应对哪一侧加 margin。
 * 返回 null 表示无重叠或无法判定。
 */
export type LegendClearanceSide = 't' | 'r' | 'b' | 'l'

export interface RectLike {
  left: number
  right: number
  top: number
  bottom: number
  width: number
  height: number
}

export function overlapAmount(a: RectLike, b: RectLike): number {
  const x = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left))
  const y = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top))
  return x * y
}

/** 图例相对主图的主要侵入方向与建议增量（px）。 */
export function suggestLegendClearance(
  legend: RectLike,
  plot: RectLike,
  pad = 8,
): { side: LegendClearanceSide; delta: number } | null {
  if (legend.width <= 0 || legend.height <= 0) return null
  if (overlapAmount(legend, plot) <= 0) return null

  const overlapLeft = Math.min(legend.right, plot.right) - Math.max(legend.left, plot.left)
  const overlapTop = Math.min(legend.bottom, plot.bottom) - Math.max(legend.top, plot.top)
  if (overlapLeft <= 0 || overlapTop <= 0) return null

  // 图例中心相对主图中心，决定推哪一侧边距
  const lx = (legend.left + legend.right) / 2
  const ly = (legend.top + legend.bottom) / 2
  const px = (plot.left + plot.right) / 2
  const py = (plot.top + plot.bottom) / 2
  const dx = lx - px
  const dy = ly - py

  if (Math.abs(dx) >= Math.abs(dy)) {
    // 左右侵入：用重叠宽度
    const delta = Math.ceil(overlapLeft + pad)
    return { side: dx >= 0 ? 'r' : 'l', delta }
  }
  const delta = Math.ceil(overlapTop + pad)
  return { side: dy >= 0 ? 'b' : 't', delta }
}

/** 在现有 margin 上叠加 clearance（有上限，避免小画布被吃光）。 */
export function applyLegendClearanceMargin(
  margin: { t?: number; r?: number; b?: number; l?: number },
  clearance: { side: LegendClearanceSide; delta: number },
  caps: { t?: number; r?: number; b?: number; l?: number } = {},
): Record<string, number> {
  const next = {
    t: margin.t ?? 0,
    r: margin.r ?? 0,
    b: margin.b ?? 0,
    l: margin.l ?? 0,
  }
  const capDefault = { t: 160, r: 220, b: 160, l: 220 }
  const side = clearance.side
  const cap = caps[side] ?? capDefault[side]
  next[side] = Math.min(cap, Math.max(next[side], next[side] + clearance.delta))
  return next
}
