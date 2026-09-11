/**
 * 工具参数纠错：模型常把 configure 写成顶层数组，或省略 tableId。
 * 发往上游前 arguments 必须是 JSON 对象（数组会触发豆包 Invalid request body）。
 */

function isFieldMappingLike(v: unknown): boolean {
  return !!v && typeof v === 'object' && 'field' in (v as object)
}

/** 顶层数组 → 对象（按工具名语义）。 */
export function coerceArrayToolArgs(arr: unknown[], toolName?: string): Record<string, unknown> {
  if (toolName === 'submit_plan') return { steps: arr }
  if (toolName === 'mark_step_done' && arr.length === 1 && typeof arr[0] === 'number') {
    return { index: arr[0] }
  }
  if (arr.length && arr.every(isFieldMappingLike)) {
    return { configure: { values: arr } }
  }
  if (arr.every((x) => typeof x === 'string')) {
    if (toolName === 'submit_plan') return { steps: arr }
    return { steps: arr }
  }
  return {}
}

const CANONICAL_CHART_TYPES = new Set([
  'bar',
  'line',
  'scatter',
  'box',
  'pie',
  'heatmap',
  'bignumber',
])

/** 常见 EN/CN 同义词 → 规范图种（不含 table）。 */
const CHART_TYPE_SYNONYMS: Record<string, string> = {
  bar: 'bar',
  barchart: 'bar',
  'bar chart': 'bar',
  column: 'bar',
  columnchart: 'bar',
  'column chart': 'bar',
  柱状图: 'bar',
  柱形图: 'bar',
  条形图: 'bar',
  line: 'line',
  linechart: 'line',
  'line chart': 'line',
  折线图: 'line',
  线图: 'line',
  scatter: 'scatter',
  scatterplot: 'scatter',
  'scatter plot': 'scatter',
  'scatter chart': 'scatter',
  散点图: 'scatter',
  box: 'box',
  boxplot: 'box',
  'box plot': 'box',
  'box chart': 'box',
  箱线图: 'box',
  箱型图: 'box',
  盒须图: 'box',
  pie: 'pie',
  piechart: 'pie',
  'pie chart': 'pie',
  donut: 'pie',
  doughnut: 'pie',
  饼图: 'pie',
  圆环图: 'pie',
  heatmap: 'heatmap',
  'heat map': 'heatmap',
  heatmapchart: 'heatmap',
  热力图: 'heatmap',
  热图: 'heatmap',
  bignumber: 'bignumber',
  'big number': 'bignumber',
  'big-number': 'bignumber',
  kpi: 'bignumber',
  metric: 'bignumber',
  metrics: 'bignumber',
  指标卡: 'bignumber',
  大数字: 'bignumber',
  数字卡: 'bignumber',
}

/** 从错键 / 嵌套 / 同义词恢复规范 chartType；无法恢复时返回 undefined。 */
export function normalizeChartTypeToken(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined
  const s = raw.trim()
  if (!s) return undefined
  const lower = s.toLowerCase()
  if (CANONICAL_CHART_TYPES.has(lower)) return lower
  if (CHART_TYPE_SYNONYMS[s]) return CHART_TYPE_SYNONYMS[s]
  if (CHART_TYPE_SYNONYMS[lower]) return CHART_TYPE_SYNONYMS[lower]
  const compact = lower.replace(/[\s_-]+/g, '')
  if (CANONICAL_CHART_TYPES.has(compact)) return compact
  if (CHART_TYPE_SYNONYMS[compact]) return CHART_TYPE_SYNONYMS[compact]
  return undefined
}

const CHART_TYPE_ALIAS_KEYS = [
  'chartType',
  'type',
  'viewType',
  'chart_type',
  'chartKind',
  'kind',
] as const

function firstPresent(obj: Record<string, unknown>, keys: readonly string[]): unknown {
  for (const k of keys) {
    const v = obj[k]
    if (v != null && v !== '') return v
  }
  return undefined
}

