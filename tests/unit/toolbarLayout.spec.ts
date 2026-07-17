import { describe, expect, it } from 'vitest'
import {
  isToolbarCompact,
  TOOLBAR_COMPACT_MAX_WIDTH,
  TOOLBAR_VIEW_TYPE_WIDTH,
  TOOLBAR_VIEW_TYPE_WIDTH_COMPACT,
  toolbarViewTypeSelectWidth,
} from '@/modules/table/toolbarLayout'

describe('toolbarLayout', () => {
  it('exposes a compact breakpoint for narrow toolbars', () => {
    expect(TOOLBAR_COMPACT_MAX_WIDTH).toBe(720)
  })

  it('treats widths at or below the breakpoint as compact', () => {
    expect(isToolbarCompact(720)).toBe(true)
    expect(isToolbarCompact(480)).toBe(true)
    expect(isToolbarCompact(721)).toBe(false)
    expect(isToolbarCompact(1200)).toBe(false)
  })

  it('tightens view-type select width in compact toolbar', () => {
    expect(TOOLBAR_VIEW_TYPE_WIDTH).toBe(150)
    expect(TOOLBAR_VIEW_TYPE_WIDTH_COMPACT).toBe(112)
    expect(toolbarViewTypeSelectWidth(false)).toBe(150)
    expect(toolbarViewTypeSelectWidth(true)).toBe(112)
  })
})
