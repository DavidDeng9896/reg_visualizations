/** 当前分析上下文构建：表结构/样例行/步骤图摘要 + @引用块。 */
import type { Analysis, AnalysisTable } from '../../shared/types'
import { CONTEXT_HEADER } from './prompts'

function tableBrief(t: AnalysisTable, withSample = true): string {
  const cols = t.columns.map((c) => `${c.title}(${c.dataType})`).join('、')
  const lines = [`- 「${t.name}」(id: ${t.id}) ${t.rows.length} 行 × ${t.columns.length} 列：${cols}`]
  if (withSample && t.rows.length) {
    const sample = t.rows.slice(0, 3).map((r) => `  ${t.columns.map((c) => String(r[c.field] ?? '')).join(' | ')}`)
    lines.push(...sample)
  }
  if (t.views.length) {
    lines.push(`  视图：${t.views.map((v) => `「${v.name}」(${v.type}, id: ${v.id})`).join('、')}`)
  }
  return lines.join('\n')
}

/** 当前分析的简要上下文（注入第一轮）。 */
export function buildAnalysisContext(analysis: Analysis | null): string {
  if (!analysis) return `${CONTEXT_HEADER}\n当前没有打开的分析。可用 list_analyses 查看全部分析，或用 create_analysis 新建。`
  const steps = analysis.steps.length
    ? `步骤图：${analysis.steps.map((s) => `「${s.name}」(${s.type}, ${s.status}, id: ${s.id})`).join(' → ')}`
    : '步骤图：暂无步骤'
  return [
    CONTEXT_HEADER,
    `当前分析：「${analysis.name}」(id: ${analysis.id}${analysis.project ? `，项目 ${analysis.project}` : ''})`,
    steps,
    '表：',
    ...analysis.tables.slice(0, 6).map((t) => tableBrief(t)),
  ].join('\n')
}

import type { AttachmentKind } from './attachments'

/** @ 引用的上下文块类型。 */
export type MentionTarget =
  | { kind: 'analysis' }
  | { kind: 'table'; tableId: string }
  | { kind: 'view'; tableId: string; viewId: string }
  | { kind: 'attachment'; fileId: string; name?: string; fileKind?: AttachmentKind }

/** 生成 @ 引用的补充上下文文本。无分析时仍可处理附件引用。 */
export function buildMentionContext(analysis: Analysis | null, targets: MentionTarget[]): string {
  if (!targets.length) return ''
  const parts: string[] = []
  for (const target of targets) {
    if (target.kind === 'attachment') {
      const label = target.name?.trim() || target.fileId
      parts.push(`用户特别引用了附件「${label}」(id: ${target.fileId})。`)
      continue
    }
    if (!analysis) continue
    if (target.kind === 'analysis') {
      parts.push(`用户特别引用了整个分析「${analysis.name}」。`)
    } else if (target.kind === 'table') {
      const t = analysis.tables.find((x) => x.id === target.tableId)
      if (t) parts.push(`用户特别引用了表：\n${tableBrief(t)}`)
    } else if (target.kind === 'view') {
      const t = analysis.tables.find((x) => x.id === target.tableId)
      const v = t?.views.find((x) => x.id === target.viewId)
      if (t && v) {
        parts.push(
          `用户特别引用了视图「${v.name}」(${v.type}, id: ${v.id})，所属表「${t.name}」${v.chart ? `，当前配置：${JSON.stringify({ configure: v.chart.configure, style: v.chart.style }).slice(0, 600)}` : ''}`,
        )
      }
    }
  }
  return parts.join('\n')
}
