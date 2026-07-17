import type { ViewType } from '@/shared/types/analysis'

/** Error bars：Bar / Scatter / Box；Line 不提供（common.md §2.4） */
export function errorBarsAppliesTo(viewType: ViewType): boolean {
  return viewType === 'bar' || viewType === 'scatter' || viewType === 'box'
}

/** 仅当度量为 Mean 聚合时可用 */
export function errorBarsAvailableForAggregation(aggregation?: string): boolean {
  return (aggregation || 'mean') === 'mean'
}

export function errorBarsHint(viewType: ViewType, aggregation?: string): string {
  if (!errorBarsAppliesTo(viewType)) {
    if (viewType === 'line') {
      return 'Line 不提供误差棒（common.md §2.4）。'
    }
    if (viewType === 'pie') {
      return '误差棒不适用于饼图。'
    }
    if (viewType === 'heatmap') {
      return '误差棒不适用于热力图。'
    }
    return '当前视图不适用误差棒。'
  }
  if (!errorBarsAvailableForAggregation(aggregation)) {
    return '误差棒仅在聚合为 Mean 时可用；请先将聚合改为 Mean，或选择 None。'
  }
  return '可选 None / SD / SEM；仅 Bar、Scatter、Box 且聚合为 Mean 时生效。'
}
