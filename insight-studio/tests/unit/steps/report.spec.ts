import { describe, expect, it } from 'vitest'
import {
  emptyReport,
  parseReportFromModelText,
  readReportConfig,
  renderReportHtml,
  renderReportHtmlWithImages,
} from '../../../src/modules/steps/report/reportModel'
import {
  REPORT_TEMPLATES,
  resolveTemplateId,
  scaffoldReportFromAnalysis,
} from '../../../src/modules/steps/report/reportTemplates'
import { createEmptyAnalysis, createTable, createViewNode } from '../../../src/shared/factories'
import type { Analysis } from '../../../src/shared/types'

function miniAnalysis(): Analysis {
  const a = createEmptyAnalysis('Demo Analysis')
  const table = createTable(
    'candidates',
    [
      { field: 'KD', title: 'KD', dataType: 'number' },
      { field: 'Expr', title: 'Expr', dataType: 'number' },
    ],
    [
      { KD: 1, Expr: 10 },
      { KD: 2, Expr: 20 },
    ],
    'demo',
  )
  table.id = 't1'
  const view = createViewNode('scatter', 'KD 散点')
  view.id = 'v1'
  if (view.chart) {
    view.chart.configure.x = { field: 'KD' }
    view.chart.configure.values = [{ field: 'Expr' }]
  }
  table.views = [view]
  a.tables = [table]
  return a
}

describe('reportModel', () => {
  it('emptyReport has research theme and default abstract section', () => {
    const r = emptyReport()
    expect(r.theme).toBe('research')
    expect(r.templateId).toBe('research')
    expect(r.title).toBe('分析报告')
    expect(r.sections.length).toBeGreaterThanOrEqual(1)
    expect(r.sections[0].kind).toBe('paragraph')
    expect(r.sections[0].title).toBe('摘要')
  })

  it('readReportConfig falls back for empty config', () => {
    const r = readReportConfig({})
    expect(r.title).toBe('分析报告')
    expect(r.theme).toBe('research')
  })

  it('readReportConfig reads nested report object and templateId', () => {
    const r = readReportConfig({
      report: {
        title: 'T1',
        theme: 'research',
        templateId: 'antibody',
        generatedAt: '2026-01-01T00:00:00.000Z',
        sections: [{ id: 's1', kind: 'paragraph', title: '方法', body: '回归' }],
        conclusion: '显著',
      },
    })
    expect(r.title).toBe('T1')
    expect(r.templateId).toBe('antibody')
    expect(r.sections).toHaveLength(1)
    expect(r.conclusion).toBe('显著')
  })

  it('renderReportHtml includes title and sections', () => {
    const html = renderReportHtml({
      title: 'IC50 分析报告',
      subtitle: '摘要',
      theme: 'research',
      generatedAt: '2026-08-07T00:00:00.000Z',
      sections: [
        { id: 'a', kind: 'paragraph', title: '方法', body: '使用回归模型。' },
        { id: 'b', kind: 'bullets', title: '要点', items: ['显著'] },
      ],
      conclusion: '结果显著。',
    })
    expect(html).toContain('IC50 分析报告')
    expect(html).toContain('方法')
    expect(html).toContain('使用回归模型')
    expect(html).toContain('结论')
    expect(html).toContain('结果显著')
    expect(html).toContain('Analysis Report')
  })

  it('renderReportHtmlWithImages embeds chart png', () => {
    const html = renderReportHtmlWithImages(
      {
        title: 'R',
        theme: 'research',
        generatedAt: '2026-08-07T00:00:00.000Z',
        sections: [{ id: 'c1', kind: 'chart', title: '图1', tableId: 't1', viewId: 'v1', caption: 'cap' }],
      },
      null,
      { c1: 'data:image/png;base64,AAA' },
    )
    expect(html).toContain('data:image/png;base64,AAA')
    expect(html).toContain('rp__embed-img')
    expect(html).toContain('cap')
  })

  it('parseReportFromModelText extracts JSON object', () => {
    const text = `说明如下：\n\`\`\`json\n{"title":"T","subtitle":"","theme":"research","templateId":"dashboard-review","sections":[{"id":"1","kind":"paragraph","title":"H","body":"B"}],"conclusion":"C"}\n\`\`\``
    const r = parseReportFromModelText(text)
    expect(r).not.toBeNull()
    expect(r!.title).toBe('T')
    expect(r!.templateId).toBe('dashboard-review')
    expect(r!.sections).toHaveLength(1)
    expect(r!.sections[0].title).toBe('H')
    expect(r!.conclusion).toBe('C')
  })

  it('parseReportFromModelText returns null on garbage', () => {
    expect(parseReportFromModelText('你好，没有 JSON')).toBeNull()
  })
})

describe('reportTemplates', () => {
  it('exposes 3 built-in templates', () => {
    expect(REPORT_TEMPLATES).toHaveLength(3)
    expect(REPORT_TEMPLATES.map((t) => t.id)).toEqual(['research', 'antibody', 'dashboard-review'])
  })

  it('resolveTemplateId falls back to research', () => {
    expect(resolveTemplateId('antibody')).toBe('antibody')
    expect(resolveTemplateId('nope')).toBe('research')
  })

  it('scaffoldReportFromAnalysis builds chart+interpretation pairs', () => {
    const r = scaffoldReportFromAnalysis(miniAnalysis(), 'research')
    expect(r.templateId).toBe('research')
    expect(r.title).toContain('Demo Analysis')
    const kinds = r.sections.map((s) => s.kind)
    expect(kinds).toContain('heading')
    expect(kinds).toContain('chart')
    expect(kinds).toContain('paragraph')
    const chart = r.sections.find((s) => s.kind === 'chart')!
    expect(chart.tableId).toBe('t1')
    expect(chart.viewId).toBe('v1')
    expect(chart.caption).toBeTruthy()
    const interp = r.sections[r.sections.findIndex((s) => s.id === chart.id) + 1]
    expect(interp.kind).toBe('paragraph')
    expect(interp.body).toBeTruthy()
  })

  it('antibody template adds candidate table block', () => {
    const r = scaffoldReportFromAnalysis(miniAnalysis(), 'antibody')
    expect(r.templateId).toBe('antibody')
    expect(r.sections.some((s) => s.title === '候选一览')).toBe(true)
    expect(r.sections.some((s) => s.kind === 'table')).toBe(true)
  })
})
