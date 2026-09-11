/**
 * 分析报告：默认文档、校验、科研主题 HTML 渲染。
 */
import type { Analysis, AnalysisReport, ReportSection, ReportTemplateId } from '../../../shared/types'
import { uuid } from '../../../shared/id'
import { nowIso } from '../../../shared/datetime'
import { reportThemePageClass, resolveReportTheme, resolveTemplateId } from './reportTemplates'

export function emptyReport(title = '分析报告', templateId: ReportTemplateId = 'research'): AnalysisReport {
  return {
    title,
    subtitle: '',
    generatedAt: nowIso(),
    theme: templateId,
    templateId,
    sections: [
      {
        id: uuid(),
        kind: 'paragraph',
        title: '摘要',
        body: '（尚未生成内容。可使用 AI 辅助根据当前分析撰写报告，或选择内置模板脚手架。）',
      },
    ],
    conclusion: '',
  }
}

export function readReportConfig(config: Record<string, unknown>): AnalysisReport {
  const raw = config.report
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const r = raw as Partial<AnalysisReport>
    const base = emptyReport(String(r.title ?? '分析报告'))
    return {
      title: String(r.title ?? '分析报告'),
      subtitle: r.subtitle ? String(r.subtitle) : '',
      generatedAt: String(r.generatedAt ?? nowIso()),
      // theme ↔ templateId 1:1；优先 templateId（旧数据常把 theme 写死为 research）
      templateId: resolveTemplateId(r.templateId ?? r.theme),
      theme: resolveReportTheme(r.templateId ?? r.theme),
      sections: Array.isArray(r.sections) ? (r.sections as ReportSection[]) : base.sections,
      conclusion: r.conclusion ? String(r.conclusion) : '',
    }
  }
  return emptyReport()
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function paragraphs(body: string): string {
  return body
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${escapeHtml(p).replace(/\n/g, '<br/>')}</p>`)
    .join('\n')
}

/** 科研主题 CSS（预览与打印共用）。 */
export const RESEARCH_REPORT_CSS = `
:root {
  --rp-ink: #1a1d21;
  --rp-muted: #5c6570;
  --rp-line: #d8dde3;
  --rp-paper: #fbfbf9;
  --rp-accent: #1f4e79;
  --rp-accent-soft: #e8eef5;
}
* { box-sizing: border-box; }
body {
  margin: 0;
  background: var(--rp-paper);
  color: var(--rp-ink);
  font-family: "Source Sans 3", "IBM Plex Sans", "Noto Sans SC", "PingFang SC", sans-serif;
  font-size: 15px;
  line-height: 1.65;
}
.rp {
  max-width: 820px;
  margin: 0 auto;
  padding: 48px 40px 64px;
}
.rp__header {
  border-bottom: 2px solid var(--rp-accent);
  padding-bottom: 20px;
  margin-bottom: 32px;
}
.rp__kicker {
  font-size: 11px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--rp-accent);
  font-weight: 600;
  margin: 0 0 10px;
}
.rp__title {
  font-family: "Source Serif 4", "IBM Plex Serif", "Noto Serif SC", "Songti SC", Georgia, serif;
  font-size: 28px;
  font-weight: 650;
  line-height: 1.25;
  margin: 0 0 8px;
  color: var(--rp-ink);
}
.rp__subtitle {
  margin: 0;
  color: var(--rp-muted);
  font-size: 14px;
}
.rp__meta {
  margin-top: 12px;
  font-size: 12px;
  color: var(--rp-muted);
}
.rp__section { margin: 28px 0; }
.rp__h2 {
  font-family: "Source Serif 4", "IBM Plex Serif", "Noto Serif SC", Georgia, serif;
  font-size: 18px;
  font-weight: 650;
  margin: 0 0 12px;
  color: var(--rp-accent);
}
.rp__body p { margin: 0 0 12px; }
.rp__ul {
  margin: 0;
  padding-left: 1.25em;
}
.rp__ul li { margin: 4px 0; }
.rp__figure {
  margin: 16px 0 8px;
  padding: 12px;
  background: var(--rp-accent-soft);
  border: 1px solid var(--rp-line);
  border-radius: 2px;
}
.rp__figure-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--rp-accent);
  margin: 0 0 4px;
}
.rp__embed-img {
  display: block;
  width: 100%;
  max-width: 100%;
  height: auto;
  background: #fff;
  border: 1px solid var(--rp-line);
}
.rp__embed-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
  background: #fff;
}
.rp__embed-table th,
.rp__embed-table td {
  border: 1px solid var(--rp-line);
  padding: 4px 8px;
  text-align: left;
  vertical-align: top;
}
.rp__embed-table th {
  background: var(--rp-accent-soft);
  font-weight: 600;
}
.rp__caption {
  font-size: 12px;
  color: var(--rp-muted);
  margin: 6px 0 0;
  font-style: italic;
}
.rp__divider {
  border: 0;
  border-top: 1px solid var(--rp-line);
  margin: 28px 0;
}
.rp__conclusion {
  margin-top: 36px;
  padding: 18px 20px;
  border-left: 3px solid var(--rp-accent);
  background: #fff;
  border-top: 1px solid var(--rp-line);
  border-right: 1px solid var(--rp-line);
  border-bottom: 1px solid var(--rp-line);
}
.rp__conclusion h2 {
  font-family: "Source Serif 4", "IBM Plex Serif", "Noto Serif SC", Georgia, serif;
  font-size: 16px;
  margin: 0 0 8px;
  color: var(--rp-accent);
}
@media print {
  body { background: #fff; }
  .rp { max-width: none; padding: 0; }
  .rp__embed-img { break-inside: avoid; page-break-inside: avoid; }
}

/* ---- Lumen theme pages: research-page / antibody-page / dash-page ---- */
.research-page {
  --rp-ink: #1a1d21;
  --rp-muted: #5c6570;
  --rp-line: #d8dde3;
  --rp-paper: #ffffff;
  --rp-accent: #1a1d21;
  --rp-accent-soft: #f3f4f6;
  background: #fff;
}
.research-page .rp__title,
.research-page .rp__h2,
.research-page .rp__conclusion h2 {
  font-family: "Source Serif 4", "IBM Plex Serif", "Noto Serif SC", "Songti SC", Georgia, serif;
  color: var(--rp-ink);
}
.research-page .rp__header {
  border-bottom: 1px solid var(--rp-line);
}
.research-page .rp__kicker { color: var(--rp-muted); letter-spacing: 0.08em; }
.research-page .rp__figure {
  background: #fff;
  border: 0;
  border-top: 1px solid var(--rp-line);
  border-bottom: 1px solid var(--rp-line);
  border-radius: 0;
  padding: 12px 0;
}
.research-page .rp__figure-label { color: var(--rp-ink); font-weight: 600; }
.research-page .rp__embed-table th {
  background: #111;
  color: #fff;
  border-color: #111;
}
.research-page .rp__caption { font-style: normal; }

.antibody-page {
  --rp-ink: #0f172a;
  --rp-muted: #64748b;
  --rp-line: #e2e8f0;
  --rp-paper: #f8fafc;
  --rp-accent: #1e3a5f;
  --rp-accent-soft: #e8eef5;
  --rp-status-ok: #15803d;
  --rp-status-warn: #c2410c;
  --rp-status-bad: #b91c1c;
  background: var(--rp-paper);
  font-family: "Source Sans 3", "IBM Plex Sans", "Noto Sans SC", "PingFang SC", sans-serif;
}
.antibody-page .rp__title,
.antibody-page .rp__h2,
.antibody-page .rp__conclusion h2 {
  font-family: inherit;
  color: var(--rp-accent);
}
.antibody-page .rp__header {
  margin: -48px -40px 28px;
  padding: 20px 40px 24px;
  background: var(--rp-accent);
  border-bottom: 0;
  color: #fff;
}
.antibody-page .rp__kicker {
  color: rgba(255,255,255,0.75);
  letter-spacing: 0.16em;
}
.antibody-page .rp__title { color: #fff; }
.antibody-page .rp__subtitle,
.antibody-page .rp__meta { color: rgba(255,255,255,0.8); }
.antibody-page .rp__figure {
  background: #fff;
  border: 1px solid var(--rp-line);
  border-radius: 8px;
  box-shadow: 0 1px 2px rgba(15,23,42,0.04);
}
.antibody-page .rp__embed-table th {
  background: var(--rp-accent);
  color: #fff;
  border-color: var(--rp-accent);
}
.antibody-page .rp__conclusion {
  border-left-color: var(--rp-accent);
  border-radius: 0 8px 8px 0;
}

.dash-page {
  --rp-ink: #0f172a;
  --rp-muted: #64748b;
  --rp-line: #e5e7eb;
  --rp-paper: #f3f4f6;
  --rp-accent: #2563eb;
  --rp-accent-soft: #eff6ff;
  --rp-card: #ffffff;
  --rp-danger: #dc2626;
  background: var(--rp-paper);
  font-family: "Source Sans 3", "IBM Plex Sans", "Noto Sans SC", "PingFang SC", sans-serif;
}
.dash-page .rp__title,
.dash-page .rp__h2,
.dash-page .rp__conclusion h2 {
  font-family: inherit;
  color: var(--rp-ink);
}
.dash-page .rp__header {
  background: var(--rp-card);
  border: 1px solid var(--rp-line);
  border-radius: 12px;
  border-bottom: 1px solid var(--rp-line);
  padding: 20px 22px;
  margin-bottom: 20px;
  box-shadow: 0 1px 2px rgba(15,23,42,0.04);
}
.dash-page .rp__kicker {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 999px;
  background: #e5e7eb;
  color: #374151;
  letter-spacing: 0.08em;
  font-size: 10px;
}
.dash-page .rp__section {
  background: var(--rp-card);
  border: 1px solid var(--rp-line);
  border-radius: 12px;
  padding: 16px 18px;
  box-shadow: 0 1px 2px rgba(15,23,42,0.04);
}
.dash-page .rp__figure {
  background: #f9fafb;
  border: 1px solid var(--rp-line);
  border-radius: 10px;
}
.dash-page .rp__figure-label { color: var(--rp-accent); }
.dash-page .rp__conclusion {
  border: 1px solid var(--rp-line);
  border-left: 3px solid var(--rp-accent);
  border-radius: 12px;
  background: var(--rp-card);
  box-shadow: 0 1px 2px rgba(15,23,42,0.04);
}
.dash-page .rp__conclusion h2 { color: var(--rp-accent); }
`

export type ReportEmbedImages = Record<string, string>

function renderTableHtmlSnippet(analysis: Analysis | null, tableId: string | undefined, maxRows = 12): string {
  const table = analysis?.tables.find((t) => t.id === tableId)
  if (!table) return `<p class="rp__caption">（未找到表）</p>`
  const cols = table.columns.slice(0, 10)
  const rows = table.rows.slice(0, maxRows)
  const head = cols.map((c) => `<th>${escapeHtml(c.title || c.field)}</th>`).join('')
  const body = rows
    .map((r) => {
      const cells = cols
        .map((c) => {
          const v = (r as Record<string, unknown>)[c.field]
          return `<td>${escapeHtml(v == null ? '' : String(v))}</td>`
        })
        .join('')
      return `<tr>${cells}</tr>`
    })
    .join('')
  const more =
    table.rows.length > maxRows
      ? `<p class="rp__caption">仅展示前 ${maxRows} 行（共 ${table.rows.length} 行）</p>`
      : ''
  return `<table class="rp__embed-table"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>${more}`
}

function renderSection(
  sec: ReportSection,
  analysis: Analysis | null,
  images?: ReportEmbedImages,
): string {
  switch (sec.kind) {
    case 'heading':
      return `<section class="rp__section"><h2 class="rp__h2">${escapeHtml(sec.title || '')}</h2></section>`
    case 'paragraph':
      return `<section class="rp__section">${
        sec.title ? `<h2 class="rp__h2">${escapeHtml(sec.title)}</h2>` : ''
      }<div class="rp__body">${paragraphs(sec.body || '')}</div></section>`
    case 'bullets': {
      const items = (sec.items ?? []).map((i) => `<li>${escapeHtml(i)}</li>`).join('')
      return `<section class="rp__section">${
        sec.title ? `<h2 class="rp__h2">${escapeHtml(sec.title)}</h2>` : ''
      }<ul class="rp__ul">${items}</ul></section>`
    }
    case 'chart':
    case 'table': {
      const pyChart = sec.kind === 'chart' && sec.chartId
        ? analysis?.charts?.find((c) => c.id === sec.chartId)
        : undefined
      const table = analysis?.tables.find((t) => t.id === sec.tableId)
      const viewName = (() => {
        if (!table || !sec.viewId) return undefined
        const walk = (nodes: typeof table.views): string | undefined => {
          for (const v of nodes) {
            if (v.id === sec.viewId) return v.name
            const nested = v.children?.length ? walk(v.children) : undefined
            if (nested) return nested
          }
          return undefined
        }
        return walk(table.views)
      })()
      const label =
        sec.kind === 'chart'
          ? `图 · ${pyChart?.name ?? viewName ?? sec.chartId ?? sec.viewId ?? '未指定视图'}`
          : `表 · ${table?.name ?? sec.tableId ?? '未指定表'}`
      const img = images?.[sec.id]
      let embed: string
      if (img) {
        embed = `<img class="rp__embed-img" alt="${escapeHtml(label)}" src="${img}" />`
      } else if (sec.kind === 'table') {
        embed = renderTableHtmlSnippet(analysis, sec.tableId)
      } else if (sec.chartId) {
        embed = `<div data-report-embed="chart" data-chart-id="${escapeHtml(sec.chartId)}">
          （预览中可交互展示；导出 PDF 时转为静态图）
        </div>`
      } else {
        embed = `<div data-report-embed="chart" data-table-id="${escapeHtml(sec.tableId || '')}" data-view-id="${escapeHtml(sec.viewId || '')}">
          （预览中可交互展示；导出 PDF 时转为静态图）
        </div>`
      }
      return `<section class="rp__section"><figure class="rp__figure">
        <div class="rp__figure-label">${escapeHtml(label)}</div>
        ${embed}
        ${sec.caption ? `<figcaption class="rp__caption">${escapeHtml(sec.caption)}</figcaption>` : ''}
      </figure></section>`
    }
    case 'divider':
      return `<hr class="rp__divider" />`
    default:
      return ''
  }
}

/** 将报告文档渲染为完整 HTML 文档字符串。 */
export function renderReportHtml(
  report: AnalysisReport,
  analysis: Analysis | null = null,
  images?: ReportEmbedImages,
): string {
  const sections = report.sections.map((s) => renderSection(s, analysis, images)).join('\n')
  const conclusion = report.conclusion?.trim()
    ? `<aside class="rp__conclusion"><h2>结论</h2><div class="rp__body">${paragraphs(report.conclusion)}</div></aside>`
    : ''
  const templateNote =
    report.templateId && report.templateId !== 'research'
      ? ` · 模板 ${escapeHtml(report.templateId)}`
      : ''
  const theme = resolveReportTheme(report.theme, resolveTemplateId(report.templateId))
  const pageClass = reportThemePageClass(theme)
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${escapeHtml(report.title)}</title>
<style>${RESEARCH_REPORT_CSS}</style>
</head>
<body>
<article class="rp ${pageClass}">
  <header class="rp__header">
    <p class="rp__kicker">Analysis Report</p>
    <h1 class="rp__title">${escapeHtml(report.title)}</h1>
    ${report.subtitle ? `<p class="rp__subtitle">${escapeHtml(report.subtitle)}</p>` : ''}
    <p class="rp__meta">${escapeHtml(analysis?.name ? `分析：${analysis.name} · ` : '')}生成于 ${escapeHtml(report.generatedAt)}${templateNote}</p>
  </header>
  ${sections}
  ${conclusion}
</article>
</body>
</html>`
}

/** 带静态图嵌入的 HTML（PDF / 打印用）。 */
export function renderReportHtmlWithImages(
  report: AnalysisReport,
  analysis: Analysis | null,
  images: ReportEmbedImages,
): string {
  return renderReportHtml(report, analysis, images)
}

/** 尝试从模型输出中解析 JSON 报告。 */
export function parseReportFromModelText(text: string): AnalysisReport | null {
  const fence = text.match(/```json\s*([\s\S]*?)```/) ?? text.match(/```\s*([\s\S]*?)```/)
  const raw = (fence ? fence[1] : text).trim()
  try {
    const obj = JSON.parse(raw) as Partial<AnalysisReport>
    if (!obj || typeof obj !== 'object') return null
    const base = emptyReport(String(obj.title ?? '分析报告'))
    return {
      ...base,
      title: String(obj.title ?? base.title),
      subtitle: obj.subtitle ? String(obj.subtitle) : '',
      generatedAt: nowIso(),
      templateId: resolveTemplateId(obj.templateId ?? obj.theme ?? base.templateId),
      theme: resolveReportTheme(obj.templateId ?? obj.theme ?? base.templateId),
      sections: Array.isArray(obj.sections) ? (obj.sections as ReportSection[]) : base.sections,
      conclusion: obj.conclusion ? String(obj.conclusion) : '',
    }
  } catch {
    return null
  }
}
