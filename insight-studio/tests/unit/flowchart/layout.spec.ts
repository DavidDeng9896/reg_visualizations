import { describe, expect, it } from 'vitest'
import {
  COLUMN_GAP,
  NODE_HEIGHT,
  NODE_WIDTH,
  ROW_GAP,
  autoLayout,
  computeDepths,
  resolvePositions,
} from '../../../src/modules/flowchart/layout'
import type { FlowGraph, FlowNodeData } from '../../../src/modules/flowchart/graph'

/* --------------------------------- 测试工厂 --------------------------------- */

function node(id: string, kind: FlowNodeData['kind'] = 'view'): FlowNodeData {
  return { id, kind, label: id, tableId: 't', valid: true }
}

function graph(nodes: FlowNodeData[], edges: [string, string][]): FlowGraph {
  return { nodes, edges: edges.map(([s, t]) => ({ id: `e:${s}->${t}`, source: s, target: t })) }
}

const COLUMN_STEP = NODE_WIDTH + COLUMN_GAP
const ROW_STEP = NODE_HEIGHT + ROW_GAP

/* ---------------------------------- 用例 ---------------------------------- */

describe('computeDepths · 拓扑深度', () => {
  it('源节点在 0 层，子代逐层递增', () => {
    const g = graph([node('t'), node('v1'), node('v2'), node('v3')], [
      ['t', 'v1'],
      ['v1', 'v2'],
      ['v2', 'v3'],
    ])
    const d = computeDepths(g)
    expect(d.get('t')).toBe(0)
    expect(d.get('v1')).toBe(1)
    expect(d.get('v2')).toBe(2)
    expect(d.get('v3')).toBe(3)
  })

  it('combine 步骤 = 输入最大深度 + 1，结果表再 +1', () => {
    // v1(1) 与 t2(0) → step(2) → t3(3)
    const g = graph([node('t1'), node('v1'), node('t2'), node('step'), node('t3')], [
      ['t1', 'v1'],
      ['v1', 'step'],
      ['t2', 'step'],
      ['step', 't3'],
    ])
    const d = computeDepths(g)
    expect(d.get('step')).toBe(2)
    expect(d.get('t3')).toBe(3)
  })

  it('环数据不挂死（防御）', () => {
    const g = graph([node('a'), node('b')], [
      ['a', 'b'],
      ['b', 'a'],
    ])
    const d = computeDepths(g)
    expect(d.get('a')).toBeTypeOf('number')
    expect(d.get('b')).toBeTypeOf('number')
  })
})

describe('autoLayout · 分层 DAG', () => {
  it('父在左、子在右；同列垂直均分', () => {
    const g = graph([node('t1'), node('t2'), node('v1'), node('v2')], [
      ['t1', 'v1'],
      ['t2', 'v2'],
    ])
    const pos = autoLayout(g)
    expect(pos['t1'].x).toBe(0)
    expect(pos['v1'].x).toBe(COLUMN_STEP)
    expect(pos['t2'].x).toBe(0)
    expect(pos['t2'].y).toBe(ROW_STEP)
    // 同列不重叠
    expect(pos['v2'].y).toBe(ROW_STEP)
  })

  it('空图返回空对象', () => {
    expect(autoLayout(graph([], []))).toEqual({})
  })
})

describe('resolvePositions · 持久化优先 + 新节点避让', () => {
  it('savedLayout 优先：坐标原样采用', () => {
    const g = graph([node('t'), node('v')], [['t', 'v']])
    const pos = resolvePositions(g, { t: { x: 1000, y: 777 } })
    expect(pos['t']).toEqual({ x: 1000, y: 777 })
  })

  it('新节点追加在已保存父节点右侧', () => {
    const g = graph([node('t'), node('v')], [['t', 'v']])
    const pos = resolvePositions(g, { t: { x: 1000, y: 500 } })
    expect(pos['v'].x).toBe(1000 + COLUMN_STEP)
    expect(pos['v'].y).toBe(500)
  })

  it('新节点与已落位节点重叠时逐行下移避让', () => {
    // t(0) saved {0,0}；t2(0) saved {320,0}；v 是 t 的新子节点，候选 {320,0} 与 t2 冲突
    const g = graph([node('t'), node('t2'), node('v')], [['t', 'v']])
    const pos = resolvePositions(g, { t: { x: 0, y: 0 }, t2: { x: COLUMN_STEP, y: 0 } })
    expect(pos['v'].x).toBe(COLUMN_STEP)
    expect(pos['v'].y).toBe(ROW_STEP)
  })

  it('多输入新节点落在最右父节点右侧', () => {
    const g = graph([node('a'), node('b'), node('c')], [
      ['a', 'c'],
      ['b', 'c'],
    ])
    const pos = resolvePositions(g, { a: { x: 0, y: 0 }, b: { x: COLUMN_STEP, y: 400 } })
    expect(pos['c'].x).toBe(COLUMN_STEP * 2)
    expect(pos['c'].y).toBe(400)
  })

  it('失效 saved（NaN）回退自动布局', () => {
    const g = graph([node('t')], [])
    const pos = resolvePositions(g, { t: { x: Number.NaN, y: 0 } })
    expect(pos['t']).toEqual({ x: 0, y: 0 })
  })

  it('已删除节点的 saved 条目被忽略，空图返回空对象', () => {
    const g = graph([], [])
    expect(resolvePositions(g, { ghost: { x: 1, y: 2 } })).toEqual({})
  })

  it('同列多个新节点互不重叠', () => {
    const g = graph([node('v1'), node('v2'), node('v3')], [])
    const pos = resolvePositions(g, {})
    const ys = [pos['v1'].y, pos['v2'].y, pos['v3'].y]
    expect(new Set(ys).size).toBe(3)
  })
})
