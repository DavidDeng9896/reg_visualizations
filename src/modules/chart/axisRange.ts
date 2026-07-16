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

/**
 * 将 STYLE 轴 Range 配置转为 ECharts axis min/max。
 * Automatic 或不完整/无效 Manual（min≥max）时返回 undefined，由 ECharts 自动伸缩。
 */
export function axisExtent(input: AxisRangeInput): AxisExtent | undefined {
  if (input.mode !== 'manual') return undefined
  const out: AxisExtent = {}
  if (input.min != null && Number.isFinite(input.min)) out.min = input.min
  if (input.max != null && Number.isFinite(input.max)) out.max = input.max
  if (out.min == null && out.max == null) return undefined
  if (out.min != null && out.max != null && out.min >= out.max) return undefined
  return out
}
