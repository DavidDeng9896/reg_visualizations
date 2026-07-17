/** Table-selected / no-views guidance (Round 29). */

export function tableNoViewsHint(opts: { viewCount: number }): { title: string; body: string } | null {
  if (opts.viewCount > 0) return null
  return {
    title: '创建第一个视图',
    body: '当前表还没有视图。新建视图后可切换图种、配置图表，并在流程图中看到分支。',
  }
}

export function tableNoViewsCtaAria(): string {
  return '从表无视图引导创建 New view'
}
