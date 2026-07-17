/** Sidebar empty-state copy / landmark / CTA a11y (Round 30). */

export type SidebarEmptyKind = 'no-data' | 'no-match'

export const SIDEBAR_EMPTY_REGION_LABEL = '侧栏数据引导'

export function sidebarEmptyKind(opts: {
  tableCount: number
  query: string
  visibleCount: number
}): SidebarEmptyKind | null {
  if (opts.visibleCount > 0) return null
  if (opts.tableCount === 0) return 'no-data'
  return 'no-match'
}

export function sidebarEmptyRegionAttrs() {
  return {
    id: 'sidebar-empty',
    tabindex: -1 as const,
    role: 'region' as const,
    'aria-label': SIDEBAR_EMPTY_REGION_LABEL,
  }
}

export function sidebarEmptyCopy(kind: SidebarEmptyKind): { title: string; body: string } {
  if (kind === 'no-data') {
    return {
      title: '开始导入数据',
      body: '还没有表。导入 CSV 或合并表后，侧栏会出现节点。',
    }
  }
  return {
    title: '无匹配的表或视图',
    body: '当前搜索没有结果。清除搜索可重新显示全部节点。',
  }
}

export function sidebarEmptyCtaAria(cmd: 'csv' | 'combine' | 'clear'): string {
  if (cmd === 'csv') return '从侧栏空态导入 CSV'
  if (cmd === 'combine') return '从侧栏空态合并表'
  return '清除侧栏搜索以显示全部'
}
