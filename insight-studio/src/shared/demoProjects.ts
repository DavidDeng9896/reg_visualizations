import type { Analysis, AnalysisTable, ChartConfig, ChartType, ColumnMeta, Filter, Row, StepNode, ViewNode } from './types'
import { ROW_ID_FIELD } from './types'
import { uuid } from './id'
import { nowIso } from './datetime'
import { createChartConfig, sealAnalysisRows } from './factories'
import { rng, gauss, round2 as round } from './seed'

/**
 * 抗体业务演示数据（「生成项目示例数据」）。
 * 3 个分析条目，每个都是完整的抗体业务分析：
 * - 真实步骤管线（upload → filter/join/computed-column），流程图有完整分析过程
 * - 数据表丰富且步骤产物与步骤定义一致（重跑结果不变）
 * - 预置图表覆盖六图种（bar/line/scatter/box/pie/heatmap）
 * id 固定（demo-*），重复生成 = 覆盖，不产生重复条目。
 */

/* ------------------------------- 小工具 ------------------------------- */

function makeView(
  type: ChartType,
  name: string,
  configure: Partial<ChartConfig['configure']>,
  style?: Partial<ChartConfig['style']>,
  id?: string,
): ViewNode {
  const chart = createChartConfig(type)
  Object.assign(chart.configure, configure)
  if (style) Object.assign(chart.style, style)
  return { id: id ?? uuid(), name, type, filters: [], transforms: [], chart, children: [] }
}

function mkTable(
  id: string,
  name: string,
  columns: ColumnMeta[],
  rows: Row[],
  views: ViewNode[] = [],
  stepId?: string,
): AnalysisTable {
  return {
    id,
    name,
    source: stepId ? 'step' : 'demo',
    columns,
    rows,
    filters: [],
    views,
    ...(stepId ? { stepId } : {}),
  }
}

function uploadStep(id: string, name: string, tableId: string): StepNode {
  return {
    id,
    type: 'upload-csv',
    name,
    inputs: [],
    config: { tableName: name },
    status: 'configured',
    output: { tables: [tableId], files: [], views: [] },
  }
}

function filterStep(id: string, name: string, fromStepId: string, filters: Filter[], outTableId: string): StepNode {
  return {
    id,
    type: 'filter',
    name,
    inputs: [{ port: 'Input dataset', from: { nodeId: fromStepId, port: 'Output dataset' } }],
    config: { filters },
    status: 'configured',
    output: { tables: [outTableId], files: [], views: [] },
  }
}

function joinStep(
  id: string,
  name: string,
  leftStepId: string,
  rightStepId: string,
  keys: { left: string; right: string }[],
  outTableId: string,
): StepNode {
  return {
    id,
    type: 'join',
    name,
    inputs: [
      { port: 'Left table', from: { nodeId: leftStepId, port: 'Output dataset' } },
      { port: 'Right table', from: { nodeId: rightStepId, port: 'Output dataset' } },
    ],
    config: { joinType: 'inner', keys, suffixes: ['_x', '_y'] },
    status: 'configured',
    output: { tables: [outTableId], files: [], views: [] },
  }
}

function computedStep(id: string, name: string, fromStepId: string, colName: string, expression: string, outTableId: string): StepNode {
  return {
    id,
    type: 'computed-column',
    name,
    inputs: [{ port: 'Input dataset', from: { nodeId: fromStepId, port: 'Output dataset' } }],
    config: { name: colName, expression },
    status: 'configured',
    output: { tables: [outTableId], files: [], views: [] },
  }
}

function cond(column: string, operator: Filter['conditions'][number]['operator'], value: Filter['conditions'][number]['value']): Filter {
  return { id: uuid(), combinator: 'and', conditions: [{ id: uuid(), column, operator, value }] }
}

/* ======================= 1. 抗体纯化工艺分析（MD-AB023） ======================= */

const PUR_STEPS = [
  { name: 'Capture', yield: 92, purity: 78, conc: 3.2 },
  { name: 'Wash', yield: 88, purity: 86, conc: 2.6 },
  { name: 'Elution', yield: 81, purity: 94, conc: 4.8 },
  { name: 'Polish', yield: 74, purity: 98.5, conc: 4.1 },
]

