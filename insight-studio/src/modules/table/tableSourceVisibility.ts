/**
 * 图表工作区「数据源/源表」显隐策略：
 * - 第一次进入某图表：显示源表
 * - 之后再进入：默认隐藏源表
 */
export function resolveTableCollapsedOnEnter(visited: boolean): {
  collapsed: boolean
  markVisited: boolean
} {
  if (!visited) return { collapsed: false, markVisited: true }
  return { collapsed: true, markVisited: false }
}
