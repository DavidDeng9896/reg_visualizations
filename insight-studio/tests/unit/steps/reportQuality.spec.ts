import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  assessReportQuality,
  assertReportDone,
  formatSkillIdForTemplate,
  PLACEHOLDER_PATTERNS,
} from '../../../src/modules/steps/report/reportQuality'
import { createEmptyAnalysis, createTable, createViewNode } from '../../../src/shared/factories'
import type { Analysis, AnalysisReport, ReportSection } from '../../../src/shared/types'
import { uuid } from '../../../src/shared/id'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../')

function sec(partial: Omit<ReportSection, 'id'> & { id?: string }): ReportSection {
  return { id: partial.id ?? uuid(), ...partial }
}

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
  table.views = [view]
  a.tables = [table]
  a.charts = [
    { id: 'cc1::volcano', name: 'Volcano', stepId: 'cc1', plotlyJson: { data: [], layout: {} } },
  ]
  return a
}

function goodReport(): AnalysisReport {
  return {
    title: '亲和力小结',
    subtitle: '阶段性结论',
    generatedAt: new Date().toISOString(),
    theme: 'research',
    templateId: 'research',
    sections: [
      sec({ kind: 'heading', title: '分析目标与数据范围' }),
      sec({ kind: 'paragraph', title: '目标', body: '评估候选分子的亲和力分布与离群点。' }),
      sec({ kind: 'heading', title: '关键发现' }),
      sec({
        kind: 'chart',
        title: '图 1. KD 散点',
        tableId: 't1',
        viewId: 'v1',
        caption: '图 1. 候选 KD 与表达量散点。',
      }),
      sec({
        kind: 'paragraph',
        title: '图 1 解读',
        body: '多数候选集中在低 KD 区间，右上角出现两例高表达高亲和力离群点。',
      }),
      sec({
        kind: 'chart',
        title: '图 2. Volcano',
        chartId: 'cc1::volcano',
        caption: '图 2. Custom Code 火山图。',
      }),
      sec({
        kind: 'paragraph',
        title: '图 2 解读',
        body: '显著上调点集中在右侧，与主表筛选结果一致。',
      }),
    ],
    conclusion: '优先推进低 KD 且表达量稳定的 Top 候选，并复核两例离群点。',
  }
}

describe('reportQuality', () => {
  it('formatSkillIdForTemplate maps templateId to report-format-*', () => {
    expect(formatSkillIdForTemplate('research')).toBe('report-format-research')
    expect(formatSkillIdForTemplate('antibody')).toBe('report-format-antibody')
    expect(formatSkillIdForTemplate('dashboard-review')).toBe('report-format-dashboard-review')
  })

  it('accepts a complete report as done', () => {
    const issues = assessReportQuality(goodReport(), miniAnalysis())
    expect(issues).toEqual([])
    expect(assertReportDone(goodReport(), miniAnalysis()).ok).toBe(true)
  })

  it('rejects placeholders and empty conclusion when claiming done', () => {
    const report = goodReport()
    report.conclusion = '（待完善）请结合后续实验综合评估。'
    const issues = assessReportQuality(report, miniAnalysis())
    expect(issues.some((i) => i.code === 'placeholder')).toBe(true)
    expect(assertReportDone(report, miniAnalysis()).ok).toBe(false)
  })

  it('rejects missing caption or interpretation paragraph', () => {
    const report = goodReport()
    report.sections = [
      sec({ kind: 'chart', title: '图', tableId: 't1', viewId: 'v1', caption: '' }),
      sec({ kind: 'heading', title: '下一节' }),
    ]
    report.conclusion = '有结论。'
    const issues = assessReportQuality(report, miniAnalysis())
    expect(issues.some((i) => i.code === 'caption')).toBe(true)
    expect(issues.some((i) => i.code === 'interpretation')).toBe(true)
  })

  it('rejects unresolvable tableId/viewId/chartId', () => {
    const report = goodReport()
    report.sections = [
      sec({
        kind: 'chart',
        title: '坏图',
        tableId: 'missing',
        viewId: 'v1',
        caption: '说明',
      }),
      sec({ kind: 'paragraph', title: '解读', body: '有解读。' }),
      sec({
        kind: 'chart',
        title: '坏 python 图',
        chartId: 'nope',
        caption: '说明',
      }),
      sec({ kind: 'paragraph', title: '解读2', body: '有解读。' }),
    ]
    report.conclusion = '结论完整。'
    const issues = assessReportQuality(report, miniAnalysis())
    expect(issues.some((i) => i.code === 'unresolvable_id')).toBe(true)
  })

  it('rejects think / tool-log leakage', () => {
    const report = goodReport()
    report.sections[1] = sec({
      kind: 'paragraph',
      title: '目标',
      body: '<think>先 list_tables 再出图</think>正式目标。',
    })
    const issues = assessReportQuality(report, miniAnalysis())
    expect(issues.some((i) => i.code === 'think_leak')).toBe(true)
  })

  it('PLACEHOLDER_PATTERNS covers scaffold phrases', () => {
    const sample = '（待完善）后续由 AI 改写；请结合指标综合评估。'
    expect(PLACEHOLDER_PATTERNS.some((re) => re.test(sample))).toBe(true)
  })
})

describe('official report-format skills', () => {
  const ids = [
    'report-format-common',
    'report-format-research',
    'report-format-antibody',
    'report-format-dashboard-review',
  ]

  for (const id of ids) {
    it(`ships ${id}/skill.json + SKILL.md`, () => {
      const dir = path.join(repoRoot, 'insight-api-go/skills/official', id)
      const meta = JSON.parse(fs.readFileSync(path.join(dir, 'skill.json'), 'utf8')) as {
        id: string
        name: string
      }
      expect(meta.id).toBe(id)
      expect(meta.name.length).toBeGreaterThan(0)
      const body = fs.readFileSync(path.join(dir, 'SKILL.md'), 'utf8')
      expect(body).toMatch(/caption/i)
      expect(body).toMatch(/待完善|禁止/)
      expect(body).toMatch(/tableId|viewId|chartId/)
    })
  }
})
