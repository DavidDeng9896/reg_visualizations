import { describe, expect, it, beforeEach } from 'vitest'
import {
  clampSidebarWidth,
  DEFAULT_SIDEBAR_WIDTH,
  loadSidebarWidth,
  MAX_SIDEBAR_WIDTH,
  MIN_SIDEBAR_WIDTH,
  saveSidebarWidth,
} from '@/modules/sidebar/sidebarPrefs'

describe('sidebarPrefs', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('clamps width to min/max', () => {
    expect(clampSidebarWidth(10)).toBe(MIN_SIDEBAR_WIDTH)
    expect(clampSidebarWidth(9999)).toBe(MAX_SIDEBAR_WIDTH)
    expect(clampSidebarWidth(undefined)).toBe(DEFAULT_SIDEBAR_WIDTH)
  })

  it('persists and restores width', () => {
    saveSidebarWidth(320)
    expect(loadSidebarWidth()).toBe(320)
  })
})
