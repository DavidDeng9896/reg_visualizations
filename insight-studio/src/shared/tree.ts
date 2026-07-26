import type { Analysis, AnalysisTable, ViewNode } from './types'

/** 视图树遍历/查找工具。 */

export function findTable(analysis: Analysis, tableId: string): AnalysisTable | undefined {
  return analysis.tables.find((t) => t.id === tableId)
}

/**
 * 单输入步骤产出的表 → 上游步骤首个输出表 id；
 * 源表 / 多输入（Join·Union）/ 无步骤 → null（侧栏根级）。
 */
export function upstreamTableId(analysis: Analysis, table: AnalysisTable): string | null {
  if (!table.stepId) return null
  const producer = analysis.steps.find((s) => s.id === table.stepId)
  if (!producer || producer.inputs.length !== 1) return null
  const upstreamStep = analysis.steps.find((s) => s.id === producer.inputs[0].from.nodeId)
  const parentId = upstreamStep?.output.tables[0]
  if (!parentId || parentId === table.id) return null
  return parentId
}

export interface TableTreeNode {
  table: AnalysisTable
  children: TableTreeNode[]
}

/** 按步骤血缘把扁平 tables[] 建成森林（派生表挂到上游表下）。 */
export function buildTableForest(analysis: Analysis): TableTreeNode[] {
  const byId = new Map(analysis.tables.map((t) => [t.id, t]))
  const childrenOf = new Map<string, AnalysisTable[]>()
  const roots: AnalysisTable[] = []

  for (const t of analysis.tables) {
    const parentId = upstreamTableId(analysis, t)
    if (parentId && byId.has(parentId)) {
      const list = childrenOf.get(parentId) ?? []
      list.push(t)
      childrenOf.set(parentId, list)
    } else {
      roots.push(t)
    }
  }

  const walk = (table: AnalysisTable, trail: Set<string>): TableTreeNode => {
    const next = new Set(trail)
    next.add(table.id)
    const kids = (childrenOf.get(table.id) ?? []).filter((c) => !trail.has(c.id))
    return { table, children: kids.map((c) => walk(c, next)) }
  }
  return roots.map((t) => walk(t, new Set()))
}

/** 表或其任意后代视图 / 子表名称命中搜索。 */
export function tableTreeMatches(node: TableTreeNode, q: string): boolean {
  if (!q) return true
  if (node.table.name.toLowerCase().includes(q)) return true
  if (node.table.views.some((v) => viewMatches(v, q))) return true
  return node.children.some((c) => tableTreeMatches(c, q))
}

function viewMatches(v: ViewNode, q: string): boolean {
  if (v.name.toLowerCase().includes(q)) return true
  return v.children.some((c) => viewMatches(c, q))
}

/** 过滤森林：保留命中节点及其祖先；自身命中则保留完整子树。 */
export function filterTableForest(nodes: TableTreeNode[], q: string): TableTreeNode[] {
  if (!q) return nodes
  const out: TableTreeNode[] = []
  for (const n of nodes) {
    const selfHit =
      n.table.name.toLowerCase().includes(q) || n.table.views.some((v) => viewMatches(v, q))
    const kids = filterTableForest(n.children, q)
    if (selfHit) out.push({ table: n.table, children: n.children })
    else if (kids.length) out.push({ table: n.table, children: kids })
  }
  return out
}

/** 返回从根视图到目标视图的链（含目标）；未找到返回 null。 */
export function findViewPath(views: ViewNode[], viewId: string): ViewNode[] | null {
  for (const view of views) {
    if (view.id === viewId) return [view]
    const sub = findViewPath(view.children, viewId)
    if (sub) return [view, ...sub]
  }
  return null
}

export function findView(views: ViewNode[], viewId: string): ViewNode | null {
  const path = findViewPath(views, viewId)
  return path ? path[path.length - 1] : null
}

/** 定位视图的父数组与父视图（根视图父视图为 null）。 */
export function findViewParent(
  views: ViewNode[],
  viewId: string,
  parent: ViewNode | null = null,
): { siblings: ViewNode[]; parent: ViewNode | null } | null {
  for (const view of views) {
    if (view.id === viewId) return { siblings: views, parent }
    const sub = findViewParent(view.children, viewId, view)
    if (sub) return sub
  }
  return null
}

export function countViews(views: ViewNode[]): number {
  return views.reduce((n, v) => n + 1 + countViews(v.children), 0)
}

export function countAnalysisViews(analysis: Analysis): number {
  return analysis.tables.reduce((n, t) => n + countViews(t.views), 0)
}

/** 删除表前检查：返回引用该表作为 combine/步骤 输入的表。 */
export function findCombineDependents(analysis: Analysis, tableId: string): AnalysisTable[] {
  const legacy = analysis.tables.filter(
    (t) =>
      t.combine &&
      ((t.combine.left.kind === 'table' && t.combine.left.tableId === tableId) ||
        (t.combine.right.kind === 'table' && t.combine.right.tableId === tableId) ||
        (t.combine.left.kind === 'view' && t.combine.left.tableId === tableId) ||
        (t.combine.right.kind === 'view' && t.combine.right.tableId === tableId)),
  )

  const producerStep = analysis.steps.find((s) => s.output.tables.includes(tableId))
  if (!producerStep) return legacy

  const downstreamSteps = analysis.steps.filter((s) =>
    s.inputs.some((i) => i.from.nodeId === producerStep.id),
  )
  const stepDeps: AnalysisTable[] = []
  for (const step of downstreamSteps) {
    for (const id of step.output.tables) {
      const t = findTable(analysis, id)
      if (t) stepDeps.push(t)
    }
  }

  return [...legacy, ...stepDeps]
}
