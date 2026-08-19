import { beforeEach, describe, expect, it, vi } from 'vitest'

const get = vi.fn()
vi.mock('../../../src/shared/repository', () => ({
  analysisRepository: { get: (...args: unknown[]) => get(...args) },
}))

import { createEmptyAnalysis, createTable, createViewNode } from '../../../src/shared/factories'
import { clearWidgetDataCache, invalidateWidgetData, resolveWidgetSource, resolvePythonChartSource } from '../../../src/modules/dashboard/widgetData'

describe('resolveWidgetSource', () => {
  beforeEach(() => {
    clearWidgetDataCache()
    get.mockReset()
  })

  it('missing analysis', async () => {
    get.mockResolvedValue(undefined)
    const r = await resolveWidgetSource({ analysisId: 'x', tableId: 't' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toBe('missing-analysis')
  })

  it('源表只读（无 viewId）', async () => {
    const a = createEmptyAnalysis('A')
    const t = createTable('T', [{ field: 'n', title: 'n', dataType: 'number' }], [{ n: 1 }, { n: 2 }])
    a.tables.push(t)
    get.mockResolvedValue(a)
    const r = await resolveWidgetSource({ analysisId: a.id, tableId: t.id })
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.view).toBeNull()
      expect(r.result.rows).toHaveLength(2)
      expect(r.title).toBe('T')
    }
  })

  it('图表视图', async () => {
    const a = createEmptyAnalysis('A')
    const t = createTable('T', [{ field: 'n', title: 'n', dataType: 'number' }], [{ n: 1 }])
    const v = createViewNode('bar', 'My Bar')
    t.views.push(v)
    a.tables.push(t)
    get.mockResolvedValue(a)
    const r = await resolveWidgetSource({ analysisId: a.id, tableId: t.id, viewId: v.id })
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.view?.name).toBe('My Bar')
      expect(r.title).toBe('My Bar')
    }
  })

  it('同 key 缓存', async () => {
    const a = createEmptyAnalysis('A')
    const t = createTable('T', [{ field: 'n', title: 'n', dataType: 'number' }], [{ n: 1 }])
    a.tables.push(t)
    get.mockResolvedValue(a)
    await resolveWidgetSource({ analysisId: a.id, tableId: t.id })
    await resolveWidgetSource({ analysisId: a.id, tableId: t.id })
    // analysis 文档按 id 持久缓存：同 analysis 的多次解析只读一次库
    expect(get).toHaveBeenCalledTimes(1)
    const r2 = await resolveWidgetSource({ analysisId: a.id, tableId: t.id })
    expect(r2.ok).toBe(true)
  })

  it('invalidateWidgetData 后重新读库', async () => {
    const a = createEmptyAnalysis('A')
    const t = createTable('T', [{ field: 'n', title: 'n', dataType: 'number' }], [{ n: 1 }])
    a.tables.push(t)
    get.mockResolvedValue(a)
    await resolveWidgetSource({ analysisId: a.id, tableId: t.id })
    expect(get).toHaveBeenCalledTimes(1)
    invalidateWidgetData(a.id)
    const r2 = await resolveWidgetSource({ analysisId: a.id, tableId: t.id })
    expect(r2.ok).toBe(true)
    expect(get).toHaveBeenCalledTimes(2)
  })
})

describe('resolvePythonChartSource', () => {
  beforeEach(() => {
    clearWidgetDataCache()
    get.mockReset()
  })

  it('按 chartId 解析 Plotly 产物', async () => {
    const a = createEmptyAnalysis('A')
    a.charts = [{ id: 's1::fig', name: 'Dose', stepId: 's1', plotlyJson: { data: [{ type: 'scatter' }], layout: {} } }]
    get.mockResolvedValue(a)
    const r = await resolvePythonChartSource({ analysisId: a.id, chartId: 's1::fig' })
    expect(r.ok).toBe(true)
    if (r.ok && 'pythonChart' in r) {
      expect(r.title).toBe('Dose')
      expect(r.plotlyJson).toMatchObject({ data: expect.any(Array) })
    }
  })

  it('缺图时不抛错', async () => {
    const a = createEmptyAnalysis('A')
    get.mockResolvedValue(a)
    const r = await resolvePythonChartSource({ analysisId: a.id, chartId: 'missing' })
    expect(r.ok).toBe(false)
  })
})
