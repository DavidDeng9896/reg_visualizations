import { beforeEach, describe, expect, it } from 'vitest'
import { InsightStudioDB } from '../../src/shared/db'
import { DexieAnalysisRepository } from '../../src/shared/repository'
import { createEmptyAnalysis, createTable } from '../../src/shared/factories'
import { createDemoAnalysis } from '../../src/shared/seed'

let dbNameSeq = 0

describe('DexieAnalysisRepository', () => {
  let repo: DexieAnalysisRepository

  beforeEach(() => {
    // 每个用例独立 DB，互不影响
    dbNameSeq += 1
    const db = new InsightStudioDB(`insight-studio-test-${dbNameSeq}`)
    repo = new DexieAnalysisRepository(db)
  })

  it('put → get 往返', async () => {
    const a = createEmptyAnalysis('Alpha')
    await repo.put(a)
    const got = await repo.get(a.id)
    expect(got).toBeDefined()
    expect(got?.name).toBe('Alpha')
    expect(got?.tables).toEqual([])
  })

  it('put 覆盖更新（upsert）', async () => {
    const a = createEmptyAnalysis('V1')
    await repo.put(a)
    a.name = 'V2'
    a.tables.push(createTable('T', [{ field: 'x', title: 'x', dataType: 'number' }], [{ x: 1 }]))
    await repo.put(a)
    const got = await repo.get(a.id)
    expect(got?.name).toBe('V2')
    expect(got?.tables).toHaveLength(1)
    expect(got?.tables[0].rows[0].x).toBe(1)
  })

  it('list 按 updatedAt 倒序', async () => {
    const a1 = createEmptyAnalysis('A1')
    a1.updatedAt = '2026-01-01T00:00:00.000Z'
    const a2 = createEmptyAnalysis('A2')
    a2.updatedAt = '2026-06-01T00:00:00.000Z'
    await repo.put(a1)
    await repo.put(a2)
    const list = await repo.list()
    expect(list).toHaveLength(2)
    expect(list[0].name).toBe('A2')
    expect(list[1].name).toBe('A1')
  })

  it('delete 后 get 为 undefined', async () => {
    const a = createEmptyAnalysis('Bye')
    await repo.put(a)
    await repo.delete(a.id)
    expect(await repo.get(a.id)).toBeUndefined()
    expect(await repo.list()).toHaveLength(0)
  })

  it('demo 数据可整体落盘再读回（含嵌套视图）', async () => {
    const demo = createDemoAnalysis()
    await repo.put(demo)
    const got = await repo.get(demo.id)
    expect(got?.tables).toHaveLength(3)
    expect(got?.tables[0].rows).toHaveLength(150)
    expect(got?.tables[1].rows).toHaveLength(96)
  })

  it('transact 多步写入同事务', async () => {
    const a = createEmptyAnalysis('Tx')
    await repo.transact(async () => {
      await repo.put(a)
      const b = createEmptyAnalysis('Tx2')
      await repo.put(b)
    })
    expect(await repo.list()).toHaveLength(2)
  })
})
