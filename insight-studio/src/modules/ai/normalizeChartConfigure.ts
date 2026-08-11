/**
 * 将模型常见的「错槽位」图表配置纠正为图种实际槽位，减少 set_chart_config 空转。
 * - line/scatter/bignumber：y → values[]
 * - bar/box：values[0] → y（若 y 空）
 * - 字符串简写字段 → { field }
 */
import type { ChartConfigure, FieldMapping } from '../../shared/types'

function asMapping(v: unknown): FieldMapping | undefined {
  if (!v) return undefined
  if (typeof v === 'string' && v.trim()) return { field: v.trim() }
  if (typeof v === 'object' && v !== null && 'field' in v) {
    const field = String((v as FieldMapping).field ?? '').trim()
    if (!field) return undefined
    return { ...(v as FieldMapping), field }
  }
  return undefined
}

function asMappingList(v: unknown): FieldMapping[] | undefined {
  if (v == null) return undefined
  if (!Array.isArray(v)) {
    const one = asMapping(v)
    return one ? [one] : undefined
  }
  const list = v.map(asMapping).filter((m): m is FieldMapping => !!m)
  return list.length ? list : undefined
}

const VALUES_TYPES = new Set(['line', 'scatter', 'bignumber'])
const Y_TYPES = new Set(['bar', 'box'])

/** 返回浅拷贝后的 configure，不修改入参。 */
export function normalizeAiChartConfigure(
  chartType: string,
  configure: Partial<ChartConfigure>,
): Partial<ChartConfigure> {
  const next: Partial<ChartConfigure> = { ...configure }

  for (const key of ['x', 'y', 'series', 'color', 'shape', 'size', 'categories', 'measure'] as const) {
    if (key in next) {
      const mapped = asMapping(next[key])
      if (mapped) next[key] = mapped
      else if (next[key] != null && typeof next[key] === 'string') delete next[key]
    }
  }
  if ('values' in next) {
    const list = asMappingList(next.values)
    if (list) next.values = list
    else delete next.values
  }

  const type = String(chartType || '')
  if (VALUES_TYPES.has(type)) {
    const hasValues = (next.values ?? []).some((m) => !!m?.field)
    if (!hasValues && next.y?.field) {
      next.values = [next.y]
      delete next.y
    }
  } else if (Y_TYPES.has(type)) {
    if (!next.y?.field && next.values?.[0]?.field) {
      next.y = next.values[0]
    }
  }

  return next
}
