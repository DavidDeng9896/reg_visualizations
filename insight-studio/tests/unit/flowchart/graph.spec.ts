import { describe, expect, it } from 'vitest'
import type { Analysis, AnalysisTable, CombineSpec, ViewNode, ViewType } from '../../../src/shared/types'
import {
  buildFlowGraph,
  combineStepNodeId,
  downstreamOf,
  tableNodeId,
  upstreamOf,
  viewNodeId,
} from '../../../src/modules/flowchart/graph'

/* --------------------------------- 测试工厂 --------------------------------- */

function view(id: string, type: ViewType = 'bar', children: ViewNode[] = []): ViewNode {
  return { id, name: `View ${id}`, type, filters: [], transforms: [], children }
}

function table(id: string, opts: Partial<AnalysisTable> = {}): AnalysisTable {
  return {
    id,
    name: `Table ${id}`,
    source: 'csv',
    columns: [
      { field: 'a', title: 'a', dataType: 'number' },
      { field: 'b', title: 'b', dataType: 'string' },
    ],
    rows: [{ a: 1, b: 'x' }, { a: 2, b: 'y' }, { a: 3, b: 'z' }],
    filters: [],
    views: [],
    ...opts,
  }
}

function combine(joinType: CombineSpec['joinType'], left: CombineSpec['left'], right: CombineSpec['right']): CombineSpec {
  return { joinType, left, right, keys: [{ left: 'a', right: 'a' }] }
}

function analysis(tables: AnalysisTable[]): Analysis {
  return { id: 'a1', name: 'A', createdAt: 't', updatedAt: 't', tables, flowchartLayout: {} }
}

/* ---------------------------------- 用例 ---------------------------------- */

