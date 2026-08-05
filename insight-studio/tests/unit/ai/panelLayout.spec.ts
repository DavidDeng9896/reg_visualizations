import { describe, expect, it, beforeEach, vi } from 'vitest'
import {
  PANEL_STORAGE_KEY,
  clampFloating,
  defaultLayout,
  dockedRect,
  readLayout,
  shouldDock,
  writeLayout,
} from '../../../src/modules/ai/panelLayout'

const store: Record<string, string> = {}

vi.stubGlobal('localStorage', {
  getItem: (k: string) => (k in store ? store[k] : null),
  setItem: (k: string, v: string) => {
    store[k] = String(v)
  },
  removeItem: (k: string) => {
    delete store[k]
  },
})

describe('panelLayout', () => {
  beforeEach(() => {
    for (const k of Object.keys(store)) delete store[k]
  })

  it('shouldDock when right edge near viewport', () => {
    expect(shouldDock({ x: 500, y: 48, w: 480 }, 1000)).toBe(true) // right=980, gap=20
    expect(shouldDock({ x: 100, y: 48, w: 480 }, 1000)).toBe(false)
  })

  it('clampFloating keeps panel in viewport', () => {
    const c = clampFloating({ x: -100, y: -10, w: 2000 }, { width: 800, height: 600 })
    expect(c.x).toBeGreaterThanOrEqual(8)
    expect(c.y).toBeGreaterThanOrEqual(8)
    expect(c.w).toBeLessThanOrEqual(800 - 16)
  })

  it('dockedRect sticks to right', () => {
    const r = dockedRect({ width: 1200, height: 800 }, 480)
    expect(r.x).toBe(1200 - 480)
    expect(r.y).toBe(48)
  })

  it('read/write roundtrip', () => {
    writeLayout({ mode: 'floating', floating: { x: 40, y: 60, w: 400 } })
    expect(store[PANEL_STORAGE_KEY]).toBeTruthy()
    const got = readLayout()
    expect(got.mode).toBe('floating')
    expect(got.floating).toEqual({ x: 40, y: 60, w: 400 })
  })

  it('readLayout falls back on garbage', () => {
    store[PANEL_STORAGE_KEY] = '{not-json'
    expect(readLayout()).toEqual(defaultLayout())
  })
})
