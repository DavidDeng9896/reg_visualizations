/**
 * P0-4：两阶段建图留下的空/半成品图表视图跟踪与清理。
 * create_view(chart) 同轮壳 → pending；set_chart_config 成功则清除；
 * 失败或计划收束时删除，避免工作区残留空散点链。
 */
import type { Analysis, AnalysisTable, ColumnMeta, ViewNode } from '../../shared/types'
import { validateChartMapping } from '../charts/registry'
import { scatterCategoryAxisField } from '../charts/chartEmptyState'
import { findViewParent } from '../../shared/tree'

const pendingEmptyChartViewIds = new Set<string>()

/** 工具参数是否带齐配图载荷（configure / 别名槽位）。 */
export function hasChartConfigurePayload(args: Record<string, unknown> | null | undefined): boolean {
  if (!args || typeof args !== 'object') return false
  return (
    args.configure != null ||
    args.mapping != null ||
    args.config != null ||
    args.x != null ||
    args.y != null ||
    args.values != null ||
    args.x_field != null ||
    args.y_field != null ||
    args.category_field != null ||
    args.value_field != null
  )
}

/** 同轮剩余调用里是否有「带完整 configure」的 set_chart_config。 */
export function sameTurnHasCompleteChartConfigure(
  remaining: Array<{ name?: string; args?: Record<string, unknown> }> | null | undefined,
): boolean {
  if (!Array.isArray(remaining)) return false
  return remaining.some((c) => {
    if (c?.name !== 'set_chart_config') return false
    const payload = c.args && typeof c.args === 'object' ? c.args : (c as Record<string, unknown>)
    return hasChartConfigurePayload(payload)
  })
}

export function chartViewLacksValidMapping(view: ViewNode, columns: ColumnMeta[]): boolean {
  if (!view.chart || view.type === 'table') return false
  return validateChartMapping(view.chart, columns).length > 0
}

/** 映射槽位齐但散点绑了分类轴（主区坏轴门控；清理逻辑仍只看 lacksValidMapping）。 */
export function chartViewHasCategoryScatterMismatch(view: ViewNode, columns: ColumnMeta[]): boolean {
  if (!view.chart || view.type === 'table') return false
  return scatterCategoryAxisField(view.chart, columns) != null
}

export function trackPendingEmptyChartView(viewId: string): void {
  if (viewId) pendingEmptyChartViewIds.add(viewId)
}

export function clearPendingEmptyChartView(viewId: string): void {
  pendingEmptyChartViewIds.delete(viewId)
}

export function clearAllPendingEmptyChartViews(): void {
  pendingEmptyChartViewIds.clear()
}

export function listPendingEmptyChartViewIds(): string[] {
  return [...pendingEmptyChartViewIds]
}

function removeViewFromTable(table: AnalysisTable, viewId: string): boolean {
  const loc = findViewParent(table.views, viewId)
  if (!loc) return false
  const idx = loc.siblings.findIndex((x) => x.id === viewId)
  if (idx < 0) return false
  loc.siblings.splice(idx, 1)
  return true
}

/** 删除仍无有效映射的 pending 空图；返回已删名称。 */
export function sweepPendingEmptyChartViews(analysis: Analysis): string[] {
  const removed: string[] = []
  const ids = [...pendingEmptyChartViewIds]
  for (const viewId of ids) {
    let found = false
    for (const table of analysis.tables) {
      const walk = (views: ViewNode[]): ViewNode | null => {
        for (const v of views) {
          if (v.id === viewId) return v
          const hit = walk(v.children ?? [])
          if (hit) return hit
        }
        return null
      }
      const view = walk(table.views)
      if (!view) continue
      found = true
      if (view.type === 'table' || !view.chart) {
        pendingEmptyChartViewIds.delete(viewId)
        break
      }
      if (!chartViewLacksValidMapping(view, table.columns)) {
        pendingEmptyChartViewIds.delete(viewId)
        break
      }
      if (removeViewFromTable(table, viewId)) removed.push(view.name)
      pendingEmptyChartViewIds.delete(viewId)
      break
    }
    if (!found) pendingEmptyChartViewIds.delete(viewId)
  }
  return removed
}

/** 若视图当前仍无有效映射则删除（set_chart_config 失败时用）。 */
export function deleteEmptyChartViewIfUnmapped(
  analysis: Analysis,
  tableId: string,
  viewId: string,
): string | null {
  const table = analysis.tables.find((t) => t.id === tableId)
  if (!table) return null
  const walk = (views: ViewNode[]): ViewNode | null => {
    for (const v of views) {
      if (v.id === viewId) return v
      const hit = walk(v.children ?? [])
      if (hit) return hit
    }
    return null
  }
  const view = walk(table.views)
  if (!view?.chart || view.type === 'table') return null
  if (!chartViewLacksValidMapping(view, table.columns)) return null
  const name = view.name
  if (!removeViewFromTable(table, viewId)) return null
  pendingEmptyChartViewIds.delete(viewId)
  return name
}
