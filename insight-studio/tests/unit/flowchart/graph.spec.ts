import { describe, expect, it } from 'vitest'
import type { Analysis, AnalysisTable, StepNode, ViewNode } from '../../../src/shared/types'
import { createTable } from '../../../src/shared/factories'
import { buildFlowGraph, stepNodeId, viewNodeId } from '../../../src/modules/flowchart/graph'

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

function analysis(nodes: { steps?: StepNode[]; tables?: AnalysisTable[]; views?: ViewNode[] }): Analysis {
  return {
    id: 'a1',
    name: 'A',
    createdAt: 't',
    updatedAt: 't',
    tables: nodes.tables ?? [],
    steps: nodes.steps ?? [],
    files: [],
    flowchartLayout: {},
  }
}

describe('buildFlowGraph · steps', () => {
  it('空 analysis：无节点无边', () => {
    const g = buildFlowGraph(analysis({}))
    expect(g.nodes).toHaveLength(0)
    expect(g.edges).toHaveLength(0)
  })

  it('单个步骤节点 + 输出表 + 视图', () => {
    const t = createTable('T', [{ field: 'v', title: 'v', dataType: 'number' }], [{ v: 1 }], 'step')
    t.stepId = 's1'
    const v: ViewNode = { id: 'v1', name: 'Bar', type: 'bar', filters: [], transforms: [], children: [] }
    t.views = [v]
    const s = step('s1', 'upload-csv', t.id)
    const a = analysis({ steps: [s], tables: [t] })

    const g = buildFlowGraph(a)
    expect(g.nodes.map((n) => n.id)).toContain(stepNodeId('s1'))
    expect(g.nodes.map((n) => n.id)).toContain(viewNodeId('v1'))
    expect(g.edges.some((e) => e.source === stepNodeId('s1') && e.target === viewNodeId('v1'))).toBe(true)
  })

  it('步骤输入边：filter 步骤连接上游 upload-csv', () => {
    const t1 = createTable('T1', [{ field: 'v', title: 'v', dataType: 'number' }], [{ v: 1 }], 'step')
    t1.stepId = 'src'
    const t2 = createTable('T2', [{ field: 'v', title: 'v', dataType: 'number' }], [{ v: 2 }], 'step')
    t2.stepId = 'f1'
    const src = step('src', 'upload-csv', t1.id)
    const filter = step('f1', 'filter', t2.id, [
      { port: 'Input dataset', from: { nodeId: 'src', port: 'Output dataset' } },
    ])
    const a = analysis({ steps: [src, filter], tables: [t1, t2] })

    const g = buildFlowGraph(a)
    expect(g.edges).toHaveLength(1)
    const e = g.edges[0]
    expect(e.source).toBe(stepNodeId('src'))
    expect(e.target).toBe(stepNodeId('f1'))
    expect(e.sourcePort).toBe('Output dataset')
    expect(e.targetPort).toBe('Input dataset')
  })

  it('join 步骤有两个输入边', () => {
    const left = createTable('L', [{ field: 'id', title: 'id', dataType: 'string' }], [{ id: 'a' }], 'step')
    left.stepId = 'left'
    const right = createTable('R', [{ field: 'id', title: 'id', dataType: 'string' }], [{ id: 'a' }], 'step')
    right.stepId = 'right'
    const out = createTable('J', [{ field: 'id', title: 'id', dataType: 'string' }], [{ id: 'a' }], 'step')
    out.stepId = 'join1'

    const join = step('join1', 'join', out.id, [
      { port: 'Left table', from: { nodeId: 'left', port: 'Output dataset' } },
      { port: 'Right table', from: { nodeId: 'right', port: 'Output dataset' } },
    ])
    const a = analysis({
      steps: [step('left', 'upload-csv', left.id), step('right', 'upload-csv', right.id), join],
      tables: [left, right, out],
    })

    const g = buildFlowGraph(a)
    expect(g.edges).toHaveLength(2)
  })
})
