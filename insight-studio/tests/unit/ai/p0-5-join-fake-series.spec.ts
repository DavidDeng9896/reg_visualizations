/**
 * P0-5 cross-table fake series：
 * - Join 缺 leftTableId/rightTableId → 硬失败（不回退默认表）
 * - create_chart / set_chart_config 拒绝手填 series[].data 数值点（仅 AI 配图门）
 * - 不拦截 Custom Code go.Figure 路径（reject 仅挂在 prepareAiChartConfigure）
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { createDemoAnalysis } from '../../../src/shared/seed'
import { useAnalysisStore } from '../../../src/stores/analysisStore'
import { execTool, type ToolCtx } from '../../../src/modules/ai/tools/impl'
import { rejectAiChartEChartsPayload } from '../../../src/modules/ai/normalizeChartConfigure'

const ctx: ToolCtx = { confirmDestructive: true, confirmWrite: false }

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

describe('P0-5 join dual tableIds', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('缺 leftTableId 或 rightTableId（含空串）硬失败，不回退选中/默认表', async () => {
    const { analysis, store } = await seedStore()
    const iris = analysis.tables[0]!
    store.select({ kind: 'table', tableId: iris.id })
    const beforeSteps = analysis.steps.length

    const missingBoth = await execTool(
      'add_join_step',
      { joinType: 'left', keys: [{ left: 'species', right: 'species' }] },
      ctx,
    )
    expect(missingBoth.ok).toBe(false)
    expect(missingBoth.summary).toMatch(/必须显式|leftTableId|rightTableId/)

    const missingLeft = await execTool(
      'add_join_step',
      {
        rightTableId: iris.id,
        joinType: 'inner',
        keys: [{ left: 'species', right: 'species' }],
      },
      ctx,
    )
    expect(missingLeft.ok).toBe(false)
    expect(missingLeft.summary).toMatch(/必须显式|leftTableId/)

    const missingRight = await execTool(
      'add_join_step',
      {
        leftTableId: iris.id,
        joinType: 'left',
        keys: [{ left: 'species', right: 'species' }],
      },
      ctx,
    )
    expect(missingRight.ok).toBe(false)
    expect(missingRight.summary).toMatch(/必须显式|rightTableId/)

    const blankIds = await execTool(
      'add_join_step',
      {
        leftTableId: '  ',
        rightTableId: '\t',
        joinType: 'left',
        keys: [{ left: 'species', right: 'species' }],
      },
      ctx,
    )
    expect(blankIds.ok).toBe(false)
    expect(blankIds.summary).toMatch(/必须显式|leftTableId|rightTableId/)

    expect(analysis.steps.length).toBe(beforeSteps)
    expect(analysis.steps.some((s) => s.type === 'join')).toBe(false)
  })

  it('双 id 齐全时 join 成功（跨表合并，非假系列）', async () => {
    await seedStore()
    const left = await execTool('import_csv_text', { tableName: 'p05_l', csv: 'id,v\na,1\nb,2' }, ctx)
    const right = await execTool('import_csv_text', { tableName: 'p05_r', csv: 'id,label\na,Alpha' }, ctx)
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
    expect(res.summary).toMatch(/产出表 id/)
  })
})

describe('P0-5 reject hand-filled series[].data (AI configure only)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('rejectAiChartEChartsPayload：数值点 / 坐标对 / value 对象一律手填假系列', () => {
    expect(
      rejectAiChartEChartsPayload({
        configure: { series: [{ name: 'fake', data: [1, 2, 3] }] },
      }),
    ).toMatch(/series\.data|手填|字段映射/i)

    expect(
      rejectAiChartEChartsPayload({
        series: [{ type: 'scatter', data: [[0.1, 2.3], [0.4, 1.1]] }],
      }),
    ).toMatch(/series\.data|手填|字段映射/i)

    expect(
      rejectAiChartEChartsPayload({
        configure: {
          series: [{ type: 'bar', data: [{ value: 10 }, { value: 20 }, { name: 'c', value: 30 }] }],
        },
      }),
    ).toMatch(/series\.data|手填|字段映射/i)

    // 平台分组槽 series:{field} 放行
    expect(rejectAiChartEChartsPayload({ configure: { x: 'a', series: { field: 'group' } } })).toBeNull()
    expect(
      rejectAiChartEChartsPayload({
        configure: { x: 'docking score', values: [{ field: 'localStrain(kcal)' }] },
      }),
    ).toBeNull()
  })

  it('create_chart：拒绝手填 series.data，不写视图', async () => {
    const { analysis } = await seedStore()
    const iris = analysis.tables[0]!
    const before = iris.views.length
    const bad = await execTool(
      'create_chart',
      {
        tableId: iris.id,
        chartType: 'scatter',
        configure: {
          series: [{ type: 'scatter', data: [[1, 2], [3, 4]] }],
        },
      },
      ctx,
    )
    expect(bad.ok).toBe(false)
    expect(bad.summary).toMatch(/series\.data|手填|字段映射|go\.Figure/i)
    expect(iris.views.length).toBe(before)
  })

  it('set_chart_config：拒绝手填 series.data，不污染既有映射', async () => {
    const { analysis } = await seedStore()
    const iris = analysis.tables[0]!
    const created = await execTool(
      'create_chart',
      {
        tableId: iris.id,
        chartType: 'bar',
        name: 'p05-keep',
        configure: { x: 'species', y: { field: 'sepal_length' } },
      },
      ctx,
    )
    expect(created.ok, created.summary).toBe(true)
    const viewId = created.artifact?.viewId!
    const beforeX = iris.views.find((v) => v.id === viewId)?.chart?.configure.x?.field

    const bad = await execTool(
      'set_chart_config',
      {
        tableId: iris.id,
        viewId,
        configure: {
          series: [{ data: [{ value: 1 }, { value: 2 }] }],
        },
      },
      ctx,
    )
    expect(bad.ok).toBe(false)
    expect(bad.summary).toMatch(/series\.data|手填|字段映射/i)
    expect(iris.views.find((v) => v.id === viewId)?.chart?.configure.x?.field).toBe(beforeX)
  })

  it('白名单窄：合法字段映射配图仍成功；Custom Code 工具不走 reject 门', async () => {
    const { analysis } = await seedStore()
    const iris = analysis.tables[0]!
    const okChart = await execTool(
      'create_chart',
      {
        tableId: iris.id,
        chartType: 'bar',
        name: 'p05-field',
        configure: { x: { field: 'species' }, y: { field: 'petal_width' } },
      },
      ctx,
    )
    expect(okChart.ok, okChart.summary).toBe(true)

    // Custom Code 路径不调用 rejectAiChartEChartsPayload；此处仅断言工具可受理（自测可能因无 worker 失败，但摘要不得是 series.data 方言拒）
    const cc = await execTool(
      'add_custom_code_step',
      {
        tableId: iris.id,
        name: 'p05-figure',
        code: 'def custom_code(inputs, **kwargs):\n    return inputs\n',
      },
      ctx,
    )
    expect(cc.summary).not.toMatch(/series\.data|手填 series|ECharts/i)
  })
})
