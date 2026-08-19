/**
 * 内置报告模板：科研通用 / 抗体筛选 / 数据复盘。
 * 根据当前分析脚手架生成「图+说明+解读」结构，供 AI 再润色。
 */
import type {
  Analysis,
  AnalysisReport,
  AnalysisTable,
  ReportSection,
  ReportTemplateId,
  ViewNode,
} from '../../../shared/types'
import { uuid } from '../../../shared/id'
import { nowIso } from '../../../shared/datetime'

export interface ReportTemplateMeta {
  id: ReportTemplateId
  label: string
  description: string
}

export const REPORT_TEMPLATES: ReportTemplateMeta[] = [
  {
    id: 'research',
    label: '科研通用',
    description: '目标与范围 → 数据概况 → 关键发现（图+解读）→ 结论与下一步',
  },
  {
    id: 'antibody',
    label: '抗体候选筛选',
    description: '筛选目标 → 数据概况 → 动力学/表达量图表解读 → 候选推荐与结论',
  },
  {
    id: 'dashboard-review',
    label: '数据复盘',
    description: '复盘范围 → 指标与视图一览 → 逐图解读 → 行动项',
  },
]

function sec(partial: Omit<ReportSection, 'id'> & { id?: string }): ReportSection {
  return { id: partial.id ?? uuid(), ...partial }
}

function chartViewsOf(t: AnalysisTable): ViewNode[] {
  const out: ViewNode[] = []
  const walk = (nodes: ViewNode[]) => {
    for (const v of nodes) {
      if (v.type !== 'table' && v.chart) out.push(v)
      if (v.children?.length) walk(v.children)
    }
  }
  walk(t.views)
  return out
}

function tableCaption(t: AnalysisTable): string {
  const fields = t.columns
    .slice(0, 8)
    .map((c) => c.title || c.field)
    .join('、')
  const more = t.columns.length > 8 ? ` 等 ${t.columns.length} 列` : ''
  return `表「${t.name}」共 ${t.rows.length} 行 × ${t.columns.length} 列；主要字段：${fields}${more}。`
}

function chartCaption(t: AnalysisTable, v: ViewNode): string {
  const typeLabel: Record<string, string> = {
    bar: '柱状图',
    line: '折线图',
    scatter: '散点图',
    box: '箱线图',
    pie: '饼图',
    heatmap: '热图',
    bignumber: '指标卡',
  }
  const kind = typeLabel[v.type] ?? v.type
  return `图「${v.name}」：基于表「${t.name}」的${kind}（${t.rows.length} 个数据点）。`
}

function chartInterpretation(t: AnalysisTable, v: ViewNode, templateId: ReportTemplateId): string {
  const cfg = v.chart?.configure
  const x = cfg?.x?.field ?? cfg?.categories?.field
  const y =
    cfg?.values?.[0]?.field ??
    cfg?.y?.field ??
    cfg?.measure?.field ??
    cfg?.color?.field
  const axes = [x && `X=${x}`, y && `Y=${y}`].filter(Boolean).join('，')
  if (templateId === 'antibody') {
    return `本图展示「${v.name}」相关分布${axes ? `（${axes}）` : ''}。请结合 KD、表达量与可开发性指标综合评估候选；后续可由 AI 根据实际数值改写本节。`
  }
  if (templateId === 'dashboard-review') {
    return `视图「${v.name}」对应业务指标一览${axes ? `（${axes}）` : ''}。复盘时关注异常点、趋势拐点与分组差异；可据此提出行动项。`
  }
  return `上图「${v.name}」反映表「${t.name}」中的关键关系${axes ? `（${axes}）` : ''}。下文结论应引用本图中的主要模式（趋势、聚类或离群点）。`
}

function collectFindings(analysis: Analysis, templateId: ReportTemplateId): ReportSection[] {
  const out: ReportSection[] = []
  let fig = 1
  for (const t of analysis.tables) {
    const charts = chartViewsOf(t)
    for (const v of charts) {
      out.push(
        sec({
          kind: 'chart',
          title: `图 ${fig}. ${v.name}`,
          tableId: t.id,
          viewId: v.id,
          caption: chartCaption(t, v),
        }),
      )
      out.push(
        sec({
          kind: 'paragraph',
          title: `图 ${fig} 解读`,
          body: chartInterpretation(t, v, templateId),
        }),
      )
      fig += 1
    }
  }
  for (const ch of analysis.charts ?? []) {
    out.push(
      sec({
        kind: 'chart',
        title: `图 ${fig}. ${ch.name}`,
        chartId: ch.id,
        caption: `图「${ch.name}」：Custom Code 产出的 Python 图（只读）。`,
      }),
    )
    out.push(
      sec({
        kind: 'paragraph',
        title: `图 ${fig} 解读`,
        body: `上图「${ch.name}」由 Python（plotly）绘制，用于原生图种无法表达的可视化。请结合 Custom Code 输出表解读图形。`,
      }),
    )
    fig += 1
  }
  // 无图时仍挂上主要表，保证报告不空
  if (!out.length) {
    for (const t of analysis.tables.slice(0, 4)) {
      out.push(
        sec({
          kind: 'table',
          title: `表 · ${t.name}`,
          tableId: t.id,
          caption: tableCaption(t),
        }),
      )
      out.push(
        sec({
          kind: 'paragraph',
          title: `表「${t.name}」说明`,
          body: `该表含 ${t.rows.length} 行。建议先创建关键可视化（散点/柱状/指标卡），再由 AI 充实解读。`,
        }),
      )
    }
  }
  return out
}