function buildAb023(): Analysis {
  const rand = rng(2301)
  const batchCols: ColumnMeta[] = [
    { field: 'batch_id', title: 'batch_id', dataType: 'string' },
    { field: 'step', title: 'step', dataType: 'string' },
    { field: 'yield_pct', title: 'yield_pct', dataType: 'number' },
    { field: 'purity_pct', title: 'purity_pct', dataType: 'number' },
    { field: 'conc_mgml', title: 'conc_mgml', dataType: 'number' },
  ]
  const batchRows: Row[] = []
  for (let b = 1; b <= 8; b += 1) {
    for (const s of PUR_STEPS) {
      batchRows.push({
        [ROW_ID_FIELD]: uuid(),
        batch_id: `B${String(b).padStart(3, '0')}`,
        step: s.name,
        yield_pct: round(gauss(rand, s.yield, 2.5), 1),
        purity_pct: round(gauss(rand, s.purity, 1.2), 1),
        conc_mgml: round(gauss(rand, s.conc, 0.4)),
      })
    }
  }

  const secCols: ColumnMeta[] = [
    { field: 'batch_id', title: 'batch_id', dataType: 'string' },
    { field: 'monomer_pct', title: 'monomer_pct', dataType: 'number' },
    { field: 'aggregate_pct', title: 'aggregate_pct', dataType: 'number' },
    { field: 'grade', title: 'grade', dataType: 'string' },
  ]
  const secRows: Row[] = []
  for (let b = 1; b <= 12; b += 1) {
    const mono = Math.min(99.6, gauss(rand, 96.2, 1.8))
    const agg = Math.max(0.1, gauss(rand, 2.6, 1.2))
    const grade = mono >= 97 ? '优' : mono >= 95 ? '良' : '待改进'
    secRows.push({
      [ROW_ID_FIELD]: uuid(),
      batch_id: `B${String(b).padStart(3, '0')}`,
      monomer_pct: round(mono, 1),
      aggregate_pct: round(agg, 1),
      grade,
    })
  }

  // 派生：Elution 记录（filter）→ 与 SEC 合并（join batch_id）
  const elutionRows = batchRows.filter((r) => r.step === 'Elution')
  const secByBatch = new Map(secRows.map((r) => [String(r.batch_id), r]))
  const joinCols: ColumnMeta[] = [
    { field: 'batch_id', title: 'batch_id', dataType: 'string' },
    { field: 'step', title: 'step', dataType: 'string' },
    { field: 'yield_pct', title: 'yield_pct', dataType: 'number' },
    { field: 'conc_mgml', title: 'conc_mgml', dataType: 'number' },
    { field: 'monomer_pct', title: 'monomer_pct', dataType: 'number' },
    { field: 'aggregate_pct', title: 'aggregate_pct', dataType: 'number' },
    { field: 'grade', title: 'grade', dataType: 'string' },
  ]
  const joinRows: Row[] = elutionRows.map((l) => {
    const r = secByBatch.get(String(l.batch_id))!
    return {
      [ROW_ID_FIELD]: uuid(),
      batch_id: l.batch_id,
      step: l.step,
      yield_pct: l.yield_pct,
      conc_mgml: l.conc_mgml,
      monomer_pct: r.monomer_pct,
      aggregate_pct: r.aggregate_pct,
      grade: r.grade,
    }
  })

  const up1 = uploadStep('demo-s-ab023-up1', 'Purification batches', 'demo-t-ab023-batches')
  const up2 = uploadStep('demo-s-ab023-up2', 'SEC purity results', 'demo-t-ab023-sec')
  const f1 = filterStep(
    'demo-s-ab023-f1',
    'Elution 记录',
    up1.id,
    [cond('step', 'eq', 'Elution')],
    'demo-t-ab023-elution',
  )
  const j1 = joinStep('demo-s-ab023-j1', 'Elution × SEC 合并', f1.id, up2.id, [{ left: 'batch_id', right: 'batch_id' }], 'demo-t-ab023-joined')

  const tables = [
    mkTable('demo-t-ab023-batches', 'Purification batches', batchCols, batchRows, [
      makeView('bar', '各步骤收率', { x: { field: 'step' }, y: { field: 'yield_pct', aggregation: 'mean' }, errorBars: 'sd' }, undefined, 'demo-v-ab023-bar'),
      makeView('box', '收率分布', { y: { field: 'yield_pct' }, x: { field: 'step' } }, undefined, 'demo-v-ab023-box'),
      makeView('line', '纯度趋势', { x: { field: 'step' }, values: [{ field: 'purity_pct', aggregation: 'mean' }] }, undefined, 'demo-v-ab023-line'),
    ], up1.id),
    mkTable('demo-t-ab023-sec', 'SEC purity results', secCols, secRows, [], up2.id),
    mkTable('demo-t-ab023-elution', 'Elution 记录', batchCols, elutionRows, [], f1.id),
    mkTable('demo-t-ab023-joined', 'Elution × SEC 合并', joinCols, joinRows, [
      makeView('scatter', '浓度 vs 单体纯度', { x: { field: 'conc_mgml' }, values: [{ field: 'monomer_pct' }], color: { field: 'grade' } }, undefined, 'demo-v-ab023-scatter'),
      makeView('pie', '质量等级占比', { categories: { field: 'grade' } }, undefined, 'demo-v-ab023-pie'),
    ], j1.id),
  ]

  const now = nowIso()
  return sealAnalysisRows({
    id: 'demo-md-ab023',
    name: '抗体纯化工艺分析',
    createdAt: now,
    updatedAt: now,
    project: 'MD-AB023',
    department: 'purify-1',
    revision: 0,
    tables,
    flowchartLayout: {},
    steps: [up1, up2, f1, j1],
    files: [],
  })
}

