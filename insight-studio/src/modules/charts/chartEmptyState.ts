/**
 * 主区空图 / 坏轴检测：映射校验通过但仍无可见墨迹，或散点绑了分类轴。
 * 供 ChartView 空态门控使用（与 AI emptyChartViews 清理门控配合，不替代侧栏文案）。
 */
import type { ChartConfig, ColumnMeta, DataType, FieldMapping } from '../../shared/types'
import type { ChartOption } from './types'

const CATEGORICAL: ReadonlySet<DataType> = new Set(['string', 'boolean'])

/** Plotly traces 是否含至少一个可见数据点。 */
export function chartOptionHasVisiblePoints(option: ChartOption | null | undefined): boolean {
  const data = option?.data
  if (!Array.isArray(data) || data.length === 0) return false
  for (const trace of data) {
    if (!trace || typeof trace !== 'object') continue
    const t = trace as Record<string, unknown>
    for (const key of ['x', 'y', 'z', 'values', 'labels'] as const) {
      const v = t[key]
      if (Array.isArray(v) && v.length > 0) return true
    }
    // pie 等可能用 value 标量
    if (typeof t.value === 'number' && Number.isFinite(t.value)) return true
  }
  return false
}

/**
 * 散点 X（或唯一连续轴）绑了分类列时返回字段名；否则 null。
 * 预渲染门控：分类当连续轴会丢掉全部点，轴刻度怪异。
 */
export function scatterCategoryAxisField(
  config: ChartConfig | null | undefined,
  columns: ColumnMeta[],
): string | null {
  if (!config || config.chartType !== 'scatter') return null
  const xField = config.configure.x?.field
  if (!xField) return null
  const col = columns.find((c) => c.field === xField)
  if (!col) return null
  if (CATEGORICAL.has(col.dataType)) return xField
  return null
}

export function categoryScatterWarning(field: string): string {
  return `「${field}」是分类，散点图通常不合适。建议改用柱状图。`
}

/**
 * 空图门控「改用柱状图」：scatter 常用 aggregation=none，迁到 bar 后 none 不出柱。
 * 有 y 字段且聚合为 none/空时改为 sum；其余原样返回（同引用）。
 */
export function yMappingForBarAfterScatterSwitch(
  y: FieldMapping | undefined,
): FieldMapping | undefined {
  if (y?.field && (!y.aggregation || y.aggregation === 'none')) {
    return { ...y, aggregation: 'sum' }
  }
  return y
}

/** 主区空图文案（Lumen UX P0）。 */
export const EMPTY_CHART_COPY = {
  title: '没有画出可用数据',
  body: '这张图的字段映射可能不合适，或数据点未能显示。',
  openConfigure: '打开图表配置',
  keepScatter: '仍用散点',
  switchBar: '改用柱状图',
  aiSidebarNote: 'AI 侧栏显示已完成，但主区未看到图时，以这里为准。',
} as const

/**
 * 映射已齐但主区应显示空图/坏轴提示。
 * - 分类散点：预渲染即可提示
 * - 或已构建但无可见点
 */
export function shouldShowEmptyChartGate(opts: {
  requiredMissing: boolean
  categoryField: string | null
  option: ChartOption | null | undefined
  hasBuilt: boolean
}): boolean {
  if (opts.requiredMissing) return false
  if (opts.categoryField) return true
  if (!opts.hasBuilt) return false
  return !chartOptionHasVisiblePoints(opts.option)
}
