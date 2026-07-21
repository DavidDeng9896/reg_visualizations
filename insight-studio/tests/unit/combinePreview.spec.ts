import { describe, expect, it } from 'vitest'
import type { Analysis, AnalysisTable, ColumnMeta, Row } from '../../src/shared/types'
import { ROW_ID_FIELD } from '../../src/shared/types'
import { createFilter, createViewNode } from '../../src/shared/factories'
import { buildCombinePreview, resolveCombineInput } from '../../src/modules/table/combinePreview'

function makeTable(id: string, columns: ColumnMeta[], rows: Row[]): AnalysisTable {
  return { id, name: id, source: 'csv', columns, rows, filters: [], views: [] }
}

const leftCols: ColumnMeta[] = [
  { field: 'id', title: 'id', dataType: 'string' },
  { field: 'val', title: 'val', dataType: 'number' },
]
const rightCols: ColumnMeta[] = [
  { field: 'id', title: 'id', dataType: 'string' },
  { field: 'label', title: 'label', dataType: 'string' },
]

function makeAnalysis(): Analysis {
  const left = makeTable('L', leftCols, [
    { [ROW_ID_FIELD]: 'l1', id: 'a', val: 1 },
    { [ROW_ID_FIELD]: 'l2', id: 'b', val: 2 },
    { [ROW_ID_FIELD]: 'l3', id: 'c', val: 3 },
  ])
  const right = makeTable('R', rightCols, [
    { [ROW_ID_FIELD]: 'r1', id: 'a', label: 'A' },
    { [ROW_ID_FIELD]: 'r2', id: 'b', label: 'B' },
  ])
  return { id: 'a1', name: 'A', createdAt: '', updatedAt: '', tables: [left, right], flowchartLayout: {} }
}

describe('resolveCombineInput', () => {
  it('表输入直接返回；视图输入走 runPipeline 物化', () => {
    const a = makeAnalysis()
    expect(resolveCombineInput(a, { kind: 'table', tableId: 'L' })!.rows).toHaveLength(3)
    const view = createViewNode('table', 'v')
    const f = createFilter('val', 'gt')
    f.conditions[0].value = 1
    view.filters.push(f)
    a.tables[0].views.push(view)
    const out = resolveCombineInput(a, { kind: 'view', tableId: 'L', viewId: view.id })!
    expect(out.rows).toHaveLength(2)
  })
  it('不存在 → null', () => {
    expect(resolveCombineInput(makeAnalysis(), { kind: 'table', tableId: 'X' })).toBeNull()
  })
})

describe('buildCombinePreview', () => {
  const L = { kind: 'table' as const, tableId: 'L' }
  const R = { kind: 'table' as const, tableId: 'R' }

  it('inner join：行数与统计正确', () => {
    const p = buildCombinePreview(makeAnalysis(), L, R, { joinType: 'inner', keys: [{ left: 'id', right: 'id' }] })
    expect(p.error).toBeUndefined()
    expect(p.totalRows).toBe(2)
    expect(p.leftRows).toBe(3)
    expect(p.rightRows).toBe(2)
    expect(p.noMatch).toBeFalsy()
  })

  it('left join：保留左表全部行', () => {
    const p = buildCombinePreview(makeAnalysis(), L, R, { joinType: 'left', keys: [{ left: 'id', right: 'id' }] })
    expect(p.totalRows).toBe(3)
  })

  it('append：隐藏键配置也合法', () => {
    const p = buildCombinePreview(makeAnalysis(), L, R, { joinType: 'append', keys: [] })
    expect(p.error).toBeUndefined()
    expect(p.totalRows).toBe(5)
  })

  it('join 无匹配：空预览 + noMatch 警告（允许创建）', () => {
    const a = makeAnalysis()
    a.tables[1].rows.forEach((r) => {
      r.id = `z-${r.id}`
    })
    const p = buildCombinePreview(a, L, R, { joinType: 'inner', keys: [{ left: 'id', right: 'id' }] })
    expect(p.error).toBeUndefined()
    expect(p.totalRows).toBe(0)
    expect(p.noMatch).toBe(true)
  })

  it('缺输入 / 缺键 / 键列不存在 → error', () => {
    expect(buildCombinePreview(makeAnalysis(), null, R, { joinType: 'left', keys: [] }).error).toBeTruthy()
    expect(buildCombinePreview(makeAnalysis(), L, R, { joinType: 'left', keys: [] }).error).toContain('连接键')
    expect(
      buildCombinePreview(makeAnalysis(), L, R, { joinType: 'left', keys: [{ left: 'ghost', right: 'id' }] }).error,
    ).toBeTruthy()
  })

  it('预览行数截断到 limit', () => {
    const a = makeAnalysis()
    // 笛卡尔展开：右表加重复键制造多行
    a.tables[1].rows.push({ [ROW_ID_FIELD]: 'r3', id: 'a', label: 'A2' }, { [ROW_ID_FIELD]: 'r4', id: 'a', label: 'A3' })
    const p = buildCombinePreview(a, L, R, { joinType: 'inner', keys: [{ left: 'id', right: 'id' }] }, 3)
    expect(p.rows.length).toBeLessThanOrEqual(3)
    expect(p.totalRows).toBe(4)
  })
})
