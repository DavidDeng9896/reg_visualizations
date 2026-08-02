import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { createDemoAnalysis } from '../../../src/shared/seed'
import { useAnalysisStore } from '../../../src/stores/analysisStore'
import { execTool } from '../../../src/modules/ai/tools/impl'
import { findTable, findView } from '../../../src/shared/tree'

/** AI 工具实现：在真实 analysisStore 上执行（Dexie 由 fake-indexeddb 环境提供）。 */
const ctx = { confirmDestructive: true }

async function seedStore() {
  const store = useAnalysisStore()
  const a = createDemoAnalysis()
  store.$patch((state) => {
    state.current = a
    state.dirty = false
    state.selected = null
    state.mode = 'workspace'
  })
  return { store, analysis: a }
}

describe('AI 工具实现（execTool）', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('import_csv_text：推断列类型、生成上传步骤并返回表产物', async () => {
    const { analysis } = await seedStore()
    const res = await execTool('import_csv_text', { tableName: 'T1', csv: 'id,v\na,1\nb,2' }, ctx)
    expect(res.ok).toBe(true)
    expect(res.summary).toContain('2 行')
    const t = analysis.tables.find((x) => x.name === 'T1')
    expect(t).toBeTruthy()
    expect(t!.rows).toHaveLength(2)
    expect(t!.stepId).toBeTruthy()
    expect(res.artifact?.kind).toBe('table')
    expect(res.artifact?.tableId).toBe(t!.id)
  })

  it('add_filter_step：下游过滤步骤产出新表，id 回执在摘要中', async () => {
    const { analysis } = await seedStore()
    const iris = analysis.tables[0]
    const res = await execTool(
      'add_filter_step',
      { tableId: iris.id, conditions: [{ column: 'species', operator: 'eq', value: 'setosa' }] },
      ctx,
    )
    expect(res.ok).toBe(true)
    expect(res.summary).toContain('50 行')
    expect(res.summary).toMatch(/step id: .+，产出表 id: /)
    const step = analysis.steps.find((s) => s.type === 'filter')
    expect(step).toBeTruthy()
    const out = analysis.tables.find((t) => t.stepId === step!.id)
    expect(out!.rows).toHaveLength(50)
    expect(out!.rows.every((r) => r.species === 'setosa')).toBe(true)
  })

  it('add_computed_column_step：表达式派生列', async () => {
    const { analysis } = await seedStore()
    const iris = analysis.tables[0]
    const res = await execTool(
      'add_computed_column_step',
      { tableId: iris.id, name: 'sepal_area', expression: 'sepal_length * sepal_width' },
      ctx,
    )
    expect(res.ok).toBe(true)
    const step = analysis.steps.find((s) => s.type === 'computed-column')
    const out = analysis.tables.find((t) => t.stepId === step!.id)
    expect(out!.columns.map((c) => c.field)).toContain('sepal_area')
    expect(Number(out!.rows[0].sepal_area)).toBeCloseTo(Number(out!.rows[0].sepal_length) * Number(out!.rows[0].sepal_width), 8)
  })

  it('create_view + set_chart_config：视图创建与校验提示', async () => {
    const { analysis } = await seedStore()
    const iris = analysis.tables[0]
    const created = await execTool('create_view', { tableId: iris.id, type: 'scatter', name: 'AI 散点' }, ctx)
    expect(created.ok).toBe(true)
    const viewId = created.summary.match(/view id: ([0-9a-f-]+)/)?.[1]
    expect(viewId).toBeTruthy()

    const bad = await execTool('set_chart_config', { tableId: iris.id, viewId, configure: { x: { field: 'nope' } } }, ctx)
    expect(bad.ok).toBe(true)
    expect(bad.summary).toContain('校验未通过')

    const good = await execTool(
      'set_chart_config',
      { tableId: iris.id, viewId, configure: { x: { field: 'sepal_length' }, values: [{ field: 'sepal_width' }] }, style: { fitAnnotation: true } },
      ctx,
    )
    expect(good.ok).toBe(true)
    expect(good.summary).toContain('配置完成')
    const view = findView(findTable(analysis, iris.id)!.views, viewId!)
    expect(view!.chart!.style.fitAnnotation).toBe(true)
  })

  it('delete_table：需确认模式先返回 needs_confirmation，确认后删除', async () => {
    const { analysis } = await seedStore()
    const iris = analysis.tables[0]
    const need = await execTool('delete_table', { tableId: iris.id }, ctx)
    expect(need.needsConfirmation).toBe(true)
    expect(analysis.tables.find((t) => t.id === iris.id)).toBeTruthy()

    const done = await execTool('delete_table', { tableId: iris.id, __confirmed: true }, ctx)
    expect(done.ok).toBe(true)
    expect(analysis.tables.find((t) => t.id === iris.id)).toBeUndefined()
  })

  it('未知工具与缺表错误', async () => {
    await seedStore()
    expect((await execTool('nope_tool', {}, ctx)).ok).toBe(false)
    expect((await execTool('get_table_schema', { tableId: 'missing' }, ctx)).summary).toContain('表不存在')
  })
})
