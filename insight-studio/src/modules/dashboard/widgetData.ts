import type { Analysis, AnalysisTable, DashboardWidgetRef, ViewNode } from '../../shared/types'
import { analysisRepository } from '../../shared/repository'
import { findTable, findView } from '../../shared/tree'
import { PipelineError, runPipeline, type ViewResult } from '../../shared/pipeline'
import { sealAnalysisRows } from '../../shared/factories'
import { useAnalysisStore } from '../../stores/analysisStore'

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

/**
 * analysis 文档持久 promise 缓存：
 * 一看板多组件引用同一 analysis 时只读/只 seal 一次；
 * 源分析保存（analysisStore.saveNow）后按 id 失效。
 */
const analysisPromises = new Map<string, Promise<Analysis | undefined>>()

function getAnalysis(id: string): Promise<Analysis | undefined> {
  let p = analysisPromises.get(id)
  if (!p) {
    p = analysisRepository.get(id).then((raw) => (raw ? sealAnalysisRows(raw) : undefined))
    analysisPromises.set(id, p)
  }
  return p
}

/** 失效指定 analysis 的所有组件缓存（源数据变更后调用）。 */
export function invalidateWidgetData(analysisId: string): void {
  analysisPromises.delete(analysisId)
  for (const k of [...cache.keys()]) {
    if (k.startsWith(`${analysisId}:`)) cache.delete(k)
  }
}

export function clearWidgetDataCache(): void {
  cache.clear()
  analysisPromises.clear()
}

let hookBound = false
/** 绑定保存钩子（幂等）：工作区保存分析后，看板组件下次解析自动取到新数据。 */
function bindInvalidation(): void {
  if (hookBound) return
  hookBound = true
  try {
    const store = useAnalysisStore()
    store.$onAction(({ name, after }) => {
      if (name !== 'saveNow') return
      after(() => {
        const id = store.current?.id
        if (id) invalidateWidgetData(id)
      })
    })
  } catch {
    // 无激活 Pinia（单测等非组件环境）：跳过自动失效，缓存仍可手动 clear
  }
}

export function cacheKey(ref: DashboardWidgetRef, updatedAt: string): string {
  return `${ref.analysisId}:${ref.tableId ?? ''}:${ref.viewId ?? ''}:${ref.chartId ?? ''}:${updatedAt}`
}

export type PythonChartResolveOk = {
  ok: true
  pythonChart: true
  analysis: Analysis
  chartId: string
  plotlyJson: Record<string, unknown>
  title: string
}

export type PythonChartResolveResult = PythonChartResolveOk | WidgetResolveFail

export async function resolvePythonChartSource(ref: DashboardWidgetRef): Promise<PythonChartResolveResult> {
  bindInvalidation()
  const analysis = await getAnalysis(ref.analysisId)
  if (!analysis) {
    return { ok: false, reason: 'missing-analysis', message: '引用的 Insight 不存在或已删除' }
  }
  const chartId = ref.chartId
  if (!chartId) {
    return { ok: false, reason: 'missing-view', message: '未指定 Python 图' }
  }
  const ch = (analysis.charts ?? []).find((c) => c.id === chartId)
  if (!ch) {
    return { ok: false, reason: 'missing-view', message: 'Python 图已不存在，请重跑 Custom Code 或移除组件' }
  }
  return {
    ok: true,
    pythonChart: true,
    analysis,
    chartId,
    plotlyJson: ch.plotlyJson,
    title: ch.name,
  }
}

/** 解析 widget 引用并跑 pipeline；同 key 短时复用。 */
export async function resolveWidgetSource(ref: DashboardWidgetRef): Promise<WidgetResolveResult> {
  bindInvalidation()
  const analysis = await getAnalysis(ref.analysisId)
  if (!analysis) {
    return { ok: false, reason: 'missing-analysis', message: '引用的 Insight 不存在或已删除' }
  }
  const key = cacheKey(ref, analysis.updatedAt)
  const hit = cache.get(key)
  if (hit) return hit.value

  const table = findTable(analysis, ref.tableId ?? '')
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
    const result = runPipeline(analysis, table.id, ref.viewId)
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
