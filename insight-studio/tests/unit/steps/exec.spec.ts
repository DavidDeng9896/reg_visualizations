import { describe, expect, it } from 'vitest'
import type { Analysis, AnalysisTable, Filter } from '../../../src/shared/types'
import { createTable, createViewNode } from '../../../src/shared/factories'
import { uuid } from '../../../src/shared/id'
import { executeFilter, previewFilter } from '../../../src/modules/steps/exec/filter'
import { executeHideColumns, previewHideColumns } from '../../../src/modules/steps/exec/hideColumns'
import { executeComputedColumn, previewComputedColumn } from '../../../src/modules/steps/exec/computedColumn'
import { computeJoinStats, executeJoin, previewJoin } from '../../../src/modules/steps/exec/join'
import { executeUnion, previewUnion } from '../../../src/modules/steps/exec/union'
import { applyStepResult, runStep } from '../../../src/modules/steps/exec'
import type { StepNode } from '../../../src/shared/types'

function table(rows: Record<string, unknown>[], columns?: { field: string; title: string; dataType: 'string' | 'number' }[]): AnalysisTable {
  const cols = columns ?? Object.keys(rows[0] ?? {}).map((k) => ({
    field: k,
    title: k,
    dataType: typeof rows[0]?.[k] === 'number' ? ('number' as const) : ('string' as const),
  }))
  return createTable('T', cols, rows as Record<string, string | number | boolean | null>[], 'csv')
}

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

describe('filter step', () => {
  it('按条件过滤行', () => {
    const t = table([{ name: 'a', v: 1 }, { name: 'b', v: 2 }])
    const f: Filter = { id: 'f1', combinator: 'and', conditions: [{ id: 'c1', column: 'v', operator: 'gt', value: 1 }] }
    const r = executeFilter(t, { filters: [f] }, 'Filtered')
    expect(r.status).toBe('configured')
    expect(r.outputTables![0].rows).toHaveLength(1)
    expect(r.outputTables![0].rows[0].name).toBe('b')
  })

  it('预览截断', () => {
    const t = table([{ v: 1 }, { v: 2 }, { v: 3 }])
    const r = previewFilter(t, { filters: [] }, 2)
    expect(r.totalRows).toBe(3)
    expect(r.rows).toHaveLength(2)
  })
})

describe('hide-columns step', () => {
  it('drop 模式剔除列', () => {
    const t = table([{ a: 1, b: 2 }])
    const r = executeHideColumns(t, { mode: 'drop', columns: ['a'] }, 'Hidden')
    expect(r.outputTables![0].columns.map((c) => c.field)).toEqual(['b'])
  })

  it('keep 模式保留列', () => {
    const t = table([{ a: 1, b: 2, c: 3 }])
    const r = executeHideColumns(t, { mode: 'keep', columns: ['a', 'c'] }, 'Kept')
    expect(r.outputTables![0].columns.map((c) => c.field)).toEqual(['a', 'c'])
  })
})

describe('computed-column step', () => {
  it('派生新列', () => {
    const t = table([{ v: 2 }])
    const r = executeComputedColumn(t, { name: 'double', expression: 'v * 2' }, 'Computed')
    expect(r.status).toBe('configured')
    expect(r.outputTables![0].rows[0].double).toBe(4)
  })

  it('空表达式失败', () => {
    const t = table([{ v: 2 }])
    const r = executeComputedColumn(t, { name: 'x', expression: '' }, 'Computed')
    expect(r.status).toBe('failed')
  })
})

describe('join step', () => {
  it('left join 保留左表全部行', () => {
    const left = table([{ id: 'a', v: 1 }, { id: 'b', v: 2 }])
    const right = table([{ id: 'a', label: 'A' }])
    const r = executeJoin(left, right, { joinType: 'left', keys: [{ left: 'id', right: 'id' }], suffixes: ['_x', '_y'] }, 'Joined')
    expect(r.status).toBe('configured')
    expect(r.outputTables![0].rows).toHaveLength(2)
  })

  it('缺少键失败', () => {
    const left = table([{ id: 'a' }])
    const right = table([{ id: 'a' }])
    const r = executeJoin(left, right, { joinType: 'inner', keys: [], suffixes: ['_x', '_y'] }, 'Joined')
    expect(r.status).toBe('failed')
  })
})

