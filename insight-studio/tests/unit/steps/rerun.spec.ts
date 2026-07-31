import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Analysis, AnalysisTable, StepNode } from '../../../src/shared/types'
import { createTable } from '../../../src/shared/factories'
import {
  AUTO_RERUN_BUDGET,
  cancelScheduledPropagate,
  downstreamStepIds,
  estimatePropagateCost,
  hasStaleSteps,
  markDownstreamStale,
  markTableEdited,
  propagateTableEdit,
  PROPAGATE_DEBOUNCE_MS,
  rerunStaleSteps,
  schedulePropagateTableEdit,
  shouldAutoRerun,
  stepOfTable,
} from '../../../src/modules/steps/rerun'

function makeAnalysis(tables: AnalysisTable[], steps: StepNode[]): Analysis {
  return {
    id: 'a1',
    name: 'A',
    createdAt: 't',
    updatedAt: 't',
    tables,
    flowchartLayout: {},
    steps,
    files: [],
  }
}

function makeStep(partial: Partial<StepNode> & { id: string; type: StepNode['type'] }): StepNode {
  return {
    name: partial.type,
    inputs: [],
    config: {},
    status: 'configured',
    output: { tables: [], files: [], views: [] },
    ...partial,
  }
}

/** 构造：source(upload-csv) → filter 的最小管道。 */
function makePipeline() {
  const srcTable = createTable('src', [{ field: 'v', title: 'v', dataType: 'number' }], [{ v: 1 }, { v: 2 }, { v: 3 }], 'csv')
  const filterOut = createTable('filtered', [{ field: 'v', title: 'v', dataType: 'number' }], [{ v: 2 }, { v: 3 }], 'step')

  const source = makeStep({ id: 'src', type: 'upload-csv', output: { tables: [srcTable.id], files: [], views: [] } })
  srcTable.stepId = 'src'
  const filter = makeStep({
    id: 'flt',
    type: 'filter',
    inputs: [{ port: 'Input dataset', from: { nodeId: 'src', port: 'Output dataset' } }],
    config: { filters: [{ id: 'f1', combinator: 'and', conditions: [{ id: 'c1', column: 'v', operator: 'gte', value: 2 }] }] },
    output: { tables: [filterOut.id], files: [], views: [] },
  })
  filterOut.stepId = 'flt'

  const a = makeAnalysis([srcTable, filterOut], [source, filter])
  return { a, srcTable, filterOut, source, filter }
}

describe('steps/rerun stale 状态机', () => {
  afterEach(() => {
    cancelScheduledPropagate()
    vi.useRealTimers()
  })

  it('downstreamStepIds：BFS 找出所有下游（不含自身）', () => {
    const { a } = makePipeline()
    expect([...downstreamStepIds(a, 'src')]).toEqual(['flt'])
    expect(downstreamStepIds(a, 'flt').size).toBe(0)
  })

  it('stepOfTable / markTableEdited：编辑源表后下游 configured 变 stale', () => {
    const { a, srcTable } = makePipeline()
    expect(stepOfTable(a, srcTable.id)?.id).toBe('src')
    expect(hasStaleSteps(a)).toBe(false)
    markTableEdited(a, srcTable.id)
    const filter = a.steps.find((s) => s.id === 'flt')!
    expect(filter.status).toBe('stale')
    expect(hasStaleSteps(a)).toBe(true)
    // 源步骤本身不受影响
    expect(a.steps.find((s) => s.id === 'src')!.status).toBe('configured')
  })

  it('markDownstreamStale：只影响 configured，不影响 pending/failed', () => {
    const { a } = makePipeline()
    const filter = a.steps.find((s) => s.id === 'flt')!
    filter.status = 'failed'
    markDownstreamStale(a, 'src')
    expect(filter.status).toBe('failed')
  })

  it('rerunStaleSteps：按新输入重跑并恢复 configured', () => {
    const { a, srcTable } = makePipeline()
    markTableEdited(a, srcTable.id)
    const filter = a.steps.find((s) => s.id === 'flt')!
    expect(filter.status).toBe('stale')

    const ran = rerunStaleSteps(a)
    expect(ran).toBe(1)
    expect(filter.status).toBe('configured')
    expect(hasStaleSteps(a)).toBe(false)
    const out = a.tables.find((t) => t.id === filter.output.tables[0])!
    expect(out.rows).toHaveLength(2)
  })

  it('propagateTableEdit：小图自动重跑下游', () => {
    const { a, srcTable } = makePipeline()
    srcTable.rows = [{ __rowId: 'r1', v: 1 }]
    const result = propagateTableEdit(a, srcTable.id)
    expect(result.mode).toBe('reran')
    expect(result.ran).toBe(1)
    const filter = a.steps.find((s) => s.id === 'flt')!
    expect(filter.status).toBe('configured')
    const out = a.tables.find((t) => t.id === filter.output.tables[0])!
    expect(out.rows).toHaveLength(0)
  })

  it('estimatePropagateCost / shouldAutoRerun：超预算只标 stale', () => {
    const { a, srcTable } = makePipeline()
    expect(estimatePropagateCost(a, srcTable.id)).toBe(3) // 3 行 × 1 下游
    expect(shouldAutoRerun(3)).toBe(true)
    expect(shouldAutoRerun(AUTO_RERUN_BUDGET + 1)).toBe(false)

    srcTable.rows = Array.from({ length: 1000 }, (_, i) => ({ __rowId: `r${i}`, v: i }))
    const result = propagateTableEdit(a, srcTable.id, 100) // 1000*1 > 100
    expect(result.mode).toBe('stale-only')
    expect(result.ran).toBe(0)
    expect(a.steps.find((s) => s.id === 'flt')!.status).toBe('stale')
  })

  it('schedulePropagateTableEdit：立即 stale，防抖后合并重跑', () => {
    vi.useFakeTimers()
    const { a, srcTable } = makePipeline()
    srcTable.rows = [{ __rowId: 'r1', v: 1 }]

    let mutateCount = 0
    const apply = (fn: (analysis: Analysis) => void) => {
      mutateCount += 1
      fn(a)
    }

    schedulePropagateTableEdit(apply, srcTable.id, { debounceMs: PROPAGATE_DEBOUNCE_MS })
    expect(a.steps.find((s) => s.id === 'flt')!.status).toBe('stale')
    expect(mutateCount).toBe(1) // 仅即时 mark

    schedulePropagateTableEdit(apply, srcTable.id, { debounceMs: PROPAGATE_DEBOUNCE_MS })
    expect(mutateCount).toBe(2) // 第二次仍只 mark

    vi.advanceTimersByTime(PROPAGATE_DEBOUNCE_MS)
    expect(mutateCount).toBe(3) // flush 一次重跑
    expect(a.steps.find((s) => s.id === 'flt')!.status).toBe('configured')
    const out = a.tables.find((t) => t.stepId === 'flt')!
    expect(out.rows).toHaveLength(0)
  })
})
