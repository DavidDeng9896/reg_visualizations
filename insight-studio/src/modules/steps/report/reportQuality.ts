/**
 * 报告内容质量门：占位套话 / caption+解读 / 可解析 id / think 泄漏。
 * 供 create_report_step、update_report_step 与后续 reportAiStore 复用。
 * scaffold→draft 允许不过门；宣称 done 时必须通过。
 */
import type { Analysis, AnalysisReport, ReportSection, ReportTemplateId } from '../../../shared/types'
import { findView } from '../../../shared/tree'

export type ReportQualityCode =
  | 'placeholder'
  | 'caption'
  | 'interpretation'
  | 'unresolvable_id'
  | 'think_leak'
  | 'empty_conclusion'
  | 'empty_title'

export interface ReportQualityIssue {
  code: ReportQualityCode
  message: string
  sectionId?: string
}

/** 与 report-format-common / 脚手架禁止语对齐。 */
export const PLACEHOLDER_PATTERNS: RegExp[] = [
  /待完善/,
  /后续由\s*AI/,
  /请结合[^。\n]{0,40}综合评估/,
  /请结合[^。\n]{0,60}列出/,
  /可由\s*AI\s*根据/,
  /建议先创建关键可视化/,
  /尚未生成内容/,
]

const THINK_LEAK_RE = /<\/?think>|<\/?thinking>|tool_calls\s*[:=]|\[\s*\{\s*"role"\s*:\s*"tool"/i

export function formatSkillIdForTemplate(templateId: ReportTemplateId | string): string {
  const id = String(templateId || 'research').trim() || 'research'
  return `report-format-${id}`
}

function collectText(report: AnalysisReport): string[] {
  const parts: string[] = [report.title, report.subtitle ?? '', report.conclusion ?? '']
  for (const s of report.sections) {
    if (s.title) parts.push(s.title)
    if (s.body) parts.push(s.body)
    if (s.caption) parts.push(s.caption)
    if (s.items?.length) parts.push(...s.items)
  }
  return parts.filter((p) => p.trim().length > 0)
}

function nextInterpretation(sections: ReportSection[], from: number): ReportSection | null {
  for (let i = from + 1; i < sections.length; i++) {
    const s = sections[i]
    if (s.kind === 'divider') continue
    if (s.kind === 'paragraph') return s
    return null
  }
  return null
}

function resolveChartOrTable(
  section: ReportSection,
  analysis: Analysis,
): ReportQualityIssue | null {
  if (section.kind !== 'chart' && section.kind !== 'table') return null

  if (section.kind === 'chart' && section.chartId) {
    const ok = (analysis.charts ?? []).some((c) => c.id === section.chartId)
    if (!ok) {
      return {
        code: 'unresolvable_id',
        message: `chartId「${section.chartId}」在当前分析中不存在`,
        sectionId: section.id,
      }
    }
    return null
  }

  const tableId = section.tableId?.trim()
  if (!tableId) {
    return {
      code: 'unresolvable_id',
      message: `${section.kind} 节缺少 tableId（或 chartId）`,
      sectionId: section.id,
    }
  }
  const table = analysis.tables.find((t) => t.id === tableId)
  if (!table) {
    return {
      code: 'unresolvable_id',
      message: `tableId「${tableId}」在当前分析中不存在`,
      sectionId: section.id,
    }
  }

  if (section.kind === 'chart') {
    const viewId = section.viewId?.trim()
    if (!viewId) {
      return {
        code: 'unresolvable_id',
        message: `chart 节缺少 viewId（或改用 chartId）`,
        sectionId: section.id,
      }
    }
    if (!findView(table.views, viewId)) {
      return {
        code: 'unresolvable_id',
        message: `viewId「${viewId}」在表「${table.name}」中不存在`,
        sectionId: section.id,
      }
    }
  }
  return null
}

/** 返回全部质量问题（draft 可忽略；done 须为空）。 */
export function assessReportQuality(
  report: AnalysisReport,
  analysis: Analysis,
): ReportQualityIssue[] {
  const issues: ReportQualityIssue[] = []

  if (!report.title?.trim()) {
    issues.push({ code: 'empty_title', message: '报告标题不能为空' })
  }
  if (!report.conclusion?.trim()) {
    issues.push({ code: 'empty_conclusion', message: '结论（conclusion）不能为空' })
  }

  for (const text of collectText(report)) {
    if (THINK_LEAK_RE.test(text)) {
      issues.push({
        code: 'think_leak',
        message: '报告正文含 think 标签或工具日志，禁止写入报告',
      })
      break
    }
  }

  for (const text of collectText(report)) {
    for (const re of PLACEHOLDER_PATTERNS) {
      if (re.test(text)) {
        issues.push({
          code: 'placeholder',
          message: `报告仍含脚手架占位套话（匹配 /${re.source}/）`,
        })
        break
      }
    }
    if (issues.some((i) => i.code === 'placeholder')) break
  }

  const sections = report.sections ?? []
  for (let i = 0; i < sections.length; i++) {
    const s = sections[i]
    if (s.kind !== 'chart' && s.kind !== 'table') continue

    if (!s.caption?.trim()) {
      issues.push({
        code: 'caption',
        message: `${s.kind}「${s.title || s.id}」缺少非空 caption`,
        sectionId: s.id,
      })
    }

    const interp = nextInterpretation(sections, i)
    if (!interp || !interp.body?.trim()) {
      issues.push({
        code: 'interpretation',
        message: `${s.kind}「${s.title || s.id}」后须紧跟非空解读 paragraph`,
        sectionId: s.id,
      })
    }

    const idIssue = resolveChartOrTable(s, analysis)
    if (idIssue) issues.push(idIssue)
  }

  return issues
}

export function assertReportDone(
  report: AnalysisReport,
  analysis: Analysis,
): { ok: true } | { ok: false; summary: string; issues: ReportQualityIssue[] } {
  const issues = assessReportQuality(report, analysis)
  if (!issues.length) return { ok: true }
  const lines = issues.map((i) => `- [${i.code}] ${i.message}`)
  return {
    ok: false,
    issues,
    summary: `报告未通过内容质量门（宣称 done 被拒绝）：\n${lines.join('\n')}`,
  }
}
