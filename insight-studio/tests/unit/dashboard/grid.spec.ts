import { describe, expect, it } from 'vitest'
import {
  applyLayoutToWidgets,
  clampWidget,
  compactVertical,
  findNextSlot,
  moveWithPush,
  resizeWithPush,
  widgetsToLayout,
} from '../../../src/modules/dashboard/grid'
import type { DashboardWidget } from '../../../src/shared/types'

function item(id: string, x: number, y: number, w = 4, h = 4) {
  return { id, x, y, w, h }
}

describe('dashboard grid (RGL-style push + compact)', () => {
  it('compacts vertically into gaps', () => {
    const out = compactVertical([item('a', 0, 0), item('b', 0, 8)])
    expect(out.find((l) => l.id === 'a')).toMatchObject({ x: 0, y: 0 })
    expect(out.find((l) => l.id === 'b')).toMatchObject({ x: 0, y: 4 })
  })

  it('findNextSlot packs left-to-right then down', () => {
    expect(findNextSlot([], 4, 4)).toEqual({ x: 0, y: 0, w: 4, h: 4 })
    expect(findNextSlot([{ id: 'a', grid: { x: 0, y: 0, w: 6, h: 4 } }], 6, 4)).toEqual({
      x: 6,
      y: 0,
      w: 6,
      h: 4,
    })
    expect(findNextSlot([{ id: 'a', grid: { x: 0, y: 0, w: 12, h: 4 } }], 6, 4)).toEqual({
      x: 0,
      y: 4,
      w: 6,
      h: 4,
    })
  })

  it('moveWithPush squeezes neighbors aside and compacts', () => {
    const layout = [item('a', 0, 0, 6, 4), item('b', 6, 0, 6, 4)]
    const out = moveWithPush(layout, 'a', 6, 0)
    const a = out.find((l) => l.id === 'a')!
    const b = out.find((l) => l.id === 'b')!
    expect(a.x).toBe(6)
    expect(a.y).toBe(0)
    // b pushed away from a's new seat
    expect(b.x !== 6 || b.y !== 0).toBe(true)
    expect(a.x + a.w <= 12).toBe(true)
    expect(b.x + b.w <= 12).toBe(true)
  })

  it('resizeWithPush grows and pushes neighbors', () => {
    const layout = [item('a', 0, 0, 4, 4), item('b', 4, 0, 4, 4)]
    const out = resizeWithPush(layout, 'a', 8, 4)
    const a = out.find((l) => l.id === 'a')!
    const b = out.find((l) => l.id === 'b')!
    expect(a.w).toBe(8)
    expect(b.x >= 8 || b.y >= a.h).toBe(true)
  })

  it('clampWidget respects column bounds', () => {
    expect(clampWidget({ x: -2, y: -1, w: 20, h: 0 })).toEqual({ x: 0, y: 0, w: 12, h: 4 })
  })

  it('round-trips widgets through layout helpers', () => {
    const widgets = [
      {
        id: 'w1',
        type: 'chart',
        title: 'A',
        grid: { x: 0, y: 0, w: 6, h: 4 },
        ref: { analysisId: 'a1', tableId: 't1', viewId: 'v1' },
      },
      {
        id: 'w2',
        type: 'table',
        title: 'B',
        grid: { x: 6, y: 0, w: 6, h: 4 },
        ref: { analysisId: 'a1', tableId: 't1' },
      },
    ] as DashboardWidget[]
    const layout = widgetsToLayout(widgets)
    const moved = moveWithPush(layout, 'w1', 6, 0)
    const next = applyLayoutToWidgets(widgets, moved)
    expect(next.find((w) => w.id === 'w1')!.grid.x).toBe(6)
    expect(next.every((w) => w.grid.x + w.grid.w <= 12)).toBe(true)
  })
})
