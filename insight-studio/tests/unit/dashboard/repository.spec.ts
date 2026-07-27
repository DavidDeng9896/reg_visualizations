import { beforeEach, describe, expect, it } from 'vitest'
import { InsightStudioDB } from '../../../src/shared/db'
import { DexieDashboardRepository } from '../../../src/shared/dashboardRepository'
import { createDashboard, createDashboardWidget, createLinkWidget, normalizeExternalUrl } from '../../../src/shared/factories'

let dbNameSeq = 0

describe('DexieDashboardRepository', () => {
  let repo: DexieDashboardRepository

  beforeEach(() => {
    dbNameSeq += 1
    const db = new InsightStudioDB(`insight-studio-dash-test-${dbNameSeq}`)
    repo = new DexieDashboardRepository(db)
  })

  it('put → get 往返', async () => {
    const d = createDashboard('细胞培养')
    await repo.put(d)
    const got = await repo.get(d.id)
    expect(got).toBeDefined()
    expect(got?.name).toBe('细胞培养')
    expect(got?.layout.columns).toBe(12)
    expect(got?.widgets).toEqual([])
  })

  it('put 覆盖更新（含跨 Insight widget）', async () => {
    const d = createDashboard('Assay')
    await repo.put(d)
    d.name = 'Assay 总览'
    d.widgets.push(
      createDashboardWidget('chart', { analysisId: 'a1', tableId: 't1', viewId: 'v1' }),
      createDashboardWidget('table', { analysisId: 'a2', tableId: 't2' }, { x: 0, y: 8 }),
    )
    await repo.put(d)
    const got = await repo.get(d.id)
    expect(got?.name).toBe('Assay 总览')
    expect(got?.widgets).toHaveLength(2)
    expect(got!.widgets[0]!.ref!.analysisId).toBe('a1')
    expect(got!.widgets[1]!.ref!.viewId).toBeUndefined()
  })

  it('list 按 updatedAt 倒序', async () => {
    const d1 = createDashboard('D1')
    d1.updatedAt = '2026-01-01T00:00:00.000Z'
    const d2 = createDashboard('D2')
    d2.updatedAt = '2026-06-01T00:00:00.000Z'
    await repo.put(d1)
    await repo.put(d2)
    const list = await repo.list()
    expect(list.map((x) => x.name)).toEqual(['D2', 'D1'])
  })

  it('delete 后 get 为 undefined', async () => {
    const d = createDashboard('Bye')
    await repo.put(d)
    await repo.delete(d.id)
    expect(await repo.get(d.id)).toBeUndefined()
    expect(await repo.list()).toHaveLength(0)
  })
})

describe('createDashboardWidget', () => {
  it('chart / table 默认尺寸', () => {
    const c = createDashboardWidget('chart', { analysisId: 'a', tableId: 't', viewId: 'v' })
    expect(c.grid).toEqual({ x: 0, y: 0, w: 6, h: 8 })
    const t = createDashboardWidget('table', { analysisId: 'a', tableId: 't' })
    expect(t.grid).toEqual({ x: 0, y: 0, w: 12, h: 10 })
  })
})

describe('normalizeExternalUrl / createLinkWidget', () => {
  it('补全 https 并校验', () => {
    expect(normalizeExternalUrl('example.com/a')).toBe('https://example.com/a')
    expect(normalizeExternalUrl('https://x.test')).toBe('https://x.test/')
    expect(normalizeExternalUrl('ftp://x')).toBe(null)
    expect(normalizeExternalUrl('')).toBe(null)
  })
  it('createLinkWidget', () => {
    const w = createLinkWidget('example.com', { title: 'SOP' })
    expect(w.type).toBe('link')
    expect(w.url).toBe('https://example.com/')
    expect(w.title).toBe('SOP')
    expect(w.grid.w).toBe(6)
  })
})
