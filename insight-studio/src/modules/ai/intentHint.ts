/**
 * 用户分析意图启发式：在进 agent loop 前注入短系统提示，
 * 减少「要出图却只聊天 / 选错图种 / 忽略复杂表头」类误判。
 * 非硬路由：只给模型目标线索，仍由工具循环执行。
 */

export type AnalysisIntentKind =
  | 'chart_compare'
  | 'chart_trend'
  | 'chart_correlate'
  | 'chart_distribution'
  | 'chart_share'
  | 'stat_infer'
  | 'transform_only'
  | 'explore'
  | 'unknown'

export interface AnalysisIntentHint {
  kind: AnalysisIntentKind
  chartTypes: string[]
  /** 注入 system 的短文；空串表示不注入。 */
  prompt: string
  reasons: string[]
}

const CHART_WORDS = /图|图表|可视化|出图|画|plot|chart|visuali[sz]/i
const COMPARE = /对比|比较|高低|排名|top\s*\d+|柱状|条形|bar\b/i
const TREND = /趋势|随时间|随剂量|折线|line\b|time\s*series|随.*变化/i
const CORRELATE = /相关|散点|scatter|vs\.?|versus|相关性|回归/i
const DIST = /分布|箱线|box\b|histogram|直方|离散/i
const SHARE = /占比|比例|pie|饼图|构成/i
const STAT = /p\s*值|显著性|anova|t\s*-?\s*test|ic50|ec50|auc\b|拟合|statlib|组间|剂量.?反应/i
const TRANSFORM = /清洗|过滤|派生|join|合并|只要表|不要图|别出图/i
const EXPLORE = /看看|概览|探索|分析一下|帮我分析|快速分析|总结数据/i

function uniq(xs: string[]): string[] {
  return [...new Set(xs)]
}

/** 从用户本轮文本推断分析意图（可测、可注入）。 */
export function inferAnalysisIntent(userText: string): AnalysisIntentHint {
  const text = (userText || '').trim()
  if (!text) {
    return { kind: 'unknown', chartTypes: [], prompt: '', reasons: ['empty'] }
  }

  const reasons: string[] = []
  const chartTypes: string[] = []
  let kind: AnalysisIntentKind = 'unknown'

  if (TRANSFORM.test(text) && !CHART_WORDS.test(text)) {
    kind = 'transform_only'
    reasons.push('transform')
  } else if (STAT.test(text)) {
    kind = 'stat_infer'
    reasons.push('stat')
    if (CORRELATE.test(text)) chartTypes.push('scatter')
    if (COMPARE.test(text)) chartTypes.push('bar')
  } else if (SHARE.test(text)) {
    kind = 'chart_share'
    chartTypes.push('pie')
    reasons.push('share')
  } else if (CORRELATE.test(text)) {
    kind = 'chart_correlate'
    chartTypes.push('scatter')
    reasons.push('correlate')
  } else if (TREND.test(text)) {
    kind = 'chart_trend'
    chartTypes.push('line')
    reasons.push('trend')
  } else if (DIST.test(text)) {
    kind = 'chart_distribution'
    chartTypes.push('box')
    reasons.push('distribution')
  } else if (COMPARE.test(text) || CHART_WORDS.test(text)) {
    kind = 'chart_compare'
    chartTypes.push('bar')
    reasons.push(COMPARE.test(text) ? 'compare' : 'chart')
  } else if (EXPLORE.test(text)) {
    kind = 'explore'
    chartTypes.push('bar', 'scatter')
    reasons.push('explore')
  }

  if (kind === 'unknown') {
    return { kind, chartTypes: [], prompt: '', reasons }
  }

  const goalLine =
    kind === 'transform_only'
      ? '用户目标偏数据加工，非明确要求时不要强行出图。'
      : kind === 'stat_infer'
        ? '用户要统计推断/拟合：优先 get_table_schema → 按需 read_skill(statlib-*) → Custom Code；辅以原生图展示结果。'
        : kind === 'explore'
          ? '用户要快速分析：先 schema，再选 1–2 张最能说明数据的图（对比或相关），给出简洁结论。'
          : `用户要可视化（意图=${kind}）。优先图种：${uniq(chartTypes).join('/') || '按数据自选'}。`

  const prompt = [
    '【本轮意图线索 — 必须遵守】',
    goalLine,
    '执行顺序：submit_plan（写清目标与图种）→ get_table_schema（使用返回的 field 精确名）→ 必要清洗 → create_chart 或 create_view+set_chart_config。',
    '复杂表头（空格、括号单位如 localStrain(kcal)、Dose (mg/kg)）必须以 schema 的 field 为准，禁止臆造列名。',
    '禁止只在正文提问而不调用工具；禁止配完图却不 mark_step_done。',
  ].join('\n')

  return { kind, chartTypes: uniq(chartTypes), prompt, reasons }
}