/* ======================= 2. 抗体亲和力筛选分析（MD-AB101） ======================= */

function buildAb101(): Analysis {
  const rand = rng(1101)
  const parents = [
    { name: 'Ab-X1', kd: 0.4, expr: 120 },
    { name: 'Ab-Y7', kd: 2.8, expr: 85 },
    { name: 'Ab-Z3', kd: 0.9, expr: 60 },
  ]
  const sprCols: ColumnMeta[] = [
    { field: 'variant', title: 'variant', dataType: 'string' },
    { field: 'parent', title: 'parent', dataType: 'string' },
    { field: 'kon_1e5', title: 'kon_1e5', dataType: 'number' },
    { field: 'koff_1e4', title: 'koff_1e4', dataType: 'number' },
    { field: 'kd_nm', title: 'kd_nm', dataType: 'number' },
    { field: 'expression_mg_l', title: 'expression_mg_l', dataType: 'number' },
  ]
  const sprRows: Row[] = []
  for (let i = 1; i <= 30; i += 1) {
    const p = parents[i % 3]
    const kon = Math.max(0.5, gauss(rand, 4 + (1 / p.kd), 1.5))
    const koff = Math.max(0.1, kon * p.kd * 10 + gauss(rand, 0, 2))
    sprRows.push({
      [ROW_ID_FIELD]: uuid(),
      variant: `${p.name}-v${i}`,
      parent: p.name,
      kon_1e5: round(kon),
      koff_1e4: round(koff, 1),
      kd_nm: round((koff / kon) * 0.1, 2),
      expression_mg_l: round(Math.max(10, gauss(rand, p.expr, 25)), 1),
    })
  }

  // 结合曲线：4 个代表性变体 × 8 浓度梯度
  const curveVariants = ['Ab-X1-v1', 'Ab-X1-v4', 'Ab-Y7-v2', 'Ab-Z3-v3']
  const curveCols: ColumnMeta[] = [
    { field: 'variant', title: 'variant', dataType: 'string' },
    { field: 'concentration_nm', title: 'concentration_nm', dataType: 'number' },
    { field: 'ru', title: 'ru', dataType: 'number' },
  ]
  const curveRows: Row[] = []
  curveVariants.forEach((v, vi) => {
    const ruMax = 120 - vi * 18
    for (let c = 0; c < 8; c += 1) {
      const conc = round(0.5 * 2 ** c, 1)
      const ru = (ruMax * conc) / (conc + 8 + vi * 4) + gauss(rand, 0, 2)
      curveRows.push({ [ROW_ID_FIELD]: uuid(), variant: v, concentration_nm: conc, ru: round(Math.max(0, ru), 1) })
    }
  })

  const hits = sprRows.filter((r) => Number(r.kd_nm) < 1)
  const hitCols: ColumnMeta[] = sprCols
  const evalCols: ColumnMeta[] = [...sprCols, { field: 'kd_pm', title: 'kd_pm', dataType: 'number' }]
  const evalRows: Row[] = hits.map((r) => ({
    ...r,
    [ROW_ID_FIELD]: uuid(),
    kd_pm: round(Number(r.kd_nm) * 1000, 0),
  }))

  const up1 = uploadStep('demo-s-ab101-up1', 'SPR kinetics', 'demo-t-ab101-spr')
  const up2 = uploadStep('demo-s-ab101-up2', 'Binding curves', 'demo-t-ab101-curves')
  const f1 = filterStep('demo-s-ab101-f1', '高亲和力候选', up1.id, [cond('kd_nm', 'lt', 1)], 'demo-t-ab101-hits')
  const c1 = computedStep('demo-s-ab101-c1', '候选评估表', f1.id, 'kd_pm', 'kd_nm * 1000', 'demo-t-ab101-eval')

  const tables = [
    mkTable('demo-t-ab101-spr', 'SPR kinetics', sprCols, sprRows, [
      makeView('scatter', 'kon vs koff', { x: { field: 'kon_1e5' }, values: [{ field: 'koff_1e4' }], color: { field: 'parent' } }, undefined, 'demo-v-ab101-scatter'),
    ], up1.id),
    mkTable('demo-t-ab101-curves', 'Binding curves', curveCols, curveRows, [
      makeView('line', '结合曲线', { x: { field: 'concentration_nm' }, values: [{ field: 'ru', aggregation: 'mean' }], series: { field: 'variant' } }, undefined, 'demo-v-ab101-line'),
    ], up2.id),
    mkTable('demo-t-ab101-hits', '高亲和力候选', hitCols, hits, [
      makeView('bar', '候选 KD 排名', { x: { field: 'variant' }, y: { field: 'kd_nm', aggregation: 'min' }, series: { field: 'parent' } }, undefined, 'demo-v-ab101-bar'),
      makeView('pie', '候选系列占比', { categories: { field: 'parent' } }, undefined, 'demo-v-ab101-pie'),
    ], f1.id),
    mkTable('demo-t-ab101-eval', '候选评估表', evalCols, evalRows, [], c1.id),
  ]

  const now = nowIso()
  return sealAnalysisRows({
    id: 'demo-md-ab101',
    name: '抗体亲和力筛选分析',
    createdAt: now,
    updatedAt: now,
    project: 'MD-AB101',
    department: 'ab-disc',
    revision: 0,
    tables,
    flowchartLayout: {},
    steps: [up1, up2, f1, c1],
    files: [],
  })
}

