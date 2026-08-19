/** 看板空态 / 画布 / 全屏加载层互斥规则，避免「已添加」却看不见组件。 */
export function dashboardCanvasVisible(opts: {
  hasCurrent: boolean
  widgetCount: number
  loading: boolean
}): boolean {
  return opts.hasCurrent && opts.widgetCount > 0
}

export function dashboardEmptyStateVisible(opts: {
  hasCurrent: boolean
  widgetCount: number
  loading: boolean
}): boolean {
  return opts.hasCurrent && opts.widgetCount === 0 && !opts.loading
}

export function dashboardLoadingOverlayVisible(opts: { hasCurrent: boolean; loading: boolean }): boolean {
  return opts.loading && !opts.hasCurrent
}