describe('union step', () => {
  it('append 两个表', () => {
    const a = table([{ id: 'a' }])
    const b = table([{ id: 'b' }])
    const r = executeUnion([a, b], { alignBy: 'name', fillNull: true, addSourceColumn: false }, 'Unioned')
    expect(r.outputTables![0].rows).toHaveLength(2)
  })

  it('少于两个输入失败', () => {
    const r = executeUnion([table([{ id: 'a' }])], { alignBy: 'name', fillNull: true, addSourceColumn: false }, 'Unioned')
    expect(r.status).toBe('failed')
  })

  it('fillNull=false 严格模式：列不一致报错，列一致通过', () => {
    const a = table([{ id: 'a', v: 1 }])
    const b = table([{ id: 'b', extra: 'x' }])
    const bad = executeUnion([a, b], { alignBy: 'name', fillNull: false, addSourceColumn: false }, 'U')
    expect(bad.status).toBe('failed')
    expect(bad.error).toContain('完全一致')

    const c = table([{ id: 'c', v: 3 }])
    const ok = executeUnion([a, c], { alignBy: 'name', fillNull: false, addSourceColumn: false }, 'U')
    expect(ok.status).toBe('configured')
    expect(ok.outputTables![0].rows).toHaveLength(2)
  })

  it('primary：以首表列为准，丢弃其它表额外列，首表行不再被撑空', () => {
    const left = table([{ id: 'a', v: 1 }])
    const right = table([{ id: 'b', v: 2, extra: 'noise' }])
    const byName = executeUnion([left, right], { alignBy: 'name', fillNull: true, addSourceColumn: false }, 'U')
    expect(byName.outputTables![0].columns.map((c) => c.field)).toEqual(
      expect.arrayContaining(['id', 'v', 'extra']),
    )
    expect(byName.outputTables![0].rows[0].extra).toBeNull()

    const primary = executeUnion([left, right], { alignBy: 'primary', fillNull: true, addSourceColumn: false }, 'U')
    expect(primary.status).toBe('configured')
    const out = primary.outputTables![0]
    expect(out.columns.map((c) => c.field)).toEqual(['id', 'v'])
    expect(out.rows).toHaveLength(2)
    expect(out.rows[0]).toMatchObject({ id: 'a', v: 1 })
    expect(out.rows[1]).toMatchObject({ id: 'b', v: 2 })
    expect(out.rows[0]).not.toHaveProperty('extra')
  })

  it('primary + fillNull=false：缺首表列报错', () => {
    const left = table([{ id: 'a', v: 1 }])
    const right = table([{ id: 'b' }])
    const bad = executeUnion([left, right], { alignBy: 'primary', fillNull: false, addSourceColumn: false }, 'U')
    expect(bad.status).toBe('failed')
    expect(bad.error).toContain('缺少首表列')
  })
})

describe('join 匹配统计', () => {
  it('匹配/左未匹配/右未匹配', () => {
    const left = table([{ id: 'a' }, { id: 'b' }, { id: 'c' }])
    const right = table([{ id: 'a' }, { id: 'a' }, { id: 'z' }])
    const stats = computeJoinStats(left, right, { joinType: 'left', keys: [{ left: 'id', right: 'id' }], suffixes: ['_x', '_y'] })
    const map = Object.fromEntries(stats.map((s) => [s.label, s.value]))
    // a 命中右表 2 行 → 匹配输出行数 2
    expect(map['匹配行数']).toBe('2')
    expect(map['左未匹配']).toBe('2') // b, c
    expect(map['右未匹配']).toBe('1') // z
  })

  it('预览携带统计行', () => {
    const left = table([{ id: 'a' }])
    const right = table([{ id: 'a' }])
    const p = previewJoin(left, right, { joinType: 'inner', keys: [{ left: 'id', right: 'id' }], suffixes: ['_x', '_y'] }, 50)
    expect(p.stats).toBeDefined()
    expect(p.stats!.find((s) => s.label === '匹配行数')!.value).toBe('1')
  })
})

