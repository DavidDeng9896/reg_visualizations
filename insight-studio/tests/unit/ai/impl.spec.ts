import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { reactive } from 'vue'
import { createDemoAnalysis } from '../../../src/shared/seed'
import { sealAnalysisRows } from '../../../src/shared/factories'
import { useAnalysisStore } from '../../../src/stores/analysisStore'
import { cloneAnalysisForDraft, execTool } from '../../../src/modules/ai/tools/impl'
import { findTable, findView } from '../../../src/shared/tree'

/** AI 工具实现：在真实 analysisStore 上执行（Dexie 由 fake-indexeddb 环境提供）。 */
const ctx = { confirmDestructive: true, confirmWrite: false }

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

  it('import_ai_file：按 fileId 导入 CSV 附件', async () => {
    const { analysis } = await seedStore()
    const before = analysis.tables.length
    const { aiFilesApi } = await import('../../../src/modules/ai/client')
    vi.spyOn(aiFilesApi, 'meta').mockResolvedValue({
      id: 'file-csv-1',
      name: 'hits.csv',
      mime: 'text/csv',
      sizeBytes: 20,
      createdAt: new Date().toISOString(),
      kind: 'csv',
    })
    const csvBytes = new TextEncoder().encode('id,od450\nc1,0.8\nc2,1.2')
    vi.spyOn(aiFilesApi, 'downloadBlob').mockResolvedValue({
      arrayBuffer: async () => csvBytes.buffer.slice(csvBytes.byteOffset, csvBytes.byteOffset + csvBytes.byteLength),
      text: async () => 'id,od450\nc1,0.8\nc2,1.2',
    } as unknown as Blob)

    const res = await execTool('import_ai_file', { fileId: 'file-csv-1', tableName: 'ELISA' }, ctx)
    expect(res.summary).toBeTruthy()
    expect(res.ok, res.summary).toBe(true)
    expect(res.summary).toContain('ELISA')
    expect(analysis.tables.length).toBe(before + 1)
    const t = analysis.tables.find((x) => x.name === 'ELISA')
    expect(t?.rows).toHaveLength(2)
    expect(res.artifact?.tableId).toBe(t?.id)
  })

  it('list_tables 空提示引导 import_ai_file', async () => {
    const { store } = await seedStore()
    store.mutate((a) => {
      a.tables = []
      a.steps = []
    })
    const res = await execTool('list_tables', {}, ctx)
    expect(res.ok).toBe(true)
    expect(res.summary).toContain('import_ai_file')
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
    expect(bad.ok).toBe(false)
    expect(bad.summary).toContain('校验未通过')

    const viaY = await execTool(
      'set_chart_config',
      { tableId: iris.id, viewId, configure: { x: { field: 'sepal_length' }, y: { field: 'sepal_width' } } },
      ctx,
    )
    expect(viaY.ok).toBe(true)
    expect(viaY.summary).toContain('配置完成')

    const good = await execTool(
      'set_chart_config',
      { tableId: iris.id, viewId, configure: { x: { field: 'sepal_length' }, values: [{ field: 'sepal_width' }] }, style: { fitAnnotation: true } },
      ctx,
    )
    expect(good.ok).toBe(true)
    expect(good.summary).toContain('配置完成')
    const view = findView(findTable(analysis, iris.id)!.views, viewId!)
    expect(view!.chart!.style.fitAnnotation).toBe(true)
    expect(view!.chart!.configure.values?.[0]?.field).toBe('sepal_width')
  })

  it('add_filter_step：缺 tableId 时回退分析内唯一/最近表', async () => {
    const { analysis, store } = await seedStore()
    const iris = analysis.tables[0]
    store.select({ kind: 'table', tableId: iris.id })
    const res = await execTool(
      'add_filter_step',
      { conditions: [{ column: 'species', operator: 'eq', value: 'setosa' }] },
      ctx,
    )
    expect(res.ok).toBe(true)
    expect(res.summary).toContain(iris.id)
    expect(res.summary).toContain('50 行')
  })

  it('set_chart_config：可缺 viewId，回退最近创建的图表视图', async () => {
    const { analysis } = await seedStore()
    const iris = analysis.tables[0]
    const created = await execTool('create_view', { tableId: iris.id, type: 'scatter', name: '自动回退视图' }, ctx)
    expect(created.ok).toBe(true)
    const res = await execTool(
      'set_chart_config',
      {
        configure: {
          x: { field: 'sepal_length' },
          values: [{ field: 'sepal_width' }],
        },
      },
      ctx,
    )
    expect(res.ok).toBe(true)
    expect(res.summary).toContain('配置完成')
  })

  it('set_chart_config：可仅用 viewId 反查表；configure 可为 values 数组', async () => {
    const { analysis } = await seedStore()
    const iris = analysis.tables[0]
    const created = await execTool('create_view', { tableId: iris.id, type: 'scatter', name: 'kon vs koff' }, ctx)
    const viewId = created.summary.match(/view id: ([0-9a-f-]+)/)?.[1]!
    const res = await execTool(
      'set_chart_config',
      {
        viewId,
        configure: {
          x: { field: 'sepal_length' },
          values: [{ field: 'sepal_width' }],
        },
      },
      ctx,
    )
    expect(res.ok).toBe(true)
    expect(res.summary).toContain('配置完成')

    const viaArray = await execTool(
      'set_chart_config',
      {
        viewId,
        configure: [{ field: 'petal_length' }],
        x: { field: 'sepal_length' },
      },
      ctx,
    )
    expect(viaArray.ok).toBe(true)
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

  it('clear_analysis：一次确认清空全部表与步骤', async () => {
    const { analysis } = await seedStore()
    expect(analysis.tables.length).toBeGreaterThan(0)
    const need = await execTool('clear_analysis', {}, ctx)
    expect(need.needsConfirmation).toBe(true)
    const done = await execTool('clear_analysis', { __confirmed: true }, ctx)
    expect(done.ok).toBe(true)
    expect(analysis.tables).toHaveLength(0)
    expect(analysis.steps).toHaveLength(0)
  })

  it('cloneAnalysisForDraft：可克隆 Pinia/sealRows 后的分析（structuredClone 会炸）', () => {
    const sealed = sealAnalysisRows(createDemoAnalysis())
    const proxied = reactive(sealed)
    expect(() => structuredClone(proxied)).toThrow(/could not be cloned|DataCloneError|Failed to execute/i)
    const draft = cloneAnalysisForDraft(proxied as typeof sealed)
    expect(draft.id).toBe(sealed.id)
    expect(draft.tables[0].rows.length).toBe(sealed.tables[0].rows.length)
    expect(draft.tables[0].rows).not.toBe(sealed.tables[0].rows)
  })

  it('add_custom_code_step：在响应式分析上自测并写入画布', async () => {
    const { analysis } = await seedStore()
    // 模拟工作区：封印行 + 经 store 持有（与真实打开分析一致）
    sealAnalysisRows(analysis)
    const iris = analysis.tables[0]
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        ok: true,
        outputs: [
          {
            name: 'out',
            kind: 'dataframe',
            columns: [
              { field: 'species', dataType: 'string' },
              { field: 'n', dataType: 'number' },
            ],
            rows: [{ species: 'setosa', n: 1 }],
          },
        ],
        stdout: '',
        stderr: '',
      }),
    })) as unknown as typeof fetch
    const prev = globalThis.fetch
    globalThis.fetch = fetchImpl
    try {
      const res = await execTool(
        'add_custom_code_step',
        {
          tableId: iris.id,
          name: 'IC50清洗v2',
          code: 'def custom_code(inputs, **kwargs):\n    return [inputs[0]]\n',
        },
        ctx,
      )
      expect(res.ok).toBe(true)
      expect(res.summary).toContain('IC50清洗v2')
      expect(analysis.steps.some((s) => s.type === 'custom-code' && s.name === 'IC50清洗v2')).toBe(true)
      expect(fetchImpl).toHaveBeenCalled()
    } finally {
      globalThis.fetch = prev
    }
  })

  it('未知工具与缺表错误', async () => {
    await seedStore()
    expect((await execTool('nope_tool', {}, ctx)).ok).toBe(false)
    expect((await execTool('get_table_schema', { tableId: 'missing' }, ctx)).summary).toContain('表不存在')
  })
})
