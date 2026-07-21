import type { Analysis, AnalysisTable, ColumnMeta, Row } from './types'
import { ROW_ID_FIELD } from './types'
import { uuid } from './id'
import { nowIso } from './datetime'

/**
 * 内置 Demo Analysis 生成器（"一键 Demo"）。
 * 三张表：iris（150 行）、96 孔板 dose-response（96 行，适合 4PL 与 heatmap）、
 * weight-length 回归数据（400 行）。数据用确定性伪随机生成，便于测试与复现。
 */

/** mulberry32 确定性伪随机数。 */
function rng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Box-Muller 正态。 */
function gauss(rand: () => number, mean: number, sd: number): number {
  const u = Math.max(rand(), 1e-12)
  const v = rand()
  return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

const round = (v: number, digits = 2): number => Number(v.toFixed(digits))

/* --------------------------------- iris --------------------------------- */

interface IrisSpec {
  species: string
  sepalLength: [number, number]
  sepalWidth: [number, number]
  petalLength: [number, number]
  petalWidth: [number, number]
}

const IRIS_SPECIES: IrisSpec[] = [
  { species: 'setosa', sepalLength: [5.0, 0.35], sepalWidth: [3.4, 0.38], petalLength: [1.5, 0.17], petalWidth: [0.25, 0.1] },
  { species: 'versicolor', sepalLength: [5.9, 0.52], sepalWidth: [2.8, 0.31], petalLength: [4.3, 0.47], petalWidth: [1.3, 0.2] },
  { species: 'virginica', sepalLength: [6.6, 0.64], sepalWidth: [3.0, 0.32], petalLength: [5.6, 0.55], petalWidth: [2.0, 0.27] },
]

export function buildIrisTable(): AnalysisTable {
  const rand = rng(20260716)
  const columns: ColumnMeta[] = [
    { field: 'sepal_length', title: 'sepal_length', dataType: 'number' },
    { field: 'sepal_width', title: 'sepal_width', dataType: 'number' },
    { field: 'petal_length', title: 'petal_length', dataType: 'number' },
    { field: 'petal_width', title: 'petal_width', dataType: 'number' },
    { field: 'species', title: 'species', dataType: 'string' },
  ]
  const rows: Row[] = []
  for (const spec of IRIS_SPECIES) {
    for (let i = 0; i < 50; i += 1) {
      rows.push({
        [ROW_ID_FIELD]: uuid(),
        sepal_length: round(gauss(rand, ...spec.sepalLength)),
        sepal_width: round(gauss(rand, ...spec.sepalWidth)),
        petal_length: round(gauss(rand, ...spec.petalLength)),
        petal_width: round(gauss(rand, ...spec.petalWidth)),
        species: spec.species,
      })
    }
  }
  return { id: uuid(), name: 'Iris measurements', source: 'demo', columns, rows, filters: [], views: [] }
}

/* ------------------------------ 96 孔板 ------------------------------ */

const PLATE_ROWS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']
const PLATE_COLS = Array.from({ length: 12 }, (_, i) => i + 1)

/**
 * 布局：行 A–D = Compound A，E–H = Compound B；列 1–10 为 10 µM 起 1:3 梯度稀释，
 * 列 11–12 为 DMSO 对照（浓度 0）。响应 = 4PL(min=5, max=100, IC50, hill=1.2) + 噪声。
 */
export function buildPlateTable(): AnalysisTable {
  const rand = rng(96)
  const columns: ColumnMeta[] = [
    { field: 'well', title: 'well', dataType: 'string' },
    { field: 'plate_row', title: 'plate_row', dataType: 'string' },
    { field: 'plate_col', title: 'plate_col', dataType: 'number' },
    { field: 'group', title: 'group', dataType: 'string' },
    { field: 'concentration', title: 'concentration', dataType: 'number' },
    { field: 'response', title: 'response', dataType: 'number' },
  ]
  const fourPL = (conc: number, min: number, max: number, ic50: number, hill: number): number =>
    min + (max - min) / (1 + (conc / ic50) ** hill)

  const rows: Row[] = []
  for (const pr of PLATE_ROWS) {
    const compound = pr <= 'D' ? 'Compound A' : 'Compound B'
    const ic50 = compound === 'Compound A' ? 0.12 : 0.5
    for (const pc of PLATE_COLS) {
      const isControl = pc >= 11
      const concentration = isControl ? 0 : round(10 * (1 / 3) ** (pc - 1), 6)
      const base = isControl ? 100 : fourPL(concentration, 5, 100, ic50, 1.2)
      rows.push({
        [ROW_ID_FIELD]: uuid(),
        well: `${pr}${pc}`,
        plate_row: pr,
        plate_col: pc,
        group: isControl ? 'DMSO control' : compound,
        concentration,
        response: round(gauss(rand, base, 3), 1),
      })
    }
  }
  return { id: uuid(), name: 'Plate 96 dose-response', source: 'demo', columns, rows, filters: [], views: [] }
}

/* ---------------------------- weight-length ---------------------------- */

export function buildWeightLengthTable(): AnalysisTable {
  const rand = rng(400)
  const columns: ColumnMeta[] = [
    { field: 'subject_id', title: 'subject_id', dataType: 'string' },
    { field: 'group', title: 'group', dataType: 'string' },
    { field: 'weight_kg', title: 'weight_kg', dataType: 'number' },
    { field: 'length_cm', title: 'length_cm', dataType: 'number' },
  ]
  // 两组不同斜率的线性关系 + 噪声：length = a + b * weight
  const groups = [
    { name: 'Group A', a: 30, b: 2.1, wMean: 55, wSd: 12, noise: 4 },
    { name: 'Group B', a: 45, b: 1.4, wMean: 70, wSd: 15, noise: 5 },
  ]
  const rows: Row[] = []
  for (let i = 0; i < 400; i += 1) {
    const g = groups[i % 2]
    const weight = Math.max(5, gauss(rand, g.wMean, g.wSd))
    const length = g.a + g.b * weight + gauss(rand, 0, g.noise)
    rows.push({
      [ROW_ID_FIELD]: uuid(),
      subject_id: `S-${String(i + 1).padStart(3, '0')}`,
      group: g.name,
      weight_kg: round(weight, 1),
      length_cm: round(length, 1),
    })
  }
  return { id: uuid(), name: 'Weight-length study', source: 'demo', columns, rows, filters: [], views: [] }
}

/** 生成完整 Demo Analysis。 */
export function createDemoAnalysis(): Analysis {
  const now = nowIso()
  return {
    id: uuid(),
    name: 'Demo analysis',
    createdAt: now,
    updatedAt: now,
    tables: [buildIrisTable(), buildPlateTable(), buildWeightLengthTable()],
    flowchartLayout: {},
  }
}