describe('applyStepResult · 重跑语义', () => {
  function filterStep(id: string, outputTableId: string): StepNode {
    return {
      id,
      type: 'filter',
      name: 'F',
      inputs: [],
      config: { filters: [] },
      status: 'configured',
      output: { tables: [outputTableId], files: [], views: [] },
    }
  }

  it('重跑复用输出表 id 并保留视图', () => {
    const oldTable = table([{ v: 1 }])
    oldTable.stepId = 's1'
    oldTable.views.push(createViewNode('bar', 'Bar'))
    const a = makeAnalysis([oldTable])
    const step = filterStep('s1', oldTable.id)

    const newOut = createTable('F', [{ field: 'v', title: 'v', dataType: 'number' }], [{ v: 2 }], 'step')
    applyStepResult(a, step, { status: 'configured', outputTables: [newOut] })

    // id 复用、视图保留、不产生新表
    expect(step.output.tables).toEqual([oldTable.id])
    expect(a.tables).toHaveLength(1)
    expect(a.tables[0].id).toBe(oldTable.id)
    expect(a.tables[0].views).toHaveLength(1)
    expect(a.tables[0].rows[0].v).toBe(2)
  })

  it('本次未产出的旧输出表被清理', () => {
    const oldTable = table([{ v: 1 }])
    oldTable.stepId = 's1'
    const a = makeAnalysis([oldTable])
    const step = filterStep('s1', oldTable.id)

    applyStepResult(a, step, { status: 'configured', outputTables: [] })
    expect(step.output.tables).toEqual([])
    expect(a.tables).toHaveLength(0)
  })

  it('失败时保留旧输出表与 output 引用', () => {
    const oldTable = table([{ v: 1 }])
    oldTable.stepId = 's1'
    const a = makeAnalysis([oldTable])
    const step = filterStep('s1', oldTable.id)

    applyStepResult(a, step, { status: 'failed', error: 'boom' })
    expect(step.status).toBe('failed')
    expect(step.output.tables).toEqual([oldTable.id])
    expect(a.tables).toHaveLength(1)
  })
})

describe('runStep integration', () => {
  it('在 analysis 上执行 filter 步骤并写回', () => {
    const t = table([{ v: 1 }, { v: 2 }, { v: 3 }])
    const a = makeAnalysis([t])
    const step = {
      id: 's1',
      type: 'filter' as const,
      name: 'F',
      inputs: [{ port: 'Input dataset', from: { nodeId: '', port: 'Output dataset' } }],
      config: {
        filters: [{ id: 'f1', combinator: 'and', conditions: [{ id: 'c1', column: 'v', operator: 'gt', value: 1 }] }],
      },
      status: 'pending' as const,
      output: { tables: [], files: [], views: [] },
    }
    a.steps.push(step)

    // 让 resolveStepInputs 能通过 nodeId 找到表：这里用一个虚拟源步骤
    const sourceStep = {
      id: 'src',
      type: 'upload-csv' as const,
      name: 'Src',
      inputs: [],
      config: {},
      status: 'configured' as const,
      output: { tables: [t.id], files: [], views: [] },
    }
    a.steps.unshift(sourceStep)
    step.inputs[0].from.nodeId = 'src'

    runStep(a, step)
    expect(step.status).toBe('configured')
    expect(step.output.tables).toHaveLength(1)
    const out = a.tables.find((x) => x.id === step.output.tables[0])
    expect(out!.rows).toHaveLength(2)
  })
})
