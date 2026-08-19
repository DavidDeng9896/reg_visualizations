import { describe, expect, it } from 'vitest'
import {
  dashboardCanvasVisible,
  dashboardEmptyStateVisible,
  dashboardLoadingOverlayVisible,
} from '../../../src/modules/dashboard/canvasVisibility'

describe('看板画布显隐', () => {
  it('空看板加载中不盖住即将出现的画布，也不闪空态', () => {
    expect(dashboardCanvasVisible({ hasCurrent: true, widgetCount: 0, loading: true })).toBe(false)
    expect(dashboardEmptyStateVisible({ hasCurrent: true, widgetCount: 0, loading: true })).toBe(false)
  })

  it('添加第一个组件后立即显示画布，即使仍在保存/加载', () => {
    expect(dashboardCanvasVisible({ hasCurrent: true, widgetCount: 1, loading: true })).toBe(true)
    expect(dashboardEmptyStateVisible({ hasCurrent: true, widgetCount: 1, loading: true })).toBe(false)
    expect(dashboardLoadingOverlayVisible({ hasCurrent: true, loading: true })).toBe(false)
  })

  it('尚未选中看板时才用全屏加载层', () => {
    expect(dashboardLoadingOverlayVisible({ hasCurrent: false, loading: true })).toBe(true)
    expect(dashboardLoadingOverlayVisible({ hasCurrent: true, loading: true })).toBe(false)
  })

  it('首次进入看板路由、current 未就绪时显示骨架，避免闪空白/空态', () => {
    expect(dashboardLoadingOverlayVisible({ hasCurrent: false, loading: false, booting: true })).toBe(true)
    expect(dashboardLoadingOverlayVisible({ hasCurrent: true, loading: false, booting: true })).toBe(false)
    expect(dashboardLoadingOverlayVisible({ hasCurrent: false, loading: false, booting: false })).toBe(false)
  })
})
