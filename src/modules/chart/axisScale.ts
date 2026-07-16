import type { ViewType } from '@/shared/types/analysis'

export type AxisScale = 'linear' | 'log'

/** 图种是否开放轴 Scale（Linear/Log）；对齐 docs/features/charts/common.md */
export function supportsAxisScale(viewType: ViewType): boolean {
  return viewType === 'line' || viewType === 'scatter' || viewType === 'box' || viewType === 'bar'
}

/** ECharts 数值轴 type：linear → value，log → log */
export function echartsValueAxisType(scale?: AxisScale): 'value' | 'log' {
  return scale === 'log' ? 'log' : 'value'
}

/** 对数轴要求全部为正值 */
export function isLogScaleApplicable(values: number[]): boolean {
  if (!values.length) return false
  return values.every((v) => Number.isFinite(v) && v > 0)
}

/** 选择 Log 但数据含非正值时的提示文案 */
export function logScaleDataWarning(
  scale: AxisScale | undefined,
  values: number[],
): string | undefined {
  if (scale !== 'log') return undefined
  if (isLogScaleApplicable(values)) return undefined
  return '对数轴（Log）要求全部数据为正值；当前存在 ≤0 的点，已回退为线性轴。'
}
