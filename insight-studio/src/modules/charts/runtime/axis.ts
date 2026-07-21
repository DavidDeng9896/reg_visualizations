/**
 * 轴解析：label / range(auto-manual) / scale(linear-log)。
 * Log 轴遇非正值 → 警告并回退 linear。
 */
import type { AxisStyleSpec } from '../../../shared/types'

export interface ResolvedAxis {
  type: 'value' | 'log'
  name?: string
  min?: number
  max?: number
  nameGap?: number
}

/**
 * @param spec 轴样式设置（可空）
 * @param dataMin 该轴数据最小值（判断 log 合法性）
 * @param defaultName 默认轴标题（聚合前缀 + 字段名）
 * @param warnings 警告收集器
 * @param axisLabel 警告文案里的轴名（如 'Y 轴'）
 */
export function resolveAxis(
  spec: AxisStyleSpec | undefined,
  dataMin: number,
  defaultName: string | undefined,
  warnings: string[],
  axisLabel: string,
): ResolvedAxis {
  let scale = spec?.scale ?? 'linear'
  if (scale === 'log' && dataMin <= 0) {
    warnings.push(`${axisLabel}包含非正值，Log 轴已回退为 Linear`)
    scale = 'linear'
  }
  const resolved: ResolvedAxis = {
    type: scale === 'log' ? 'log' : 'value',
    name: spec?.label ?? defaultName,
    nameGap: 14,
  }
  if (spec?.range === 'manual') {
    if (spec.min !== undefined) resolved.min = spec.min
    if (spec.max !== undefined) resolved.max = spec.max
  }
  return resolved
}

/** 计算一组数值的最小值（空 → Infinity，调用方注意）。 */
export function dataMinOf(values: number[]): number {
  return values.length ? Math.min(...values) : Number.POSITIVE_INFINITY
}
