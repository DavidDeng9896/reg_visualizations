/**
 * 流程图布局（纯函数，可单测）。
 * 分层家族树：父节点在左；子节点在右侧一列，按「视图(图) → 步骤」顺序自上而下，
 * 使图形紧跟所属数据，加工步骤再向下/向右展开。
 */
import type { FlowGraph, FlowNodeData } from './graph'

export interface FlowPoint {
  x: number
  y: number
}

/** 节点尺寸与间距（步骤竖卡更高，行距留足）。 */
export const NODE_WIDTH = 240
export const NODE_HEIGHT = 72
export const COLUMN_GAP = 100
export const ROW_GAP = 40

const COLUMN_STEP = NODE_WIDTH + COLUMN_GAP
const ROW_STEP = NODE_HEIGHT + ROW_GAP

/**
 * 估算节点卡片实际渲染高度（flow px）。
 * FlowNode 步骤竖卡 = 头部 + pending/错误横幅 + Inputs/Outputs 分区（分区标题 + 端口行），
 * 实际远高于 NODE_HEIGHT；避让/子树占位需按估算高度，否则同列卡片重叠压住端口。
 * 无端口、无横幅的节点回退到 NODE_HEIGHT，保持既有布局间距不变。
 */
const BANNER_HEIGHT = 38
const SECTION_HEADER = 34
const PORT_ROW = 30

export function estimateNodeHeight(n: FlowNodeData): number {
  if (n.kind !== 'step') return NODE_HEIGHT
  let h = NODE_HEIGHT
  if (n.status === 'pending' || (n.status === 'failed' && n.error)) h += BANNER_HEIGHT
  if (n.inputs.length) h += SECTION_HEADER + n.inputs.length * PORT_ROW
  if (n.outputs.length) h += SECTION_HEADER + n.outputs.length * PORT_ROW
  return h
}
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

/** 每个节点的子节点列表（按边声明序）。 */
function buildChildrenMap(graph: FlowGraph): Map<string, string[]> {
  const children = new Map<string, string[]>()
  for (const e of graph.edges) {
    const list = children.get(e.source)
    if (list) list.push(e.target)
    else children.set(e.source, [e.target])
  }
  return children
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

/** 子节点排序：视图(图)在前，步骤在后 —— 图形紧跟数据。 */
function sortChildren(ids: string[], byId: Map<string, FlowNodeData>): string[] {
  return [...ids].sort((a, b) => {
    const ka = byId.get(a)?.kind === 'view' ? 0 : 1
    const kb = byId.get(b)?.kind === 'view' ? 0 : 1
    if (ka !== kb) return ka - kb
    return 0
  })
}

/**
 * 全自动布局：
 * - 根节点（无入边）自上而下排在第 0 列
 * - 每个父节点的子节点排在右侧一列，视图优先、步骤其次
 * - 递归子树占位，避免兄弟子树重叠
 */
export function autoLayout(graph: FlowGraph): Record<string, FlowPoint> {
  const byId = new Map(graph.nodes.map((n) => [n.id, n]))
  const parents = buildParentMap(graph)
  const children = buildChildrenMap(graph)
  const out: Record<string, FlowPoint> = {}
  const placed = new Set<string>()

  const roots = graph.nodes.filter((n) => !(parents.get(n.id)?.length))

  /** 放置子树，返回该子树占用的垂直高度（至少自身卡片高度 + 行距）。 */
  const layoutSubtree = (id: string, x: number, y: number): number => {
    out[id] = { x, y }
    placed.add(id)
    const own = estimateNodeHeight(byId.get(id)!) + ROW_GAP
    const kids = sortChildren(children.get(id) ?? [], byId).filter((k) => !placed.has(k))
    if (!kids.length) return own

    let cursor = y
    let total = 0
    for (const kid of kids) {
      const h = layoutSubtree(kid, x + COLUMN_STEP, cursor)
      cursor += h
      total += h
    }
    return Math.max(own, total)
  }

  let rootY = 0
  for (const root of roots) {
    if (placed.has(root.id)) continue
    const h = layoutSubtree(root.id, 0, rootY)
    rootY += h
  }

  // 防御：有入边但因多父/环未放入的节点，追加到底部
  for (const n of graph.nodes) {
    if (placed.has(n.id)) continue
    out[n.id] = { x: 0, y: rootY }
    placed.add(n.id)
    rootY += estimateNodeHeight(n) + ROW_GAP
  }

  return out
}

/** 已落位节点矩形（含按卡片内容估算的高度）。 */
interface PlacedRect extends FlowPoint {
  h: number
}

/** 两节点矩形是否重叠。 */
function overlaps(a: PlacedRect, b: PlacedRect): boolean {
  return a.x < b.x + NODE_WIDTH && b.x < a.x + NODE_WIDTH && a.y < b.y + b.h && b.y < a.y + a.h
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
  // 全部节点已有持久化坐标：直接返回，避免每次打开都跑 autoLayout
  if (graph.nodes.length > 0) {
    const allSaved = graph.nodes.every((n) => {
      const p = savedLayout[n.id]
      return !!p && Number.isFinite(p.x) && Number.isFinite(p.y)
    })
    if (allSaved) {
      const out: Record<string, FlowPoint> = {}
      for (const n of graph.nodes) {
        const p = savedLayout[n.id]!
        out[n.id] = { x: p.x, y: p.y }
      }
      return out
    }
  }

  const depths = computeDepths(graph)
  const auto = autoLayout(graph)
  const parents = buildParentMap(graph)
  const byId = new Map(graph.nodes.map((n) => [n.id, n]))
  // 父先子后；同层视图优先于步骤，保证新图落在数据旁
  const order = [...graph.nodes].sort((a, b) => {
    const da = depths.get(a.id) ?? 0
    const db = depths.get(b.id) ?? 0
    if (da !== db) return da - db
    const ka = a.kind === 'view' ? 0 : 1
    const kb = b.kind === 'view' ? 0 : 1
    return ka - kb
  })

  const placed: PlacedRect[] = []
  const out: Record<string, FlowPoint> = {}

  for (const node of order) {
    const saved = savedLayout[node.id]
    const h = estimateNodeHeight(node)
    let pos: FlowPoint
    if (saved && Number.isFinite(saved.x) && Number.isFinite(saved.y)) {
      pos = { x: saved.x, y: saved.y }
    } else {
      const resolvedParents = (parents.get(node.id) ?? [])
        .map((p) => out[p])
        .filter((p): p is FlowPoint => !!p)
      if (resolvedParents.length) {
        const parent = resolvedParents.reduce((m, p) => (p.x > m.x ? p : m))
        // 视图紧跟父节点右侧同起点；步骤稍向下错开，避免压住图
        const isView = byId.get(node.id)?.kind === 'view'
        pos = {
          x: parent.x + COLUMN_STEP,
          y: isView ? parent.y : parent.y + ROW_STEP,
        }
      } else {
        pos = { ...(auto[node.id] ?? { x: 0, y: 0 }) }
      }
      const rect = (): PlacedRect => ({ ...pos, h })
      while (placed.some((p) => overlaps(p, rect()))) {
        pos = { x: pos.x, y: pos.y + ROW_STEP }
      }
    }
    out[node.id] = pos
    placed.push({ ...pos, h })
  }

  return out
}
