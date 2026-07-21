import type { ChartPosition } from '@/shared/types/analysis'

/** 窄屏左右布局降级阈值（需求 L-05） */
export const NARROW_LAYOUT_BREAKPOINT = 900

export const DEFAULT_SPLIT_RATIO = 0.45
export const MIN_SPLIT_RATIO = 0.2
export const MAX_SPLIT_RATIO = 0.8

export function clampSplitRatio(ratio: number | undefined): number {
  const r = typeof ratio === 'number' && Number.isFinite(ratio) ? ratio : DEFAULT_SPLIT_RATIO
  return Math.min(MAX_SPLIT_RATIO, Math.max(MIN_SPLIT_RATIO, r))
}

/** Stable pane ids for splitter `aria-controls` (Round 120 — flex-fill follow-up). */
export const CHART_PANE_ID = 'ws-chart-pane' as const
export const TABLE_PANE_ID = 'ws-table-pane' as const

/** Space-separated ids for the separator's `aria-controls`. */
export function splitterAriaControls(): string {
  return `${CHART_PANE_ID} ${TABLE_PANE_ID}`
}

export type SplitterOrientation = 'horizontal' | 'vertical'

export type SplitLiveOpts = {
  /** Effective splitter orientation after L-05 may have stacked left/right. */
  orientation?: SplitterOrientation
  /** True when left/right was degraded to top/bottom (需求 L-05). */
  degraded?: boolean
}

/**
 * Polite live-region copy when the chart/table split ratio changes via
 * keyboard (or after drag). Keeps SR users in sync with flex-fill panes.
 *
 * Round 107: when L-05 has stacked a side-by-side layout, prefix the
 * percentage so SR users know Up/Down (not Left/Right) now resize.
 */
export function splitRatioLiveText(ratio: number, opts?: SplitLiveOpts): string {
  const pct = Math.round(clampSplitRatio(ratio) * 100)
  const base = `图表区占比 ${pct}%`
  if (opts?.degraded) return `窄屏上下排列，${base}`
  if (opts?.orientation === 'horizontal') return `上下分割，${base}`
  if (opts?.orientation === 'vertical') return `左右分割，${base}`
  return base
}

/**
 * Round 107: polite live copy when the viewport crosses the L-05
 * breakpoint and left/right is temporarily stacked.
 */
export function layoutDegradedLiveText(configured: ChartPosition): string {
  if (configured === 'left') {
    return '窄屏下左右布局已改为上下排列（图在上），分割条可用上下方向键调整'
  }
  if (configured === 'right') {
    return '窄屏下左右布局已改为上下排列（图在下），分割条可用上下方向键调整'
  }
  return '窄屏下布局已改为上下排列，分割条可用上下方向键调整'
}

/**
 * Round 122: double-click (or explicit reset) returns the chart/table
 * split to the default ratio — pairs with sidebar splitter reset UX.
 */
export function resetSplitRatio(): number {
  return DEFAULT_SPLIT_RATIO
}

/**
 * Round 123: keyboard parity with double-click reset — pressing `0` on a
 * focused splitter restores the default size (Home/End remain min/max).
 */
export function isSplitterResetKey(key: string): boolean {
  return key === '0'
}

/**
 * Accessible label for the chart/table splitter (Round 122–123).
 * Round 107: orientation-aware wording after L-05 stacks left/right.
 */
export function chartSplitterAriaLabel(opts?: SplitLiveOpts): string {
  if (opts?.degraded || opts?.orientation === 'horizontal') {
    return '拖拽调整上下表图占比，双击或按 0 恢复默认'
  }
  if (opts?.orientation === 'vertical') {
    return '拖拽调整左右表图占比，双击或按 0 恢复默认'
  }
  return '拖拽调整表图占比，双击或按 0 恢复默认'
}

/**
 * 窄屏下将 left/right 降级为 top/bottom，避免表/图不可用。
 * left → top，right → bottom，保持「图相对表」的主次关系。
 */
export function effectiveChartPosition(
  position: ChartPosition,
  viewportWidth: number,
  breakpoint = NARROW_LAYOUT_BREAKPOINT,
): { position: ChartPosition; degraded: boolean } {
  if (viewportWidth < breakpoint && (position === 'left' || position === 'right')) {
    return {
      position: position === 'left' ? 'top' : 'bottom',
      degraded: true,
    }
  }
  return { position, degraded: false }
}
