/**
 * 流程图拓扑构建（纯函数，可单测）。
 * 依据 DESIGN.md §5 与 specs §7：节点 = 表 / 视图 / combine 步骤；边 = 派生关系（自动推导，不可手改）。
 */
import type {
  Analysis,
  AnalysisTable,
  CombineInputRef,
  JoinType,
  TableSource,
  ViewNode,
  ViewType,
} from '../../shared/types'
import { countViews, findTable, findView } from '../../shared/tree'

export type FlowNodeKind = 'table' | 'view' | 'combine-step'

/** 流程图节点数据（挂在 vue-flow node.data 上）。 */
export interface FlowNodeData {
  /** 流程图节点 id（带命名空间，亦作为 flowchartLayout 的 key）。 */
  id: string
  kind: FlowNodeKind
  label: string
  /** 所属/产物表 id（视图 = 挂载表；combine 步骤 = 结果表）。 */
  tableId: string
  viewId?: string
  viewType?: ViewType
  /** 表来源徽标（表节点）。 */
  source?: TableSource
  /** combine 步骤的 join 类型。 */
  joinType?: JoinType
  /** combine 步骤的补充说明（结果表名）。 */
  contextLabel?: string
  /* ---- 摘要 ---- */
  rowCount?: number
  columnCount?: number
  /** 表的全部后代视图数。 */
  viewCount?: number
  /** 视图的直接子视图数。 */
  childCount?: number
  filterCount?: number
  transformCount?: number
  joinKeyCount?: number
  /** 拓扑完整性：combine 输入引用缺失时为 false（显示警告而非对勾）。 */
  valid: boolean
}

export interface FlowEdgeData {
  id: string
  source: string
  target: string
}

export interface FlowGraph {
  nodes: FlowNodeData[]
  edges: FlowEdgeData[]
}

/* ---------------------------------- id 约定 ---------------------------------- */

export function tableNodeId(tableId: string): string {
  return `table:${tableId}`
}
export function viewNodeId(viewId: string): string {
  return `view:${viewId}`
}
export function combineStepNodeId(tableId: string): string {
  return `combine-step:${tableId}`
}

function edgeId(source: string, target: string): string {
  return `e:${source}->${target}`
}

/* --------------------------------- 文案标签 --------------------------------- */

export function joinTypeLabel(j: JoinType): string {
  switch (j) {
    case 'left':
      return 'Left join'
    case 'inner':
      return 'Inner join'
    case 'right':
      return 'Right join'
    case 'full':
      return 'Full join'
    case 'append':
      return 'Append'
  }
}

export function viewTypeLabel(t: ViewType): string {
  switch (t) {
    case 'table':
      return 'Table'
    case 'bar':
      return 'Bar chart'
    case 'line':
      return 'Line chart'
    case 'scatter':
      return 'Scatter plot'
    case 'box':
      return 'Box plot'
    case 'pie':
      return 'Pie chart'
    case 'heatmap':
      return 'Heatmap'
  }
}

export function sourceLabel(s: TableSource): string {
  switch (s) {
    case 'csv':
      return 'CSV'
    case 'combine':
      return 'Combine'
    case 'demo':
      return 'Demo'
  }
}

/* --------------------------------- 拓扑构建 --------------------------------- */

/** combine 输入引用 → 流程图节点 id；引用失效（表/视图已删）返回 null。 */
function resolveInputRef(analysis: Analysis, ref: CombineInputRef): string | null {
  const t = findTable(analysis, ref.tableId)
  if (!t) return null
  if (ref.kind === 'table') return tableNodeId(t.id)
  if (!ref.viewId) return null
  return findView(t.views, ref.viewId) ? viewNodeId(ref.viewId) : null
}

function pushViewNodes(
  view: ViewNode,
  table: AnalysisTable,
  parentFlowId: string,
  nodes: FlowNodeData[],
  edges: FlowEdgeData[],
): void {
  const id = viewNodeId(view.id)
  nodes.push({
    id,
    kind: 'view',
    label: view.name,
    tableId: table.id,
    viewId: view.id,
    viewType: view.type,
    childCount: view.children.length,
    filterCount: view.filters.length,
    transformCount: view.transforms.length,
    valid: true,
  })
  edges.push({ id: edgeId(parentFlowId, id), source: parentFlowId, target: id })
  for (const child of view.children) pushViewNodes(child, table, id, nodes, edges)
}

/** 由 Analysis 派生流程图节点与边。纯函数；同输入稳定输出（节点按表/视图声明序）。 */
export function buildFlowGraph(analysis: Analysis): FlowGraph {
  const nodes: FlowNodeData[] = []
  const edges: FlowEdgeData[] = []

  for (const table of analysis.tables) {
    const tId = tableNodeId(table.id)
    nodes.push({
      id: tId,
      kind: 'table',
      label: table.name,
      tableId: table.id,
      source: table.source,
      rowCount: table.rows.length,
      columnCount: table.columns.length,
      viewCount: countViews(table.views),
      valid: true,
    })

    // combine 来源：输入（表/视图）→ combine 步骤节点 → 结果表
    if (table.combine) {
      const stepId = combineStepNodeId(table.id)
      const leftId = resolveInputRef(analysis, table.combine.left)
      const rightId = resolveInputRef(analysis, table.combine.right)
      nodes.push({
        id: stepId,
        kind: 'combine-step',
        label: joinTypeLabel(table.combine.joinType),
        contextLabel: table.name,
        tableId: table.id,
        joinType: table.combine.joinType,
        joinKeyCount: table.combine.keys.length,
        valid: leftId !== null && rightId !== null,
      })
      for (const src of [leftId, rightId]) {
        if (src) edges.push({ id: edgeId(src, stepId), source: src, target: stepId })
      }
      edges.push({ id: edgeId(stepId, tId), source: stepId, target: tId })
    }

    // 表 → 根视图 → 子视图（多级嵌套）
    for (const view of table.views) pushViewNodes(view, table, tId, nodes, edges)
  }

  return { nodes, edges }
}

/* --------------------------------- 邻接查询 --------------------------------- */

/** 上游节点（Inputs）。 */
export function upstreamOf(graph: FlowGraph, id: string): FlowNodeData[] {
  const byId = new Map(graph.nodes.map((n) => [n.id, n]))
  return graph.edges.filter((e) => e.target === id).map((e) => byId.get(e.source)!)
}

/** 下游节点（Outputs）。 */
export function downstreamOf(graph: FlowGraph, id: string): FlowNodeData[] {
  const byId = new Map(graph.nodes.map((n) => [n.id, n]))
  return graph.edges.filter((e) => e.source === id).map((e) => byId.get(e.target)!)
}
