import { describe, expect, it } from 'vitest'
import type { Analysis, AnalysisTable, StepNode } from '../../../src/shared/types'
import { createTable } from '../../../src/shared/factories'
import {
  downstreamStepIds,
  hasStaleSteps,
  markDownstreamStale,
  markTableEdited,
  rerunStaleSteps,
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
    // 手动把源表数据改为全部 >= 2（3 行）
    markTableEdited(a, srcTable.id)
    const filter = a.steps.find((s) => s.id === 'flt')!
    expect(filter.status).toBe('stale')

    const ran = rerunStaleSteps(a)
    expect(ran).toBe(1)
    expect(filter.status).toBe('configured')
    expect(hasStaleSteps(a)).toBe(false)
    // 输出表内容按新过滤重算（v>=2 → 2 行）
    const out = a.tables.find((t) => t.id === filter.output.tables[0])!
    expect(out.rows).toHaveLength(2)
  })
})
