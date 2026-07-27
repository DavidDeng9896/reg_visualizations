import { describe, expect, it } from 'vitest'
import type { Analysis, AnalysisTable, StepNode } from '../../src/shared/types'
import { createTable } from '../../src/shared/factories'
import { buildTableForest, upstreamTableId } from '../../src/shared/tree'

function step(id: string, type: StepNode['type'], outputTableId: string, inputs: StepNode['inputs'] = []): StepNode {
  return {
    id,
    type,
    name: `${type} ${id}`,
    inputs,
    config: {},
    status: 'configured',
    output: { tables: [outputTableId], files: [], views: [] },
  }
}

function analysis(tables: AnalysisTable[], steps: StepNode[]): Analysis {
  return {
    id: 'a1',
    name: 'A',
    createdAt: 't',
    updatedAt: 't',
    tables,
    steps,
    files: [],
    flowchartLayout: {},
  }
}

describe('table forest · 侧栏血缘嵌套', () => {
  it('单输入 filter 产出表挂到上游表下', () => {
    const src = createTable('structured_merged', [{ field: 'v', title: 'v', dataType: 'number' }], [{ v: 1 }], 'csv')
    src.stepId = 'upload1'
    const filtered = createTable('Filter table', [{ field: 'v', title: 'v', dataType: 'number' }], [{ v: 1 }], 'step')
    filtered.stepId = 'filter1'

    const a = analysis(
      [src, filtered],
      [
        step('upload1', 'upload-csv', src.id),
        step('filter1', 'filter', filtered.id, [{ port: 'Input dataset', from: { nodeId: 'upload1', port: 'Output dataset' } }]),
      ],
    )

    expect(upstreamTableId(a, filtered)).toBe(src.id)
    expect(upstreamTableId(a, src)).toBeNull()

    const forest = buildTableForest(a)
    expect(forest).toHaveLength(1)
    expect(forest[0].table.id).toBe(src.id)
    expect(forest[0].children.map((c) => c.table.name)).toEqual(['Filter table'])
  })

  it('join 多输入产出表保持根级', () => {
    const left = createTable('L', [{ field: 'id', title: 'id', dataType: 'string' }], [{ id: 'a' }], 'csv')
    left.stepId = 'left'
    const right = createTable('R', [{ field: 'id', title: 'id', dataType: 'string' }], [{ id: 'a' }], 'csv')
    right.stepId = 'right'
    const joined = createTable('J', [{ field: 'id', title: 'id', dataType: 'string' }], [{ id: 'a' }], 'step')
    joined.stepId = 'join1'

    const a = analysis(
      [left, right, joined],
      [
        step('left', 'upload-csv', left.id),
        step('right', 'upload-csv', right.id),
        step('join1', 'join', joined.id, [
          { port: 'Left table', from: { nodeId: 'left', port: 'Output dataset' } },
          { port: 'Right table', from: { nodeId: 'right', port: 'Output dataset' } },
        ]),
      ],
    )

    expect(upstreamTableId(a, joined)).toBeNull()
    const forest = buildTableForest(a)
    expect(forest.map((n) => n.table.name).sort()).toEqual(['J', 'L', 'R'])
  })
})