/* ======================= 3. 抗体细胞活性分析（MD-FL112） ======================= */

const PLATE_ROWS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']

function buildFl112(): Analysis {
  const rand = rng(11296)
  const plateCols: ColumnMeta[] = [
    { field: 'well', title: 'well', dataType: 'string' },
    { field: 'plate_row', title: 'plate_row', dataType: 'string' },
    { field: 'plate_col', title: 'plate_col', dataType: 'number' },
    { field: 'group', title: 'group', dataType: 'string' },
    { field: 'concentration', title: 'concentration', dataType: 'number' },
    { field: 'response', title: 'response', dataType: 'number' },
  ]
  const fourPL = (conc: number, min: number, max: number, ec50: number, hill: number): number =>
    min + (max - min) / (1 + (ec50 / conc) ** hill)
  const plateRows: Row[] = []
  for (const pr of PLATE_ROWS) {
    const ab = pr <= 'D' ? 'Ab-101' : 'Ab-205'
    const ec50 = ab === 'Ab-101' ? 0.08 : 0.3
    for (let pc = 1; pc <= 12; pc += 1) {
      const isControl = pc >= 11
      const concentration = isControl ? 0 : round(10 * (1 / 3) ** (pc - 1), 6)
      const base = isControl ? 4 : fourPL(concentration, 4, 96, ec50, 1.1)
      plateRows.push({
        [ROW_ID_FIELD]: uuid(),
        well: `${pr}${pc}`,
        plate_row: pr,
        plate_col: pc,
        group: isControl ? 'Basal control' : ab,
        concentration,
        response: round(gauss(rand, base, 2.5), 1),
      })
    }
  }

  const hitRows = plateRows.filter((r) => Number(r.response) >= 50)
  const normCols: ColumnMeta[] = [...plateCols, { field: 'response_norm', title: 'response_norm', dataType: 'number' }]
  const normRows: Row[] = hitRows.map((r) => ({
    ...r,
    [ROW_ID_FIELD]: uuid(),
    response_norm: round(Number(r.response) / 100, 3),
  }))

  const up1 = uploadStep('demo-s-fl112-up1', 'FLIPR 96WP033', 'demo-t-fl112-plate')
  const f1 = filterStep('demo-s-fl112-f1', '高响应孔', up1.id, [cond('response', 'gte', 50)], 'demo-t-fl112-hits')
  const c1 = computedStep('demo-s-fl112-c1', '响应评估表', f1.id, 'response_norm', 'response / 100', 'demo-t-fl112-norm')

  const tables = [
    mkTable('demo-t-fl112-plate', 'FLIPR 96WP033', plateCols, plateRows, [
      makeView('heatmap', '96WP033 plate map', { x: { field: 'plate_col' }, y: { field: 'plate_row' }, color: { field: 'response' } }, undefined, 'demo-v-fl112-heatmap'),
      makeView('box', '响应分布', { y: { field: 'response' }, x: { field: 'group' } }, undefined, 'demo-v-fl112-box'),
    ], up1.id),
    mkTable('demo-t-fl112-hits', '高响应孔', plateCols, hitRows, [
      makeView('scatter', 'Dose Response', { x: { field: 'concentration' }, values: [{ field: 'response' }], color: { field: 'group' } }, undefined, 'demo-v-fl112-scatter'),
      makeView('bar', '各行高响应孔数', { x: { field: 'plate_row' } }, undefined, 'demo-v-fl112-bar'),
    ], f1.id),
    mkTable('demo-t-fl112-norm', '响应评估表', normCols, normRows, [], c1.id),
  ]

  const now = nowIso()
  return sealAnalysisRows({
    id: 'demo-md-fl112',
    name: '抗体细胞活性分析',
    createdAt: now,
    updatedAt: now,
    project: 'MD-FL112',
    department: 'bio-ana',
    revision: 0,
    tables,
    flowchartLayout: {},
    steps: [up1, f1, c1],
    files: [],
  })
}

