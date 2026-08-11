import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { StepNode } from '../../../src/shared/types'
import { createEmptyAnalysis, createTable, sealAnalysisRows } from '../../../src/shared/factories'
import { useAnalysisStore } from '../../../src/stores/analysisStore'
import { commitReplacedTable } from '../../../src/modules/table/commitImport'
import { cancelScheduledPropagate, hasStaleSteps, PROPAGATE_DEBOUNCE_MS } from '../../../src/modules/steps/rerun'

/** upload-csv(src) → filter(flt) 最小管道，验证重传替换与下游传播。 */
function setup() {
  const store = useAnalysisStore()
  const a = sealAnalysisRows(createEmptyAnalysis('demo'))

  const src = createTable('raw', [{ field: 'v', title: 'v', dataType: 'number' }], [{ v: 1 }, { v: 2 }], 'csv')
  const source: StepNode = {
    id: 'src',
    type: 'upload-csv',
    name: 'raw',
    inputs: [],
    config: {},
    status: 'configured',
    output: { tables: [src.id], files: [], views: [] },
  }
  src.stepId = 'src'

  const fltOut = createTable('filtered', [{ field: 'v', title: 'v', dataType: 'number' }], [{ v: 1 }], 'step')
  const filter: StepNode = {
    id: 'flt',
    type: 'filter',
    name: 'filter',
    inputs: [{ port: 'Input dataset', from: { nodeId: 'src', port: 'Output dataset' } }],
    config: { filters: [] },
    status: 'configured',
    output: { tables: [fltOut.id], files: [], views: [] },
  }
  fltOut.stepId = 'flt'

  a.tables.push(src, fltOut)
  a.steps.push(source, filter)
  store.current = a
  return { a, src, fltOut, filter }
}

describe('commitReplacedTable 上传节点重传', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.useFakeTimers()
  })
  afterEach(() => {
    cancelScheduledPropagate()
    vi.useRealTimers()
  })

  it('替换列与行、保留表 id，下游立即 stale', () => {
    const { a, src, filter } = setup()
    const ok = commitReplacedTable(src.id, {
      name: 'raw',
      headers: ['v', 'name'],
      dataRows: [
        ['1', 'a'],
        ['2', 'b'],
        ['3', 'c'],
      ],
      columnTypes: ['number', 'string'],
      originalFileName: 'raw-v2.csv',
    })
    expect(ok).toBe(true)

    const t = a.tables.find((x) => x.id === src.id)!
    expect(t.id).toBe(src.id)
    expect(t.columns.map((c) => c.field)).toEqual(['v', 'name'])
    expect(t.rows).toHaveLength(3)
    expect(t.rows[2]?.name).toBe('c')

    // 即时反馈：下游标 stale
    expect(hasStaleSteps(a)).toBe(true)
    expect(filter.status).toBe('stale')

    // 源步骤状态与溯源更新
    const s = a.steps.find((x) => x.id === 'src')!
    expect(s.status).toBe('configured')
    expect(s.config.originalFileName).toBe('raw-v2.csv')
  })

  it('防抖后自动重跑下游，filter 产出新行数', async () => {
    const { a, src, fltOut } = setup()
    commitReplacedTable(src.id, {
      name: 'raw',
      headers: ['v'],
      dataRows: [['5'], ['6'], ['7'], ['8']],
      columnTypes: ['number'],
    })
    await vi.advanceTimersByTimeAsync(PROPAGATE_DEBOUNCE_MS + 50)
    // 等异步重跑落盘
    await vi.runAllTimersAsync()

    const t = a.tables.find((x) => x.id === fltOut.id)!
    expect(t.rows).toHaveLength(4)
    expect(hasStaleSteps(a)).toBe(false)
  })

  it('表不存在时返回 false', () => {
    setup()
    expect(commitReplacedTable('nope', { name: 'x', headers: ['a'], dataRows: [['1']], columnTypes: ['string'] })).toBe(false)
  })
})
