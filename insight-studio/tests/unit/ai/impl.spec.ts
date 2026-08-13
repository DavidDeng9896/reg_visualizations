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

  it('set_chart_config：bar 的 y 数组写法可成功', async () => {
    const { analysis } = await seedStore()
    const iris = analysis.tables[0]
    await execTool('create_view', { tableId: iris.id, type: 'bar', name: 'EC50柱' }, ctx)
    const res = await execTool(
      'set_chart_config',
      {
        configure: {
          x: { field: 'species' },
          y: [{ field: 'sepal_length', aggregate: 'sum' }],
        },
      },
      ctx,
    )
    expect(res.ok).toBe(true)
    const view = iris.views.find((v) => v.name === 'EC50柱')
    expect(view?.chart?.configure.y?.field).toBe('sepal_length')
    expect(view?.chart?.configure.y?.aggregation).toBe('sum')
  })

  it('set_chart_config：仅传 values 时自动补齐 X', async () => {
    const { analysis } = await seedStore()
    const iris = analysis.tables[0]
    await execTool('create_view', { tableId: iris.id, type: 'scatter', name: '只给Y' }, ctx)
    const res = await execTool(
      'set_chart_config',
      { configure: { values: [{ field: 'sepal_width' }] } },
      ctx,
    )
    expect(res.ok).toBe(true)
    expect(res.summary).toMatch(/配置完成|自动补齐/)
    const view = iris.views.find((v) => v.name === '只给Y')
    expect(view?.chart?.configure.values?.[0]?.field).toBe('sepal_width')
    expect(view?.chart?.configure.x?.field).toBeTruthy()
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

  it('add_filter_step：接在 Custom Code 产出表之后应成功', async () => {
    const { analysis } = await seedStore()
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
            rows: [
              { species: 'setosa', n: 1 },
              { species: 'setosa', n: 2 },
              { species: 'versicolor', n: 3 },
            ],
          },
        ],
        stdout: '',
        stderr: '',
      }),
    })) as unknown as typeof fetch
    const prev = globalThis.fetch
    globalThis.fetch = fetchImpl
    try {
      const created = await execTool(
        'add_custom_code_step',
        {
          tableId: iris.id,
          name: '宽表',
          code: 'def custom_code(inputs, **kwargs):\n    return [inputs[0]]\n',
        },
        ctx,
      )
      expect(created.ok, created.summary).toBe(true)
      const outId = created.artifact?.tableId
      expect(outId).toBeTruthy()
      const filtered = await execTool(
        'add_filter_step',
        { tableId: outId, conditions: [{ column: 'species', operator: 'eq', value: 'setosa' }] },
        ctx,
      )
      expect(filtered.ok, filtered.summary).toBe(true)
      expect(filtered.summary).toContain('2 行')
    } finally {
      globalThis.fetch = prev
    }
  })

  it('add_custom_code_step：上游也是 Custom Code 时应能解析产出表', async () => {
    const { analysis } = await seedStore()
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
            columns: [{ field: 'species', dataType: 'string' }],
            rows: [{ species: 'setosa' }],
          },
        ],
        stdout: '',
        stderr: '',
      }),
    })) as unknown as typeof fetch
    const prev = globalThis.fetch
    globalThis.fetch = fetchImpl
    try {
      const first = await execTool(
        'add_custom_code_step',
        { tableId: iris.id, name: '第一步', code: 'def custom_code(inputs, **kwargs):\n    return [inputs[0]]\n' },
        ctx,
      )
      expect(first.ok, first.summary).toBe(true)
      const second = await execTool(
        'add_custom_code_step',
        {
          tableId: first.artifact?.tableId,
          name: '第二步',
          code: 'def custom_code(inputs, **kwargs):\n    return [inputs[0]]\n',
        },
        ctx,
      )
      expect(second.ok, second.summary).toBe(true)
      expect(second.summary).not.toContain('无法解析上游表')
    } finally {
      globalThis.fetch = prev
    }
  })

  it('未知工具与缺表错误', async () => {
    await seedStore()
    expect((await execTool('nope_tool', {}, ctx)).ok).toBe(false)
    expect((await execTool('get_table_schema', { tableId: 'missing' }, ctx)).summary).toContain('表不存在')
  })

  it('create_analysis：当前已打开同名分析则复用', async () => {
    const { analysis } = await seedStore()
    const res = await execTool('create_analysis', { name: analysis.name }, ctx)
    expect(res.ok).toBe(true)
    expect(res.summary).toContain('不要再 create_analysis')
    expect(res.artifact?.analysisId).toBe(analysis.id)
  })

  it('update_custom_code_step：拒绝占位 stepId', async () => {
    await seedStore()
    const res = await execTool('update_custom_code_step', { stepId: '待获取', code: 'x = 1' }, ctx)
    expect(res.ok).toBe(false)
    expect(res.summary).toContain('UUID')
    expect(res.summary).toContain('待获取')
  })

  it('add_join_step：按 key 连接两表并写下正确端口', async () => {
    await seedStore()
    const left = await execTool('import_csv_text', { tableName: 'left', csv: 'id,v\na,1\nb,2' }, ctx)
    const right = await execTool('import_csv_text', { tableName: 'right', csv: 'id,label\na,Alpha' }, ctx)
    expect(left.ok && right.ok).toBe(true)
    const res = await execTool(
      'add_join_step',
      {
        leftTableId: left.artifact?.tableId,
        rightTableId: right.artifact?.tableId,
        joinType: 'left',
        keys: [{ left: 'id', right: 'id' }],
      },
      ctx,
    )
    expect(res.ok, res.summary).toBe(true)
    expect(res.summary).toContain('2 行')
    const live = useAnalysisStore().current!
    const step = live.steps.find((s) => s.type === 'join')
    expect(step).toBeTruthy()
    expect(step!.inputs.map((i) => i.port)).toEqual(['Left table', 'Right table'])
    expect(step!.inputs.every((i) => i.from.port === 'Output dataset')).toBe(true)
    const out = live.tables.find((t) => t.id === res.artifact?.tableId)
    expect(out!.rows).toHaveLength(2)
    expect(out!.rows[0].label).toBe('Alpha')
  })

  it('add_union_step：纵向合并结构兼容表', async () => {
    await seedStore()
    const a = await execTool('import_csv_text', { tableName: 'u1', csv: 'id,v\na,1' }, ctx)
    const b = await execTool('import_csv_text', { tableName: 'u2', csv: 'id,v\nb,2' }, ctx)
    const res = await execTool('add_union_step', { tableIds: [a.artifact?.tableId, b.artifact?.tableId] }, ctx)
    expect(res.ok, res.summary).toBe(true)
    expect(res.summary).toContain('2 行')
    const step = useAnalysisStore().current!.steps.find((s) => s.type === 'union')
    expect(step!.inputs.every((i) => i.port === 'Input tables')).toBe(true)
  })

  it('add_hide_columns_step：去掉指定列', async () => {
    const { analysis } = await seedStore()
    const iris = analysis.tables[0]
    const before = iris.columns.length
    const res = await execTool('add_hide_columns_step', { tableId: iris.id, columns: ['species'] }, ctx)
    expect(res.ok, res.summary).toBe(true)
    const out = analysis.tables.find((t) => t.id === res.artifact?.tableId)
    expect(out!.columns.map((c) => c.field)).not.toContain('species')
    expect(out!.columns.length).toBe(before - 1)
  })

  it('create_report_step + update_report_step', async () => {
    await seedStore()
    const created = await execTool(
      'create_report_step',
      { name: '亲和力小结', report: { title: 'hlx69', theme: 'research', sections: [] } },
      ctx,
    )
    expect(created.ok, created.summary).toBe(true)
    expect(created.artifact?.kind).toBe('report')
    const stepId = created.artifact?.stepId
    expect(stepId).toBeTruthy()
    const updated = await execTool(
      'update_report_step',
      { stepId, name: '更新后的报告', report: { title: 'r1 结论', theme: 'research', sections: [{ heading: '达标', body: '23/70' }] } },
      ctx,
    )
    expect(updated.ok, updated.summary).toBe(true)
    const step = useAnalysisStore().current!.steps.find((s) => s.id === stepId)
    expect(step!.name).toBe('更新后的报告')
    expect((step!.config.report as { title?: string })?.title).toBe('r1 结论')
  })

  it('create_dashboard + add_dashboard_widget', async () => {
    const { analysis } = await seedStore()
    const iris = analysis.tables[0]
    const dash = await execTool('create_dashboard', { name: 'hlx69 看板' }, ctx)
    expect(dash.ok, dash.summary).toBe(true)
    const dashboardId = dash.artifact?.dashboardId
    expect(dashboardId).toBeTruthy()
    const widget = await execTool(
      'add_dashboard_widget',
      { dashboardId, analysisId: analysis.id, tableId: iris.id },
      ctx,
    )
    expect(widget.ok, widget.summary).toBe(true)
    expect(widget.artifact?.kind).toBe('dashboard')
  })

  it('delete_step：需确认，批准后去掉步骤与产出表', async () => {
    const { analysis } = await seedStore()
    const iris = analysis.tables[0]
    const filtered = await execTool(
      'add_filter_step',
      { tableId: iris.id, conditions: [{ column: 'species', operator: 'eq', value: 'setosa' }] },
      ctx,
    )
    const stepId = filtered.summary.match(/step id: ([0-9a-f-]+)/)?.[1]
    expect(stepId).toBeTruthy()
    const need = await execTool('delete_step', { stepId }, ctx)
    expect(need.needsConfirmation).toBe(true)
    expect(analysis.steps.some((s) => s.id === stepId)).toBe(true)
    const done = await execTool('delete_step', { stepId, __confirmed: true }, ctx)
    expect(done.ok).toBe(true)
    expect(analysis.steps.some((s) => s.id === stepId)).toBe(false)
    expect(analysis.tables.find((t) => t.id === filtered.artifact?.tableId)).toBeUndefined()
  })

  it('run_step：按 UUID 重跑已有步骤', async () => {
    const { analysis } = await seedStore()
    const iris = analysis.tables[0]
    const filtered = await execTool(
      'add_filter_step',
      { tableId: iris.id, conditions: [{ column: 'species', operator: 'eq', value: 'setosa' }] },
      ctx,
    )
    const stepId = filtered.summary.match(/step id: ([0-9a-f-]+)/)?.[1]
    const rerun = await execTool('run_step', { stepId }, ctx)
    expect(rerun.ok, rerun.summary).toBe(true)
    expect(rerun.summary).toContain('已重新执行')
  })

  it('confirmWrite：写入类工具先挂起确认', async () => {
    const { analysis } = await seedStore()
    const writeCtx = { confirmDestructive: true, confirmWrite: true }
    const need = await execTool(
      'add_filter_step',
      { tableId: analysis.tables[0].id, conditions: [{ column: 'species', operator: 'eq', value: 'setosa' }] },
      writeCtx,
    )
    expect(need.needsConfirmation).toBe(true)
    const done = await execTool(
      'add_filter_step',
      {
        tableId: analysis.tables[0].id,
        conditions: [{ column: 'species', operator: 'eq', value: 'setosa' }],
        __confirmed: true,
      },
      writeCtx,
    )
    expect(done.ok, done.summary).toBe(true)
  })

  it('csv → filter → join → computed → hide → report：端口可解析', async () => {
    await seedStore()
    const left = await execTool('import_csv_text', { tableName: 'hits', csv: 'id,score\n1,10\n2,1\n3,8' }, ctx)
    const right = await execTool('import_csv_text', { tableName: 'meta', csv: 'id,batch\n1,A\n2,B\n3,A' }, ctx)
    const filtered = await execTool(
      'add_filter_step',
      { tableId: left.artifact?.tableId, conditions: [{ column: 'score', operator: 'gt', value: 5 }] },
      ctx,
    )
    expect(filtered.ok, filtered.summary).toBe(true)
    const joined = await execTool(
      'add_join_step',
      {
        leftTableId: filtered.artifact?.tableId,
        rightTableId: right.artifact?.tableId,
        joinType: 'inner',
        keys: [{ left: 'id', right: 'id' }],
      },
      ctx,
    )
    expect(joined.ok, joined.summary).toBe(true)
    const computed = await execTool(
      'add_computed_column_step',
      { tableId: joined.artifact?.tableId, name: 'score2', expression: 'score * 2' },
      ctx,
    )
    expect(computed.ok, computed.summary).toBe(true)
    const hidden = await execTool(
      'add_hide_columns_step',
      { tableId: computed.artifact?.tableId, columns: ['batch'] },
      ctx,
    )
    expect(hidden.ok, hidden.summary).toBe(true)
    const report = await execTool('create_report_step', { name: '管道报告' }, ctx)
    expect(report.ok).toBe(true)

    const a = useAnalysisStore().current!
    const byType = (t: string) => a.steps.find((s) => s.type === t)!
    expect(byType('filter').inputs[0].from.port).toBe('Output dataset')
    expect(byType('join').inputs[0].from.port).toBe('Output dataset')
    expect(byType('computed-column').inputs[0].from.port).toBe('Output dataset')
    expect(byType('hide-columns').inputs[0].from.port).toBe('Output dataset')
    const out = a.tables.find((t) => t.id === hidden.artifact?.tableId)
    expect(out!.rows).toHaveLength(2)
    expect(out!.columns.map((c) => c.field)).toContain('score2')
    expect(out!.columns.map((c) => c.field)).not.toContain('batch')
  })

  it('import_ai_file：md 说明文档拒绝导入并提示勿当表', async () => {
    await seedStore()
    const { aiFilesApi } = await import('../../../src/modules/ai/client')
    vi.spyOn(aiFilesApi, 'meta').mockResolvedValue({
      id: 'file-md-1',
      name: 'hai-club-data-lifecycle.md',
      mime: 'text/markdown',
      sizeBytes: 20,
      createdAt: new Date().toISOString(),
      kind: 'text',
    })
    const res = await execTool('import_ai_file', { fileId: 'file-md-1' }, ctx)
    expect(res.ok).toBe(false)
    expect(res.summary).toContain('说明文档')
    expect(res.summary).toContain('不要 import_ai_file')
  })
})
