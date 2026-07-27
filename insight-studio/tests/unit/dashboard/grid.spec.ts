import { describe, expect, it } from 'vitest'
import { clampWidget, findNextSlot, moveWidget, resizeWidget } from '../../../src/modules/dashboard/grid'

describe('clampWidget', () => {
  it('夹紧超出列宽', () => {
    expect(clampWidget({ x: 10, y: -1, w: 6, h: 2 })).toEqual({ x: 6, y: 0, w: 6, h: 4 })
  })
})

describe('findNextSlot', () => {
  it('空画布从原点开始', () => {
    expect(findNextSlot([], 6, 8)).toEqual({ x: 0, y: 0, w: 6, h: 8 })
  })
  it('避开已有块', () => {
    const slot = findNextSlot([{ grid: { x: 0, y: 0, w: 6, h: 8 } }], 6, 8)
    expect(slot).toEqual({ x: 6, y: 0, w: 6, h: 8 })
  })
  it('第一行满则换行', () => {
    const slot = findNextSlot(
      [
        { grid: { x: 0, y: 0, w: 6, h: 8 } },
        { grid: { x: 6, y: 0, w: 6, h: 8 } },
      ],
      6,
      8,
    )
    expect(slot.y).toBeGreaterThanOrEqual(8)
    expect(slot.w).toBe(6)
  })
})

describe('moveWidget / resizeWidget', () => {
  it('移动并夹紧', () => {
    expect(moveWidget({ x: 0, y: 0, w: 6, h: 8 }, 10, 1)).toEqual({ x: 6, y: 1, w: 6, h: 8 })
  })
  it('缩放尊重最小尺寸', () => {
    expect(resizeWidget({ x: 0, y: 0, w: 6, h: 8 }, -10, -10)).toEqual({ x: 0, y: 0, w: 2, h: 4 })
  })
})
