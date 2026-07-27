import type { Analysis, AnalysisTable, DashboardWidgetRef, ViewNode } from '../../shared/types'
import { analysisRepository } from '../../shared/repository'
import { findTable, findView } from '../../shared/tree'
import { PipelineError, runPipeline, type ViewResult } from '../../shared/pipeline'
import { sealAnalysisRows } from '../../shared/factories'

export type WidgetResolveOk = {
  ok: true
  analysis: Analysis
  table: AnalysisTable
  view: ViewNode | null
  result: ViewResult
  title: string
}

export type WidgetResolveFail = {
  ok: false
  reason: 'missing-analysis' | 'missing-table' | 'missing-view' | 'pipeline-error'
  message: string
}

export type WidgetResolveResult = WidgetResolveOk | WidgetResolveFail

type CacheEntry = { key: string; value: WidgetResolveOk }

const cache = new Map<string, CacheEntry>()

export function clearWidgetDataCache(): void {
  cache.clear()
}

export function cacheKey(ref: DashboardWidgetRef, updatedAt: string): string {
  return `${ref.analysisId}:${ref.tableId}:${ref.viewId ?? ''}:${updatedAt}`
}

/** 解析 widget 引用并跑 pipeline；同 key 短时复用。 */
export async function resolveWidgetSource(ref: DashboardWidgetRef): Promise<WidgetResolveResult> {
  const raw = await analysisRepository.get(ref.analysisId)
  if (!raw) {
    return { ok: false, reason: 'missing-analysis', message: '引用的 Insight 不存在或已删除' }
  }
  const analysis = sealAnalysisRows(raw)
  const key = cacheKey(ref, analysis.updatedAt)
  const hit = cache.get(key)
  if (hit) return hit.value

  const table = findTable(analysis, ref.tableId)
  if (!table) {
    return { ok: false, reason: 'missing-table', message: '引用的表不存在' }
  }

  let view: ViewNode | null = null
  if (ref.viewId) {
    view = findView(table.views, ref.viewId)
    if (!view) {
      return { ok: false, reason: 'missing-view', message: '引用的视图不存在' }
    }
  }

  try {
    const result = runPipeline(analysis, ref.tableId, ref.viewId)
    const title = view?.name ?? table.name
    const value: WidgetResolveOk = { ok: true, analysis, table, view, result, title }
    cache.set(key, { key, value })
    // 简单 LRU：超 40 条清一半
    if (cache.size > 40) {
      const keys = [...cache.keys()]
      for (const k of keys.slice(0, 20)) cache.delete(k)
    }
    return value
  } catch (e) {
    const message =
      e instanceof PipelineError ? e.message : e instanceof Error ? e.message : '数据计算失败'
    return { ok: false, reason: 'pipeline-error', message }
  }
}
