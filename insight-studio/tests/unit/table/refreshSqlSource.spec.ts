import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { createEmptyAnalysis, createTable, sealAnalysisRows } from '../../../src/shared/factories'
import { createStepNode } from '../../../src/modules/steps/factory'
import { useAnalysisStore } from '../../../src/stores/analysisStore'
import { applySnapshotToTable, resolveDbConnection } from '../../../src/modules/table/refreshSqlSource'
import type { DbConnectionProfile } from '../../../src/modules/table/dbConnectionTypes'

vi.mock('../../../src/modules/table/dbConnections', () => ({
  listDbConnections: vi.fn(() => [
    {
      id: 'conn-1',
      name: 'lab-db',
      dialect: 'postgres',
      host: '127.0.0.1',
      port: 5432,
      database: 'lab',
      user: 'u',
      password: 'p',
      ssl: false,
      updatedAt: '2026-01-01T00:00:00.000Z',
    } satisfies DbConnectionProfile,
  ]),
}))

describe('refreshSqlSource helpers', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('resolveDbConnection 优先 connectionId', () => {
    const c = resolveDbConnection({ connectionId: 'conn-1', connectionName: 'other' })
    expect(c?.name).toBe('lab-db')
  })

  it('resolveDbConnection 回退 connectionName', () => {
    const c = resolveDbConnection({ connectionName: 'lab-db' })
    expect(c?.id).toBe('conn-1')
  })

  it('applySnapshotToTable 保留 table id 与 structure 列类型，并替换行', () => {
    const table = createTable(
      't',
      [
        { field: 'smiles', title: 'smiles', dataType: 'structure' },
        { field: 'n', title: 'n', dataType: 'number' },
      ],
      [{ smiles: 'C', n: 1 }],
      'csv',
    )
    const id = table.id
    applySnapshotToTable(table, ['smiles', 'n'], [
      { smiles: 'CC', n: 2 },
      { smiles: 'CCC', n: 3 },
    ])
    expect(table.id).toBe(id)
    expect(table.rows).toHaveLength(2)
    expect(table.columns.find((c) => c.field === 'smiles')?.dataType).toBe('structure')
    expect(table.rows[0]?.n).toBe(2)
  })

  it('刷新后下游 filter 被标 stale 并可重跑（本地 SQL）', async () => {
    const { refreshSqlSourceStep } = await import('../../../src/modules/table/refreshSqlSource')
    const store = useAnalysisStore()
    const a = sealAnalysisRows(createEmptyAnalysis('demo'))
    const src = createTable(
      'raw',
      [
        { field: 'id', title: 'id', dataType: 'number' },
        { field: 'v', title: 'v', dataType: 'number' },
      ],
      [
        { id: 1, v: 10 },
        { id: 2, v: 20 },
      ],
      'csv',
    )
    // 本地 SQL 源：从「驱动表」查；再挂一个假的本地 query-sql 产出表
    const drive = createTable(
      'drive',
      [
        { field: 'id', title: 'id', dataType: 'number' },
        { field: 'v', title: 'v', dataType: 'number' },
      ],
      [
        { id: 1, v: 10 },
        { id: 2, v: 20 },
        { id: 3, v: 30 },
        { id: 4, v: 40 },
      ],
      'csv',
    )
    const sqlStep = createStepNode('query-sql', 'from drive')
    sqlStep.config = { sql: 'SELECT * FROM drive', source: 'local' }
    sqlStep.status = 'configured'
    sqlStep.output.tables = [src.id]
    src.source = 'step'
    src.stepId = sqlStep.id

    const filter = createStepNode('filter', 'v>15')
    filter.status = 'configured'
    filter.inputs = [{ port: 'Input dataset', from: { nodeId: sqlStep.id, port: 'Output dataset' } }]
    filter.config = {
      filters: [
        {
          id: 'g1',
          combinator: 'and',
          conditions: [{ id: 'c1', column: 'v', operator: 'gt', value: 15 }],
        },
      ],
    }
    const out = createTable(
      'filtered',
      [
        { field: 'id', title: 'id', dataType: 'number' },
        { field: 'v', title: 'v', dataType: 'number' },
      ],
      [{ id: 2, v: 20 }],
      'step',
    )
    filter.output.tables = [out.id]
    out.stepId = filter.id

    a.tables = [drive, src, out]
    a.steps = [sqlStep, filter]
    store.current = a

    const r = await refreshSqlSourceStep(sqlStep.id)
    expect(r.rowCount).toBe(4)
    expect(store.current!.tables.find((t) => t.id === src.id)!.rows).toHaveLength(4)
    expect(r.mode).toBe('reran')
    expect(r.ran).toBeGreaterThanOrEqual(1)
    const filtered = store.current!.tables.find((t) => t.id === out.id)!
    expect(filtered.rows.every((row) => Number(row.v) > 15)).toBe(true)
    expect(filtered.rows.map((row) => Number(row.id)).sort()).toEqual([2, 3, 4])
  })
})
