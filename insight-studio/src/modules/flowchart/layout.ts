/**
 * 流程图布局（纯函数，可单测）。
 * 分层 DAG 布局：自左向右，源节点在左；按拓扑深度分列，同列垂直均分。
 * 不引依赖，自己实现。
 */
import type { FlowGraph } from './graph'

export interface FlowPoint {
  x: number
  y: number
}

/** 节点尺寸与间距常量（与 FlowNode.vue 卡片尺寸一致）。 */
export const NODE_WIDTH = 200
export const NODE_HEIGHT = 56
export const COLUMN_GAP = 120
export const ROW_GAP = 32

const COLUMN_STEP = NODE_WIDTH + COLUMN_GAP
const ROW_STEP = NODE_HEIGHT + ROW_GAP

/** 每个节点的父节点列表。 */
function buildParentMap(graph: FlowGraph): Map<string, string[]> {
  const parents = new Map<string, string[]>()
  for (const e of graph.edges) {
    const list = parents.get(e.target)
    if (list) list.push(e.source)
    else parents.set(e.target, [e.source])
  }
  return parents
}

/**
 * 拓扑深度：无入边 = 0，否则 1 + max(父深度)。
 * 带环保护（流程图拓扑理论无环，防御损坏数据）。
 */
export function computeDepths(graph: FlowGraph): Map<string, number> {
  const parents = buildParentMap(graph)
  const depths = new Map<string, number>()
  const visiting = new Set<string>()

  const depthOf = (id: string): number => {
    const cached = depths.get(id)
    if (cached !== undefined) return cached
    if (visiting.has(id)) return 0
    visiting.add(id)
    const ps = parents.get(id) ?? []
    let d = 0
    for (const p of ps) d = Math.max(d, depthOf(p) + 1)
    visiting.delete(id)
    depths.set(id, d)
    return d
  }

  for (const n of graph.nodes) depthOf(n.id)
  return depths
}

/** 全自动布局：按深度分列（x），同列按声明序垂直均分（y）。 */
export function autoLayout(graph: FlowGraph): Record<string, FlowPoint> {
  const depths = computeDepths(graph)
  const columnIndex = new Map<number, number>()
  const out: Record<string, FlowPoint> = {}
  for (const n of graph.nodes) {
    const d = depths.get(n.id) ?? 0
    const row = columnIndex.get(d) ?? 0
    columnIndex.set(d, row + 1)
    out[n.id] = { x: d * COLUMN_STEP, y: row * ROW_STEP }
  }
  return out
}

/** 两节点矩形（含 padding）是否重叠。 */
function overlaps(a: FlowPoint, b: FlowPoint): boolean {
  return a.x < b.x + NODE_WIDTH && b.x < a.x + NODE_WIDTH && a.y < b.y + NODE_HEIGHT && b.y < a.y + NODE_HEIGHT
}

/**
 * 解析最终坐标：
 * - 有保存位置的节点用保存位置（用户拖拽结果，权威）；
 * - 新节点自动落位：优先追加在已落位父节点右侧，逐行下移避让已有节点；
 *   无父节点（新表）用自动布局位并同样避让。
 */
export function resolvePositions(
  graph: FlowGraph,
  savedLayout: Record<string, FlowPoint> = {},
): Record<string, FlowPoint> {
  const depths = computeDepths(graph)
  const auto = autoLayout(graph)
  const parents = buildParentMap(graph)
  // 父先子后处理，保证「追加在父节点右侧」时父已落位
  const order = [...graph.nodes].sort((a, b) => (depths.get(a.id) ?? 0) - (depths.get(b.id) ?? 0))

  const placed: FlowPoint[] = []
  const out: Record<string, FlowPoint> = {}

  for (const node of order) {
    const saved = savedLayout[node.id]
    let pos: FlowPoint
    if (saved && Number.isFinite(saved.x) && Number.isFinite(saved.y)) {
      pos = { x: saved.x, y: saved.y }
    } else {
      const resolvedParents = (parents.get(node.id) ?? [])
        .map((p) => out[p])
        .filter((p): p is FlowPoint => !!p)
      if (resolvedParents.length) {
        const rightmost = resolvedParents.reduce((m, p) => (p.x > m.x ? p : m))
        pos = { x: rightmost.x + COLUMN_STEP, y: rightmost.y }
      } else {
        pos = { ...(auto[node.id] ?? { x: 0, y: 0 }) }
      }
      while (placed.some((p) => overlaps(p, pos))) {
        pos = { x: pos.x, y: pos.y + ROW_STEP }
      }
    }
    out[node.id] = pos
    placed.push(pos)
  }

  return out
}
