/**
 * 流程图拓扑构建（基于 StepNode 模型）。
 * 节点 = 步骤节点；边 = 步骤输入引用。
 * 同时叠加视图树作为只读浏览节点（表节点 → 视图节点 → 子视图）。
 */
import type { Analysis, StepNode, StepType, ViewNode, ViewType } from '../../shared/types'
import { countViews, findTable, findView } from '../../shared/tree'
import { getStepDef } from '../steps/registry'

export type FlowNodeKind = 'step' | 'view'

export interface FlowNodePort {
  name: string
  type: 'table' | 'file' | 'chart'
  multiple?: boolean
}

export interface FlowNodeData {
  id: string
  kind: FlowNodeKind
  label: string
  /** 步骤节点 id；view 节点无 stepId。 */
  stepId?: string
  /** 视图节点专属。 */
  viewId?: string
  tableId?: string
  viewType?: ViewType
  /** 步骤类型（步骤节点）。 */
  stepType?: StepType
  /** 输入/输出端口。 */
  inputs: FlowNodePort[]
  outputs: FlowNodePort[]
  /** 节点状态（步骤节点）。 */
  status?: 'pending' | 'configured' | 'running' | 'failed' | 'stale'
  error?: string
  rowCount?: number
  columnCount?: number
  viewCount?: number
  childCount?: number
  /** 节点是否完整有效（输入全部解析）。 */
  valid: boolean
}

export interface FlowEdgeData {
  id: string
  source: string
  target: string
  sourcePort: string
  targetPort: string
}

export interface FlowGraph {
  nodes: FlowNodeData[]
  edges: FlowEdgeData[]
}

/* ---------------------------------- id 约定 ---------------------------------- */

export function stepNodeId(stepId: string): string {
  return `step:${stepId}`
}

export function viewNodeId(viewId: string): string {
  return `view:${viewId}`
}

function edgeId(source: string, target: string, sourcePort: string, targetPort: string): string {
  return `e:${source}:${sourcePort}->${target}:${targetPort}`
}

/* --------------------------------- 文案标签 --------------------------------- */

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

export function stepTypeLabel(t: StepType): string {
  const def = getStepDef(t)
  return def.label
}

/* --------------------------------- 步骤节点 --------------------------------- */

function buildStepNodeData(analysis: Analysis, step: StepNode): FlowNodeData {
  const def = getStepDef(step.type)
  const outputTable = step.output.tables[0] ? findTable(analysis, step.output.tables[0]) : undefined

  return {
    id: stepNodeId(step.id),
    kind: 'step',
    label: step.name,
    stepId: step.id,
    stepType: step.type,
    inputs: def.inputs.map((p) => ({ name: p.name, type: p.type, multiple: p.multiple })),
    outputs: def.outputs.map((p) => ({ name: p.name, type: p.type, multiple: p.multiple })),
    status: step.status,
    error: step.error,
    rowCount: outputTable?.rows.length,
    columnCount: outputTable?.columns.length,
    valid: step.status !== 'pending' && step.status !== 'failed',
  }
}

/* --------------------------------- 视图节点 --------------------------------- */

function pushViewNodes(
  view: ViewNode,
  table: { id: string; views: ViewNode[] },
  parentFlowId: string,
  nodes: FlowNodeData[],
  edges: FlowEdgeData[],
  sourcePort: string,
): void {
  const id = viewNodeId(view.id)
  nodes.push({
    id,
    kind: 'view',
    label: view.name,
    tableId: table.id,
    viewId: view.id,
    viewType: view.type,
    // 视图节点用固定 in/out 锚点，保证连线落在左侧/右侧（而非默认顶部）。
    inputs: [{ name: 'in', type: 'table' }],
    outputs: [{ name: 'out', type: 'table' }],
    childCount: view.children.length,
    valid: true,
  })
  edges.push({
    id: edgeId(parentFlowId, id, sourcePort, 'in'),
    source: parentFlowId,
    target: id,
    sourcePort,
    targetPort: 'in',
  })
  for (const child of view.children) pushViewNodes(child, table, id, nodes, edges, 'out')
}

/* --------------------------------- 拓扑构建 --------------------------------- */

/** 由 Analysis 的 steps + 视图树派生流程图节点与边。 */
export function buildFlowGraph(analysis: Analysis): FlowGraph {
  const nodes: FlowNodeData[] = []
  const edges: FlowEdgeData[] = []
  const stepNodeMap = new Map<string, FlowNodeData>()

  // 步骤节点
  for (const step of analysis.steps) {
    const n = buildStepNodeData(analysis, step)
    nodes.push(n)
    stepNodeMap.set(step.id, n)
  }

  // 步骤输入边
  for (const step of analysis.steps) {
    const targetId = stepNodeId(step.id)
    for (const input of step.inputs) {
      const sourceNode = stepNodeMap.get(input.from.nodeId)
      if (!sourceNode) continue
      edges.push({
        id: edgeId(sourceNode.id, targetId, input.from.port, input.port),
        source: sourceNode.id,
        target: targetId,
        sourcePort: input.from.port,
        targetPort: input.port,
      })
    }
  }

  // 视图树节点：挂在对应输出表所属步骤节点下。
  // 一张表若由步骤产出，则该表下的视图作为该步骤节点的子节点。
  for (const table of analysis.tables) {
    if (!table.stepId || table.views.length === 0) continue
    const parentStep = analysis.steps.find((s) => s.id === table.stepId)
    if (!parentStep) continue
    const parentId = stepNodeId(parentStep.id)
    const tableMeta = { id: table.id, views: table.views }
    const sourcePort =
      getStepDef(parentStep.type).outputs.find((p) => p.type === 'table')?.name ??
      getStepDef(parentStep.type).outputs[0]?.name ??
      'Output dataset'
    for (const view of table.views) pushViewNodes(view, tableMeta, parentId, nodes, edges, sourcePort)
  }

  return { nodes, edges }
}

/**
 * 将流程图源节点解析为步骤输入引用（from.nodeId 必须是 step.id）。
 * - 步骤节点：直接用其 stepId + 拖出的端口名
 * - 视图节点：回落到该视图所属表的产出步骤及其 table 输出端口
 *   （保证 Filter 等挂在正确的数据表下，侧栏/布局一层层对应）
 */
export function resolveStepSourceRef(
  analysis: Analysis,
  node: FlowNodeData,
  handlePort: string,
): { nodeId: string; port: string } | null {
  if (node.kind === 'step' && node.stepId) {
    return { nodeId: node.stepId, port: handlePort }
  }
  if (node.kind === 'view' && node.tableId) {
    const table = findTable(analysis, node.tableId)
    if (!table?.stepId) return null
    const step = analysis.steps.find((s) => s.id === table.stepId)
    if (!step) return null
    const port =
      getStepDef(step.type).outputs.find((p) => p.type === 'table')?.name ??
      getStepDef(step.type).outputs[0]?.name ??
      'Output dataset'
    return { nodeId: table.stepId, port }
  }
  return null
}

/* --------------------------------- 邻接查询 --------------------------------- */

export function upstreamOf(graph: FlowGraph, id: string): FlowNodeData[] {
  const byId = new Map(graph.nodes.map((n) => [n.id, n]))
  return graph.edges.filter((e) => e.target === id).map((e) => byId.get(e.source)!)
}

export function downstreamOf(graph: FlowGraph, id: string): FlowNodeData[] {
  const byId = new Map(graph.nodes.map((n) => [n.id, n]))
  return graph.edges.filter((e) => e.source === id).map((e) => byId.get(e.target)!)
}