/** 从 args / configure / chart 嵌套里挑图种候选（未规范化）。 */
export function pickRawChartTypeCandidate(args: Record<string, unknown>): unknown {
  const top = firstPresent(args, CHART_TYPE_ALIAS_KEYS)
  if (top != null) return top

  const cfg = args.configure
  if (cfg && typeof cfg === 'object' && !Array.isArray(cfg)) {
    const nested = firstPresent(cfg as Record<string, unknown>, CHART_TYPE_ALIAS_KEYS)
    if (nested != null) return nested
  }

  const chart = args.chart
  if (chart && typeof chart === 'object' && !Array.isArray(chart)) {
    const nested = firstPresent(chart as Record<string, unknown>, CHART_TYPE_ALIAS_KEYS)
    if (nested != null) return nested
  }

  return undefined
}

function hasMappedField(v: unknown): boolean {
  if (!v) return false
  if (typeof v === 'string') return !!v.trim()
  if (Array.isArray(v)) return v.some(hasMappedField)
  if (typeof v === 'object' && v !== null && 'field' in v) {
    return !!String((v as { field?: unknown }).field ?? '').trim()
  }
  return false
}

/**
 * 仅在 configure 形状唯一指向某图种时推断。规则：
 * 1. 有 size（仅 scatter 有该槽）→ scatter
 * 2. 有 values，且有 color/shape/size 之一（line 无这些槽）→ scatter
 * 3. 有 categories+measure，且无 x/y/values → pie
 *    （bignumber 虽可 categories，但模型配指标卡几乎总带 values；无 values 时按饼图处理）
 * 其余（如仅 x+y、仅 x+values）在 bar/box/line/scatter 间歧义，不推断。
 */
export function inferChartTypeFromConfigure(configure: unknown): string | undefined {
  if (!configure || typeof configure !== 'object' || Array.isArray(configure)) return undefined
  const c = configure as Record<string, unknown>
  const hasX = hasMappedField(c.x)
  const hasY = hasMappedField(c.y)
  const hasValues = hasMappedField(c.values) || hasMappedField(c.value) || hasMappedField(c.y_values)
  const hasColor = hasMappedField(c.color)
  const hasShape = hasMappedField(c.shape)
  const hasSize = hasMappedField(c.size)
  const hasCategories = hasMappedField(c.categories) || hasMappedField(c.category)
  const hasMeasure = hasMappedField(c.measure)

  if (hasSize) return 'scatter'
  if (hasValues && (hasColor || hasShape || hasSize)) return 'scatter'
  if (hasCategories && hasMeasure && !hasX && !hasY && !hasValues) return 'pie'

  return undefined
}

export const CREATE_CHART_TYPE_FAIL =
  'create_chart 需要 chartType（bar/line/scatter/box/pie/heatmap/bignumber）。示例：{"chartType":"scatter","configure":{"x":{"field":"col_x"},"values":[{"field":"col_y"}]}}'

/** 解析后的 args 再按工具名补全常见缺字段。 */
export function coerceParsedToolArgs(
  toolName: string,
  args: Record<string, unknown>,
): Record<string, unknown> {
  const next = { ...args }
  if (toolName === 'set_chart_config' || toolName === 'create_chart') {
    if (!next.configure && Array.isArray(next.values)) {
      next.configure = { values: next.values }
      delete next.values
    }
    if (!next.configure && Array.isArray(next.steps)) {
      next.configure = { values: next.steps }
      delete next.steps
    }
    if (typeof next.field === 'string' && next.field.trim() && !next.configure) {
      next.configure = { values: [{ field: next.field.trim() }] }
      delete next.field
    }

    if (toolName === 'create_chart') {
      const raw = pickRawChartTypeCandidate(next)
      let normalized = normalizeChartTypeToken(raw)
      if (!normalized || normalized === 'table') {
        const inferred = inferChartTypeFromConfigure(next.configure)
        if (inferred) normalized = inferred
      }
      if (normalized && normalized !== 'table') {
        next.chartType = normalized
      }
    } else if (typeof next.chartType === 'string' || typeof next.type === 'string') {
      const normalized = normalizeChartTypeToken(next.chartType ?? next.type)
      if (normalized) next.chartType = normalized
    }
  }
  return next
}
