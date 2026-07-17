import { describe, expect, it } from 'vitest'
import {
  sidebarEmptyCopy,
  sidebarEmptyCtaAria,
  sidebarEmptyKind,
  sidebarEmptyRegionAttrs,
} from '@/modules/sidebar/sidebarEmpty'

describe('sidebarEmpty', () => {
  it('returns null when visible nodes exist', () => {
    expect(sidebarEmptyKind({ tableCount: 2, query: '', visibleCount: 3 })).toBeNull()
  })

  it('uses no-data when analysis has no tables', () => {
    expect(sidebarEmptyKind({ tableCount: 0, query: '', visibleCount: 0 })).toBe('no-data')
    expect(sidebarEmptyKind({ tableCount: 0, query: 'x', visibleCount: 0 })).toBe('no-data')
  })

  it('uses no-match when tables exist but search filters all out', () => {
    expect(sidebarEmptyKind({ tableCount: 2, query: 'zzz', visibleCount: 0 })).toBe('no-match')
  })

  it('exposes a focusable empty landmark', () => {
    expect(sidebarEmptyRegionAttrs()).toEqual({
      id: 'sidebar-empty',
      tabindex: -1,
      role: 'region',
      'aria-label': '侧栏数据引导',
    })
  })

  it('provides distinct copy and CTA aria for no-data vs no-match', () => {
    expect(sidebarEmptyCopy('no-data').title).toMatch(/导入|开始/)
    expect(sidebarEmptyCopy('no-match').title).toMatch(/无匹配|未找到/)
    expect(sidebarEmptyCtaAria('csv')).toBe('从侧栏空态导入 CSV')
    expect(sidebarEmptyCtaAria('combine')).toBe('从侧栏空态合并表')
    expect(sidebarEmptyCtaAria('clear')).toBe('清除侧栏搜索以显示全部')
  })
})
