import { describe, expect, it } from 'vitest'
import type { Analysis, AnalysisTable } from '../../src/shared/types'
import { createTable } from '../../src/shared/factories'
import { migrateAnalysisToSteps, isMigrated } from '../../src/shared/migrateSteps'

function makeAnalysis(tables: AnalysisTable[]): Analysis {
  return {
    id: 'a1',
    name: 'A',
    createdAt: 't',
    updatedAt: 't',
    tables,
    flowchartLayout: {},
    steps: [],
    files: [],
  }
}

describe('migrateAnalysisToSteps', () => {
  it('空 analysis：steps 为空且已标记迁移', () => {
    const a = makeAnalysis([])
    migrateAnalysisToSteps(a)
    expect(a.steps).toHaveLength(0)
    expect(isMigrated(a)).toBe(true)
    expect(a.__legacyTables).toHaveLength(0)
  })

  it('csv 表迁移为 upload-csv 步骤', () => {
    const t = createTable('Sales', [{ field: 'v', title: 'v', dataType: 'number' }], [{ v: 1 }], 'csv')
    const a = makeAnalysis([t])
    migrateAnalysisToSteps(a)

    expect(a.steps).toHaveLength(1)
    const step = a.steps[0]
    expect(step.type).toBe('upload-csv')
    expect(step.status).toBe('configured')
    expect(step.output.tables).toContain(t.id)
    expect(t.source).toBe('step')
    expect(t.stepId).toBe(step.id)
  })

  it('已迁移的 analysis 幂等', () => {
    const t = createTable('T', [{ field: 'v', title: 'v', dataType: 'number' }], [{ v: 1 }], 'csv')
    const a = makeAnalysis([t])
    migrateAnalysisToSteps(a)
    const firstStepId = a.steps[0].id
    const firstTableSource = a.tables[0].source

    migrateAnalysisToSteps(a)
    expect(a.steps).toHaveLength(1)
    expect(a.steps[0].id).toBe(firstStepId)
    expect(a.tables[0].source).toBe(firstTableSource)
  })

  it('已有 steps 的新模型不再迁移（避免清空步骤图）', () => {
    const t = createTable('Sales', [{ field: 'v', title: 'v', dataType: 'number' }], [{ v: 1 }], 'csv')
    t.source = 'step'
    t.stepId = 'step-1'
    const a = makeAnalysis([t])
    a.steps = [
      {
        id: 'step-1',
        type: 'upload-csv',
        name: 'Sales',
        inputs: [],
        config: { tableName: 'Sales' },
        status: 'configured',
        output: { tables: [t.id], files: [], views: [] },
      },
    ]
    // 故意不设 __legacyTables：旧逻辑会误判未迁移并写空 steps
    expect(isMigrated(a)).toBe(true)
    migrateAnalysisToSteps(a)
    expect(a.steps).toHaveLength(1)
    expect(a.steps[0].id).toBe('step-1')
    expect(a.__legacyTables).toEqual([])
  })

  it('inner join 表迁移为 join 步骤', () => {
    const left = createTable('L', [{ field: 'id', title: 'id', dataType: 'string' }], [{ id: 'a' }], 'csv')
    const right = createTable('R', [{ field: 'id', title: 'id', dataType: 'string' }], [{ id: 'a' }], 'csv')
    const combined: AnalysisTable = {
      ...createTable('C', [{ field: 'id', title: 'id', dataType: 'string' }], [{ id: 'a' }], 'combine'),
      combine: {
        joinType: 'inner',
        left: { kind: 'table', tableId: left.id },
        right: { kind: 'table', tableId: right.id },
        keys: [{ left: 'id', right: 'id' }],
      },
    }
    const a = makeAnalysis([left, right, combined])
    migrateAnalysisToSteps(a)

    const joinStep = a.steps.find((s) => s.type === 'join')
    expect(joinStep).toBeDefined()
    expect(joinStep!.status).toBe('configured')
    expect(joinStep!.output.tables).toContain(combined.id)
    expect(joinStep!.inputs).toHaveLength(2)
    expect(joinStep!.config.joinType).toBe('inner')
  })

  it('append 表迁移为 union 步骤', () => {
    const left = createTable('L', [{ field: 'id', title: 'id', dataType: 'string' }], [{ id: 'a' }], 'csv')
    const right = createTable('R', [{ field: 'id', title: 'id', dataType: 'string' }], [{ id: 'b' }], 'csv')
    const combined: AnalysisTable = {
      ...createTable('C', [{ field: 'id', title: 'id', dataType: 'string' }], [{ id: 'a' }, { id: 'b' }], 'combine'),
      combine: {
        joinType: 'append',
        left: { kind: 'table', tableId: left.id },
        right: { kind: 'table', tableId: right.id },
        keys: [],
      },
    }
    const a = makeAnalysis([left, right, combined])
    migrateAnalysisToSteps(a)

    const unionStep = a.steps.find((s) => s.type === 'union')
    expect(unionStep).toBeDefined()
    expect(unionStep!.status).toBe('configured')
  })

  it('combine 视图输入暂不支持，标记 pending', () => {
    const left = createTable('L', [{ field: 'id', title: 'id', dataType: 'string' }], [{ id: 'a' }], 'csv')
    left.views = [{ id: 'v1', name: 'V', type: 'table', filters: [], transforms: [], children: [] }]
    const right = createTable('R', [{ field: 'id', title: 'id', dataType: 'string' }], [{ id: 'a' }], 'csv')
    const combined: AnalysisTable = {
      ...createTable('C', [{ field: 'id', title: 'id', dataType: 'string' }], [{ id: 'a' }], 'combine'),
      combine: {
        joinType: 'left',
        left: { kind: 'view', tableId: left.id, viewId: 'v1' },
        right: { kind: 'table', tableId: right.id },
        keys: [{ left: 'id', right: 'id' }],
      },
    }
    const a = makeAnalysis([left, right, combined])
    migrateAnalysisToSteps(a)

    const joinStep = a.steps.find((s) => s.type === 'join')
    expect(joinStep!.status).toBe('pending')
    expect(joinStep!.error).toContain('视图')
  })
})
