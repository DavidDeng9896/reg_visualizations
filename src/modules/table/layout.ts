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

/**
 * Polite live-region copy when the chart/table split ratio changes via
 * keyboard (or after drag). Keeps SR users in sync with flex-fill panes.
 */
export function splitRatioLiveText(ratio: number): string {
  const pct = Math.round(clampSplitRatio(ratio) * 100)
  return `图表区占比 ${pct}%`
}

/**
 * Round 122: double-click (or explicit reset) returns the chart/table
 * split to the default ratio — pairs with sidebar splitter reset UX.
 */
export function resetSplitRatio(): number {
  return DEFAULT_SPLIT_RATIO
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