/* ======================= 4. 图表新特性演示（MD-AD007） ======================= */

/**
 * 新能力展示条目（对齐 Prism 差距补齐）：
 * - bar：100% 堆叠 + 数据标签
 * - scatter：Linear 拟合 + 拟合注释（方程/R²）+ 95% 置信带 + Y=50 参考线（残差图/AUC 在底栏 Tab 看）
 * - box：小提琴图形态
 */
function buildShowcase(): Analysis {
  const rand = rng(7001)

  // T1：步骤 × 试剂收率（100% 堆叠 + 数据标签）
  const t1Cols: ColumnMeta[] = [
    { field: 'step', title: 'step', dataType: 'string' },
    { field: 'reagent', title: 'reagent', dataType: 'string' },
    { field: 'yield', title: 'yield', dataType: 'number' },
  ]
  const t1Rows: Row[] = []
  for (const s of ['Capture', 'Wash', 'Elution', 'Polish']) {
    for (const rg of ['Buffer A', 'Buffer B']) {
      for (let b = 1; b <= 4; b += 1) {
        const base = (rg === 'Buffer A' ? 62 : 38) + gauss(rand, 0, 6)
        t1Rows.push({ [ROW_ID_FIELD]: uuid(), step: s, reagent: rg, yield: round(Math.max(2, base), 1) })
      }
    }
  }

  // T2：浓度-响应（Linear 拟合 + 拟合注释 + 置信带 + Y=50 参考线）
  const t2Cols: ColumnMeta[] = [
    { field: 'conc', title: 'conc', dataType: 'number' },
    { field: 'response', title: 'response', dataType: 'number' },
  ]
  const t2Rows: Row[] = []
  for (let i = 0; i < 30; i += 1) {
    const conc = round(0.5 + i * 0.5, 1)
    t2Rows.push({
      [ROW_ID_FIELD]: uuid(),
      conc,
      response: round(12 + 5.2 * conc + gauss(rand, 0, 8), 1),
    })
  }

  // T3：分组信号（小提琴图）
  const t3Cols: ColumnMeta[] = [
    { field: 'group', title: 'group', dataType: 'string' },
    { field: 'signal', title: 'signal', dataType: 'number' },
  ]
  const t3Rows: Row[] = []
  const t3Groups = [
    { name: 'Control', mean: 42, sd: 8 },
    { name: 'Low dose', mean: 58, sd: 10 },
    { name: 'High dose', mean: 76, sd: 12 },
  ]
  for (const g of t3Groups) {
    for (let i = 0; i < 16; i += 1) {
      t3Rows.push({ [ROW_ID_FIELD]: uuid(), group: g.name, signal: round(gauss(rand, g.mean, g.sd), 1) })
    }
  }

  const up1 = uploadStep('demo-s-feat-up1', 'Step × Reagent yields', 'demo-t-feat-t1')
  const up2 = uploadStep('demo-s-feat-up2', 'Concentration-response', 'demo-t-feat-t2')
  const up3 = uploadStep('demo-s-feat-up3', 'Signal by group', 'demo-t-feat-t3')

  const tables = [
    mkTable('demo-t-feat-t1', 'Step × Reagent yields', t1Cols, t1Rows, [
      makeView(
        'bar',
        '100% 堆叠 + 数据标签',
        { x: { field: 'step' }, y: { field: 'yield', aggregation: 'sum' }, series: { field: 'reagent' } },
        { bar: { mode: 'percent', showValues: true } },
        'demo-v-feat-bar',
      ),
    ], up1.id),
    mkTable('demo-t-feat-t2', 'Concentration-response', t2Cols, t2Rows, [
      makeView(
        'scatter',
        '拟合注释 + 置信带 + 参考线',
        {
          x: { field: 'conc' },
          values: [{ field: 'response' }],
          regression: { model: 'linear' },
        },
        {
          fitAnnotation: true,
          referenceLines: [{ axis: 'y', value: 50, label: '阈值 50' }],
        },
        'demo-v-feat-scatter',
      ),
    ], up2.id),
    mkTable('demo-t-feat-t3', 'Signal by group', t3Cols, t3Rows, [
      makeView('box', '小提琴图', { y: { field: 'signal' }, x: { field: 'group' } }, { box: { mode: 'violin', showPoints: 'all' } }, 'demo-v-feat-box'),
    ], up3.id),
  ]

  const now = nowIso()
  return sealAnalysisRows({
    id: 'demo-chart-features',
    name: '图表新特性演示',
    createdAt: now,
    updatedAt: now,
    project: 'MD-AD007',
    department: 'proc-dev',
    revision: 0,
    tables,
    flowchartLayout: {},
    steps: [up1, up2, up3],
    files: [],
  })
}

/* ------------------------------- 组装 ------------------------------- */

/** 旧版 5 项演示数据的 id（生成 3 项新版时清理）。 */
export const LEGACY_DEMO_IDS = ['demo-md-ad007', 'demo-md-bp310']

/** 生成 4 个演示分析（3 个抗体业务 + 1 个图表新特性演示；id 固定，重复调用覆盖）。 */
export function createProjectDemoAnalyses(): Analysis[] {
  return [buildAb023(), buildAb101(), buildFl112(), buildShowcase()]
}
