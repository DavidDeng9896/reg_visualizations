import type { Analysis, AnalysisTable, ViewNode } from './types'

/** 视图树遍历/查找工具。 */

export function findTable(analysis: Analysis, tableId: string): AnalysisTable | undefined {
  return analysis.tables.find((t) => t.id === tableId)
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

/** 删除表前检查：返回引用该表作为 combine 输入的表。 */
export function findCombineDependents(analysis: Analysis, tableId: string): AnalysisTable[] {
  return analysis.tables.filter(
    (t) =>
      t.combine &&
      ((t.combine.left.kind === 'table' && t.combine.left.tableId === tableId) ||
        (t.combine.right.kind === 'table' && t.combine.right.tableId === tableId) ||
        (t.combine.left.kind === 'view' && t.combine.left.tableId === tableId) ||
        (t.combine.right.kind === 'view' && t.combine.right.tableId === tableId)),
  )
}
