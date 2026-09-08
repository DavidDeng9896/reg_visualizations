import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import Papa from 'papaparse'
import { inferColumnTypes } from '../../../src/modules/table/csv'
import { formatTableSchema, extractUnitHint } from '../../../src/modules/ai/tableSchema'
import { inferAnalysisIntent } from '../../../src/modules/ai/intentHint'
import {
  resolveColumnField,
  normalizeAiChartConfigure,
  autofillRequiredChartSlots,
} from '../../../src/modules/ai/normalizeChartConfigure'
import { createTable, sealRows } from '../../../src/shared/factories'
import type { Row } from '../../../src/shared/types'
import { validateChartMapping } from '../../../src/modules/charts/registry'
import { createChartConfig } from '../../../src/shared/factories'

const FIXTURES = resolve(__dirname, '../../fixtures/data_entry_ai')

function loadCsvFixture(name: string) {
  const text = readFileSync(resolve(FIXTURES, name), 'utf-8')
  const parsed = Papa.parse<string[]>(text.trim(), { skipEmptyLines: true })
  const [headers, ...dataRows] = parsed.data as unknown as [string[], ...string[][]]
  const columns = inferColumnTypes(headers, dataRows)
  const rows: Row[] = dataRows.map((cells) => {
    const row: Row = {}
    headers.forEach((h, i) => {
      const col = columns[i]
      row[h] = col && col.dataType === 'number' ? (Number(cells[i]) || null) : ((cells[i] ?? '') as string)
    })
    return row
  })
  return createTable(name.replace(/\.csv$/, ''), columns, sealRows(rows), 'demo')
}

describe('data_entry_ai fixtures · table understanding', () => {
  it('docking CSV：schema 暴露 field（含空格/单位括号）与 labeled 样例', () => {
    const t = loadCsvFixture('docking_scores_20241105.csv')
    const schema = formatTableSchema(t)
    expect(schema).toContain('field=`docking score`')
    expect(schema).toContain('field=`localStrain(kcal)`')
    expect(schema).toContain('unit=kcal')
    expect(schema).toMatch(/row1: \{/)
    expect(schema).toContain('docking score=')
    expect(extractUnitHint('localStrain(kcal)')).toBe('kcal')
  })

  it('字段模糊匹配：去单位括号 / 空格', () => {
    const t = loadCsvFixture('docking_scores_20241105.csv')
    expect(resolveColumnField('localStrain', t.columns)).toBe('localStrain(kcal)')
    expect(resolveColumnField('docking_score', t.columns)).toBe('docking score')
    expect(resolveColumnField('StatePenalty', t.columns)).toBe('State Penalty')
  })

  it('mouse PK：bar 映射可用 Compound ID × AUC', () => {
    const t = loadCsvFixture('mouse_pk_auc_f.csv')
    expect(resolveColumnField('Dose', t.columns)).toBe('Dose (mg/kg)')
    expect(resolveColumnField('AUC_last', t.columns)).toBe('AUC_last (h*ng/mL)')
    const configured = normalizeAiChartConfigure('bar', {
      x: { field: 'Compound ID' },
      y: { field: 'AUC_last', aggregation: 'mean' },
    })
    const resolved = {
      ...configured,
      x: { field: resolveColumnField(configured.x!.field, t.columns)! },
      y: {
        field: resolveColumnField(configured.y!.field, t.columns)!,
        aggregation: configured.y!.aggregation,
      },
    }
    const chart = createChartConfig('bar')
    Object.assign(chart.configure, resolved)
    expect(validateChartMapping(chart, t.columns)).toEqual([])
  })

  it('pharmacophore：scatter autofill 在 Fitness/Align Score 上可用', () => {
    const t = loadCsvFixture('pharmacophore_TREM_20251219.csv')
    const { configure, filled } = autofillRequiredChartSlots(
      'scatter',
      { values: [{ field: 'Fitness' }] },
      t.columns,
    )
    expect(configure.values?.[0]?.field).toBe('Fitness')
    expect(configure.x?.field).toBeTruthy()
    expect(filled.some((f) => f.startsWith('x='))).toBe(true)
    const chart = createChartConfig('scatter')
    Object.assign(chart.configure, configure)
    expect(validateChartMapping(chart, t.columns)).toEqual([])
  })
})

describe('analysis intent hint', () => {
  it('出图/对比 → chart_compare + bar', () => {
    const h = inferAnalysisIntent('请对 docking score 做柱状图对比')
    expect(h.kind).toBe('chart_compare')
    expect(h.chartTypes).toContain('bar')
    expect(h.prompt).toContain('意图线索')
  })

  it('相关/散点 → chart_correlate', () => {
    const h = inferAnalysisIntent('看一下 Fitness 与 Align Score 的相关性散点图')
    expect(h.kind).toBe('chart_correlate')
    expect(h.chartTypes).toContain('scatter')
  })

  it('快速分析 → explore', () => {
    const h = inferAnalysisIntent('希望快速分析一下这张表')
    expect(h.kind).toBe('explore')
    expect(h.prompt).toContain('get_table_schema')
  })

  it('只要清洗不要图 → transform_only', () => {
    const h = inferAnalysisIntent('过滤掉空值，只要表，不要图')
    expect(h.kind).toBe('transform_only')
  })
})
