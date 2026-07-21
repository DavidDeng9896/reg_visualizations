import { describe, expect, it, beforeEach } from 'vitest'
import {
  clampSidebarWidth,
  DEFAULT_SIDEBAR_WIDTH,
  loadSidebarWidth,
  MAX_SIDEBAR_WIDTH,
  MIN_SIDEBAR_WIDTH,
  resetSidebarWidth,
  saveSidebarWidth,
  SIDEBAR_PANE_ID,
  WORKSPACE_MAIN_ID,
  sidebarSplitterAriaControls,
  sidebarSplitterAriaLabel,
  sidebarWidthLiveText,
} from '@/modules/sidebar/sidebarPrefs'
import { isSplitterResetKey } from '@/modules/table/layout'

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

  it('exposes stable pane ids and live text for sidebar splitter a11y (Round 121)', () => {
    expect(WORKSPACE_MAIN_ID).toBe('workspace-main')
    expect(SIDEBAR_PANE_ID).toBe('ws-sidebar-pane')
    expect(sidebarSplitterAriaControls()).toBe('workspace-main ws-sidebar-pane')
    expect(sidebarWidthLiveText(280)).toBe('侧栏宽度 280 像素')
    expect(sidebarWidthLiveText(10)).toBe(`侧栏宽度 ${MIN_SIDEBAR_WIDTH} 像素`)
    expect(sidebarWidthLiveText(9999)).toBe(`侧栏宽度 ${MAX_SIDEBAR_WIDTH} 像素`)
  })

  it('resets sidebar width to default for double-click UX (Round 122)', () => {
    expect(resetSidebarWidth()).toBe(DEFAULT_SIDEBAR_WIDTH)
    expect(resetSidebarWidth()).toBe(280)
  })

  it('exposes keyboard reset (0) parity with double-click in aria-label (Round 123)', () => {
    expect(isSplitterResetKey('0')).toBe(true)
    expect(sidebarSplitterAriaLabel()).toContain('按 0 恢复默认')
    expect(sidebarSplitterAriaLabel()).toContain('双击')
  })
})