describe('buildFlowGraph', () => {
  it('空 analysis：无节点无边', () => {
    const g = buildFlowGraph(analysis([]))
    expect(g.nodes).toHaveLength(0)
    expect(g.edges).toHaveLength(0)
  })

  it('孤立单表（无视图）：仅表节点，摘要正确，无边', () => {
    const g = buildFlowGraph(analysis([table('t1')]))
    expect(g.nodes).toHaveLength(1)
    const n = g.nodes[0]
    expect(n.id).toBe(tableNodeId('t1'))
    expect(n.kind).toBe('table')
    expect(n.source).toBe('csv')
    expect(n.rowCount).toBe(3)
    expect(n.columnCount).toBe(2)
    expect(n.viewCount).toBe(0)
    expect(n.valid).toBe(true)
    expect(g.edges).toHaveLength(0)
  })

  it('单表多视图多级嵌套：表→视图→子视图逐级连边，viewType 透传', () => {
    const t = table('t1', {
      views: [view('v1', 'bar', [view('v2', 'line', [view('v3', 'heatmap')])])],
    })
    const g = buildFlowGraph(analysis([t]))
    expect(g.nodes).toHaveLength(4)
    const ids = g.edges.map((e) => `${e.source}->${e.target}`)
    expect(ids).toContain(`${tableNodeId('t1')}->${viewNodeId('v1')}`)
    expect(ids).toContain(`${viewNodeId('v1')}->${viewNodeId('v2')}`)
    expect(ids).toContain(`${viewNodeId('v2')}->${viewNodeId('v3')}`)
    const byId = new Map(g.nodes.map((n) => [n.id, n]))
    expect(byId.get(viewNodeId('v2'))?.viewType).toBe('line')
    expect(byId.get(viewNodeId('v3'))?.viewType).toBe('heatmap')
    // 表节点视图计数含全部后代
    expect(byId.get(tableNodeId('t1'))?.viewCount).toBe(3)
    // childCount 仅直接子级
    expect(byId.get(viewNodeId('v1'))?.childCount).toBe(1)
    expect(byId.get(viewNodeId('v3'))?.childCount).toBe(0)
  })

  it('多表：各自独立成节点，互不连边', () => {
    const g = buildFlowGraph(analysis([table('t1'), table('t2')]))
    expect(g.nodes).toHaveLength(2)
    expect(g.edges).toHaveLength(0)
  })

  it('combine（两表输入）：输入→步骤节点→结果表', () => {
    const t3 = table('t3', {
      source: 'combine',
      combine: combine('inner', { kind: 'table', tableId: 't1' }, { kind: 'table', tableId: 't2' }),
    })
    const g = buildFlowGraph(analysis([table('t1'), table('t2'), t3]))
    const stepId = combineStepNodeId('t3')
    const step = g.nodes.find((n) => n.id === stepId)
    expect(step).toBeDefined()
    expect(step?.kind).toBe('combine-step')
    expect(step?.joinType).toBe('inner')
    expect(step?.joinKeyCount).toBe(1)
    expect(step?.valid).toBe(true)
    expect(step?.contextLabel).toBe('Table t3')
    const ids = g.edges.map((e) => `${e.source}->${e.target}`)
    expect(ids).toContain(`${tableNodeId('t1')}->${stepId}`)
    expect(ids).toContain(`${tableNodeId('t2')}->${stepId}`)
    expect(ids).toContain(`${stepId}->${tableNodeId('t3')}`)
  })

  it('combine（表+视图混合输入）：视图输入从该视图节点连出', () => {
    const t1 = table('t1', { views: [view('v1', 'scatter')] })
    const t3 = table('t3', {
      source: 'combine',
      combine: combine(
        'left',
        { kind: 'view', tableId: 't1', viewId: 'v1' },
        { kind: 'table', tableId: 't2' },
      ),
    })
    const g = buildFlowGraph(analysis([t1, table('t2'), t3]))
    const stepId = combineStepNodeId('t3')
    const ids = g.edges.map((e) => `${e.source}->${e.target}`)
    expect(ids).toContain(`${viewNodeId('v1')}->${stepId}`)
    expect(ids).toContain(`${tableNodeId('t2')}->${stepId}`)
  })

  it('combine 输入失效（视图已删）：步骤节点标 invalid，缺失边不生成，步骤→结果表边保留', () => {
    const t3 = table('t3', {
      source: 'combine',
      combine: combine(
        'full',
        { kind: 'view', tableId: 't1', viewId: 'gone' },
        { kind: 'table', tableId: 't2' },
      ),
    })
    const g = buildFlowGraph(analysis([table('t1'), table('t2'), t3]))
    const stepId = combineStepNodeId('t3')
    const step = g.nodes.find((n) => n.id === stepId)
    expect(step?.valid).toBe(false)
    const ids = g.edges.map((e) => `${e.source}->${e.target}`)
    expect(ids.some((s) => s.includes('gone'))).toBe(false)
    expect(ids).toContain(`${tableNodeId('t2')}->${stepId}`)
    expect(ids).toContain(`${stepId}->${tableNodeId('t3')}`)
  })

  it('combine 输入引用不存在的表：invalid 且无边', () => {
    const t3 = table('t3', {
      source: 'combine',
      combine: combine('append', { kind: 'table', tableId: 'nope' }, { kind: 'table', tableId: 't2' }),
    })
    const g = buildFlowGraph(analysis([table('t2'), t3]))
    const step = g.nodes.find((n) => n.id === combineStepNodeId('t3'))
    expect(step?.valid).toBe(false)
    expect(g.edges.some((e) => e.source === tableNodeId('nope'))).toBe(false)
  })

  it('普通表（source 非 combine）不产生步骤节点', () => {
    const g = buildFlowGraph(analysis([table('t1'), table('t2', { source: 'demo' })]))
    expect(g.nodes.every((n) => n.kind !== 'combine-step')).toBe(true)
  })

  it('邻接查询：upstreamOf / downstreamOf', () => {
    const t = table('t1', { views: [view('v1', 'bar', [view('v2', 'pie')])] })
    const g = buildFlowGraph(analysis([t]))
    expect(upstreamOf(g, viewNodeId('v2')).map((n) => n.id)).toEqual([viewNodeId('v1')])
    expect(downstreamOf(g, tableNodeId('t1')).map((n) => n.id)).toEqual([viewNodeId('v1')])
    expect(upstreamOf(g, tableNodeId('t1'))).toHaveLength(0)
    expect(downstreamOf(g, viewNodeId('v2'))).toHaveLength(0)
  })
})
