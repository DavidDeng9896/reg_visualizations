import { describe, expect, it } from 'vitest'
import {
  emptyReport,
  parseReportFromModelText,
  readReportConfig,
  renderReportHtml,
} from '../../../src/modules/steps/report/reportModel'

describe('reportModel', () => {
  it('emptyReport has research theme and default abstract section', () => {
    const r = emptyReport()
    expect(r.theme).toBe('research')
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

  it('readReportConfig reads nested report object', () => {
    const r = readReportConfig({
      report: {
        title: 'T1',
        theme: 'research',
        generatedAt: '2026-01-01T00:00:00.000Z',
        sections: [{ id: 's1', kind: 'paragraph', title: '方法', body: '回归' }],
        conclusion: '显著',
      },
    })
    expect(r.title).toBe('T1')
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

  it('parseReportFromModelText extracts JSON object', () => {
    const text = `说明如下：\n\`\`\`json\n{"title":"T","subtitle":"","theme":"research","sections":[{"id":"1","kind":"paragraph","title":"H","body":"B"}],"conclusion":"C"}\n\`\`\``
    const r = parseReportFromModelText(text)
    expect(r).not.toBeNull()
    expect(r!.title).toBe('T')
    expect(r!.sections).toHaveLength(1)
    expect(r!.sections[0].title).toBe('H')
    expect(r!.conclusion).toBe('C')
  })

  it('parseReportFromModelText returns null on garbage', () => {
    expect(parseReportFromModelText('你好，没有 JSON')).toBeNull()
  })
})
