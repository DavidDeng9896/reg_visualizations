import { describe, expect, it } from 'vitest'
import { computeFloatingStyle } from '../../src/ui/floating'

describe('computeFloatingStyle', () => {
  const anchor = { top: 100, left: 200, bottom: 130, right: 280, width: 80, height: 30 } as DOMRect

  it('places bottom-start below the anchor', () => {
    const s = computeFloatingStyle(anchor, { width: 200, height: 120 }, 'bottom-start')
    expect(s.position).toBe('fixed')
    expect(Number.parseFloat(s.top)).toBeGreaterThanOrEqual(138)
    expect(Number.parseFloat(s.left)).toBe(200)
  })

  it('keeps panel inside the viewport horizontally', () => {
    const nearRight = { ...anchor, left: 900, right: 980, width: 80 } as DOMRect
    // jsdom window.innerWidth is typically 1024
    const s = computeFloatingStyle(nearRight, { width: 300, height: 100 }, 'bottom-start')
    expect(Number.parseFloat(s.left) + 300).toBeLessThanOrEqual(window.innerWidth)
  })

  it('matchAnchorWidth sets minWidth from anchor', () => {
    const s = computeFloatingStyle(anchor, { width: 0, height: 80 }, 'bottom-start', {
      matchAnchorWidth: true,
      minWidth: 40,
    })
    expect(s.minWidth).toBe('80px')
  })
})