function dataOverviewBullets(analysis: Analysis): string[] {
  if (!analysis.tables.length) return ['当前分析尚无数据表。']
  return analysis.tables.map(
    (t) =>
      `「${t.name}」：${t.rows.length} 行 × ${t.columns.length} 列；视图 ${t.views.length} 个`,
  )
}

/** 按模板从分析脚手架生成完整报告（可被 AI 再写）。 */
export function scaffoldReportFromAnalysis(
  analysis: Analysis,
  templateId: ReportTemplateId = 'research',
  titleHint?: string,
): AnalysisReport {
  const title =
    titleHint?.trim() ||
    (templateId === 'antibody'
      ? `${analysis.name} · 抗体候选筛选报告`
      : templateId === 'dashboard-review'
        ? `${analysis.name} · 数据复盘报告`
        : `${analysis.name} · 分析报告`)

  const subtitle =
    templateId === 'antibody'
      ? '动力学 / 表达量 / 可开发性综合评估'
      : templateId === 'dashboard-review'
        ? '指标回顾与行动建议'
        : '数据分析结果与结论'

  const goalBody =
    templateId === 'antibody'
      ? `本报告围绕分析「${analysis.name}」整理抗体发现相关结果，目标是筛选进入下一轮构建的候选克隆，并说明关键动力学与表达量证据。`
      : templateId === 'dashboard-review'
        ? `本报告复盘分析「${analysis.name}」中的关键视图与指标，总结本期发现并提出可执行的下一步。`
        : `本报告基于分析「${analysis.name}」自动汇总数据范围、关键可视化与阶段性结论，便于存档与评审。`

  const findingsHeading =
    templateId === 'antibody' ? '关键发现与候选证据' : templateId === 'dashboard-review' ? '视图解读' : '关键发现'

  const conclusion =
    templateId === 'antibody'
      ? '（待完善）请根据 KD 区间、表达量与质量过滤结果，列出 Top N 候选 clone_id 及进入细胞构建的理由。'
      : templateId === 'dashboard-review'
        ? '（待完善）请归纳本期主要结论，并列出 2–5 条可落地的行动项与负责人/时间建议。'
        : '（待完善）请用 3–5 句话总结主要发现、局限与下一步实验或分析计划。'

  const sections: ReportSection[] = [
    sec({ kind: 'heading', title: '分析目标与数据范围' }),
    sec({ kind: 'paragraph', title: '目标', body: goalBody }),
    sec({ kind: 'heading', title: '数据概况' }),
    sec({ kind: 'bullets', title: '表与视图', items: dataOverviewBullets(analysis) }),
    sec({ kind: 'divider' }),
    sec({ kind: 'heading', title: findingsHeading }),
    ...collectFindings(analysis, templateId),
  ]

  // 抗体模板额外加一张「候选表」占位（若有表）
  if (templateId === 'antibody' && analysis.tables[0]) {
    const t = analysis.tables[0]
    sections.push(sec({ kind: 'divider' }))
    sections.push(sec({ kind: 'heading', title: '候选一览' }))
    sections.push(
      sec({
        kind: 'table',
        title: `主表 · ${t.name}`,
        tableId: t.id,
        caption: tableCaption(t),
      }),
    )
    sections.push(
      sec({
        kind: 'paragraph',
        title: '候选说明',
        body: '请结合上表字段（如 clone_id、KD、表达量、纯度等）列出推荐排序；AI 可自动生成 Top N 与理由。',
      }),
    )
  }

  return {
    title,
    subtitle,
    generatedAt: nowIso(),
    theme: 'research',
    templateId,
    sections,
    conclusion,
  }
}

export function resolveTemplateId(raw: unknown): ReportTemplateId {
  const id = String(raw ?? '').trim()
  if (id === 'antibody' || id === 'dashboard-review' || id === 'research') return id
  return 'research'
}
