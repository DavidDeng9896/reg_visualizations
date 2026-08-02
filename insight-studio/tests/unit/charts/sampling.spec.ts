import { describe, expect, it } from 'vitest'
import type { Analysis, AnalysisTable, ColumnMeta, Row } from '../../../src/shared/types'
import { SAMPLE_LIMIT, runPipeline } from '../../../src/shared/pipeline'
import { samplingNotice } from '../../../src/modules/charts/runtime/sampling'

const cols: ColumnMeta[] = [{ field: 'v', title: 'v', dataType: 'number' }]

function makeAnalysis(n: number): Analysis {
  const rows: Row[] = Array.from({ length: n }, (_, i) => ({ v: i }))
  const table: AnalysisTable = { id: 't1', name: 'T', source: 'csv', columns: cols, rows, filters: [], views: [] }
  return { id: 'a1', name: 'A', createdAt: '', updatedAt: '', tables: [table], flowchartLayout: {}, steps: [], files: [] }
}

describe('runPipeline · skipSampling', () => {
  it('超上限默认采样 10000 行并标记', () => {
    const res = runPipeline(makeAnalysis(SAMPLE_LIMIT + 1), 't1')
    expect(res.sampled).toBe(true)
    expect(res.rows).toHaveLength(SAMPLE_LIMIT)
    expect(res.totalRows).toBe(SAMPLE_LIMIT + 1)
  })

  it('skipSampling → 全量返回', () => {
    const res = runPipeline(makeAnalysis(SAMPLE_LIMIT + 1), 't1', undefined, { skipSampling: true })
    expect(res.sampled).toBe(false)
    expect(res.rows).toHaveLength(SAMPLE_LIMIT + 1)
  })

  it('未超上限不受参数影响', () => {
    const res = runPipeline(makeAnalysis(100), 't1', undefined, { skipSampling: true })
    expect(res.sampled).toBe(false)
    expect(res.rows).toHaveLength(100)
  })
})

describe('samplingNotice', () => {
  it('采样时生成警告文案', () => {
    const res = runPipeline(makeAnalysis(SAMPLE_LIMIT + 1), 't1')
    const notice = samplingNotice(res)
    expect(notice.sampled).toBe(true)
    expect(notice.message).toContain('random sample')
    expect(notice.message).toContain('10,000')
  })

  it('未采样为空', () => {
    const res = runPipeline(makeAnalysis(10), 't1')
    expect(samplingNotice(res).sampled).toBe(false)
    expect(samplingNotice(res).message).toBe('')
  })
})

describe('runPipeline · 采样确定性', () => {
  it('同一数据两次采样结果完全一致（点集不跳动）', () => {
    const a = makeAnalysis(SAMPLE_LIMIT + 500)
    const r1 = runPipeline(a, 't1')
    const r2 = runPipeline(a, 't1')
    expect(r1.sampled).toBe(true)
    expect(r2.sampled).toBe(true)
    expect(r1.rows.map((r) => r.v)).toEqual(r2.rows.map((r) => r.v))
  })

  it('行数变化后重新采样', () => {
    const r1 = runPipeline(makeAnalysis(SAMPLE_LIMIT + 500), 't1')
    const r2 = runPipeline(makeAnalysis(SAMPLE_LIMIT + 501), 't1')
    expect(r1.rows.map((r) => r.v)).not.toEqual(r2.rows.map((r) => r.v))
  })
})
