/** Workspace empty-state copy / landmark / CTA a11y (Round 28). */

export const WORKSPACE_EMPTY_REGION_LABEL = '工作区引导'

export function workspaceEmptyRegionAttrs() {
  return {
    id: 'ws-empty',
    tabindex: -1 as const,
    role: 'region' as const,
    'aria-label': WORKSPACE_EMPTY_REGION_LABEL,
  }
}

export function workspaceEmptyCopy(opts: { hasTables: boolean }): { title: string; body: string } {
  if (!opts.hasTables) {
    return {
      title: '开始分析',
      body: '还没有数据表。导入 CSV 或合并表后，侧栏会出现节点，即可在此浏览与可视化。',
    }
  }
  return {
    title: '选择表或视图',
    body: '从侧栏选择一张表或视图继续；也可再导入 CSV / 合并表。',
  }
}

export function workspaceEmptyCtaAria(cmd: 'csv' | 'combine'): string {
  return cmd === 'csv' ? '从工作区空态导入 CSV' : '从工作区空态合并表'
}
