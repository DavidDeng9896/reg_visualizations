import { describe, expect, it } from 'vitest'
import {
  isToolbarCompact,
  TOOLBAR_COMPACT_MAX_WIDTH,
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
})
