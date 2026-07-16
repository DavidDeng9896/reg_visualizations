/** STYLE 轴 Range：Automatic / Manual(min/max)（docs/features/charts/common.md） */

export interface AxisRangeInput {
  mode?: 'auto' | 'manual'
  min?: number
  max?: number
}

export interface AxisExtent {
  min?: number
  max?: number
}

/** Manual 且同时给出有限 min/max 且 min≥max 时视为无效（编辑态即时提示用）。 */
export function isManualRangeInvalid(input: AxisRangeInput): boolean {
  if (input.mode !== 'manual') return false
  const min = input.min
  const max = input.max
  if (min == null || max == null) return false
  if (!Number.isFinite(min) || !Number.isFinite(max)) return false
  return min >= max
}

/**
 * 将 STYLE 轴 Range 配置转为 ECharts axis min/max。
 * Automatic 或不完整/无效 Manual（min≥max）时返回 undefined，由 ECharts 自动伸缩。
 */
export function axisExtent(input: AxisRangeInput): AxisExtent | undefined {
  if (input.mode !== 'manual') return undefined
  if (isManualRangeInvalid(input)) return undefined
  const out: AxisExtent = {}
  if (input.min != null && Number.isFinite(input.min)) out.min = input.min
  if (input.max != null && Number.isFinite(input.max)) out.max = input.max
  if (out.min == null && out.max == null) return undefined
  return out
}
