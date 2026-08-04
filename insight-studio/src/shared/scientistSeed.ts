/**
 * 科学家场景演示数据：抗体发现 → 细胞构建 → 体外效价 → 体内药效。
 * 确定性伪随机，便于复现验收。
 */
import type { Analysis, AnalysisTable, ColumnMeta, Row } from './types'
import { ROW_ID_FIELD } from './types'
import { uuid } from './id'
import { nowIso } from './datetime'
import { sealAnalysisRows } from './factories'
import { gauss, rng, round2 } from './seed'

const round = round2

const CLONES = [
  { id: 'mAb-A01', isotype: 'IgG1', campaign: 'Campaign-Alpha' },
  { id: 'mAb-A07', isotype: 'IgG1', campaign: 'Campaign-Alpha' },
  { id: 'mAb-B03', isotype: 'IgG4', campaign: 'Campaign-Beta' },
  { id: 'mAb-B12', isotype: 'IgG1', campaign: 'Campaign-Beta' },
  { id: 'mAb-C05', isotype: 'IgG1', campaign: 'Campaign-Gamma' },
  { id: 'mAb-C09', isotype: 'IgG4', campaign: 'Campaign-Gamma' },
  { id: 'mAb-D02', isotype: 'IgG1', campaign: 'Campaign-Delta' },
  { id: 'mAb-D11', isotype: 'IgG1', campaign: 'Campaign-Delta' },
]

/** ELISA 初筛。 */
export function buildElisaScreenTable(): AnalysisTable {
  const rand = rng(10101)
  const columns: ColumnMeta[] = [
    { field: 'clone_id', title: 'clone_id', dataType: 'string' },
    { field: 'campaign', title: 'campaign', dataType: 'string' },
    { field: 'isotype', title: 'isotype', dataType: 'string' },
    { field: 'od450', title: 'od450', dataType: 'number' },
    { field: 'control', title: 'control', dataType: 'string' },
  ]
  const rows: Row[] = []
  for (const c of CLONES) {
    const base = 0.35 + rand() * 1.8
    rows.push({
      [ROW_ID_FIELD]: uuid(),
      clone_id: c.id,
      campaign: c.campaign,
      isotype: c.isotype,
      od450: round(Math.max(0.05, gauss(rand, base, 0.08)), 3),
      control: 'sample',
    })
  }
  rows.push(
    {
      [ROW_ID_FIELD]: uuid(),
      clone_id: 'NEG',
      campaign: 'control',
      isotype: 'n/a',
      od450: round(gauss(rand, 0.08, 0.02), 3),
      control: 'negative',
    },
    {
      [ROW_ID_FIELD]: uuid(),
      clone_id: 'BLANK',
      campaign: 'control',
      isotype: 'n/a',
      od450: round(gauss(rand, 0.04, 0.01), 3),
      control: 'blank',
    },
  )
  return { id: uuid(), name: 'ELISA binding screen', source: 'demo', columns, rows, filters: [], views: [] }
}

/** SPR 动力学。 */
export function buildSprKineticsTable(): AnalysisTable {
  const rand = rng(20202)
  const columns: ColumnMeta[] = [
    { field: 'clone_id', title: 'clone_id', dataType: 'string' },
    { field: 'ka', title: 'ka', dataType: 'number' },
    { field: 'kd', title: 'kd', dataType: 'number' },
    { field: 'KD_nM', title: 'KD_nM', dataType: 'number' },
    { field: 'Rmax', title: 'Rmax', dataType: 'number' },
    { field: 'chi2', title: 'chi2', dataType: 'number' },
  ]
  const kdTargets = [0.4, 1.2, 3.5, 0.8, 12, 2.1, 0.55, 6.0]
  const rows: Row[] = CLONES.map((c, i) => {
    const KD_nM = round(Math.max(0.1, gauss(rand, kdTargets[i], kdTargets[i] * 0.08)), 2)
    const ka = round(gauss(rand, 2.5e5, 4e4), 0)
    const kd = round((KD_nM * 1e-9) * ka, 6)
    return {
      [ROW_ID_FIELD]: uuid(),
      clone_id: c.id,
      ka,
      kd,
      KD_nM,
      Rmax: round(gauss(rand, 80, 12), 1),
      chi2: round(Math.max(0.1, gauss(rand, 1.2, 0.4)), 2),
    }
  })
  return { id: uuid(), name: 'SPR kinetics', source: 'demo', columns, rows, filters: [], views: [] }
}

/** 细胞株 fed-batch 滴度。 */
export function buildCellTiterTable(): AnalysisTable {
  const rand = rng(30303)
  const columns: ColumnMeta[] = [
    { field: 'clone_id', title: 'clone_id', dataType: 'string' },
    { field: 'pool', title: 'pool', dataType: 'string' },
    { field: 'day', title: 'day', dataType: 'number' },
    { field: 'titer_mg_L', title: 'titer_mg_L', dataType: 'number' },
    { field: 'viability_pct', title: 'viability_pct', dataType: 'number' },
    { field: 'VCD_e6', title: 'VCD_e6', dataType: 'number' },
  ]
  const top = CLONES.slice(0, 5)
  const rows: Row[] = []
  for (const c of top) {
    const peak = 800 + rand() * 2200
    for (const day of [0, 3, 7, 10, 14]) {
      const frac = day / 14
      rows.push({
        [ROW_ID_FIELD]: uuid(),
        clone_id: c.id,
        pool: c.campaign,
        day,
        titer_mg_L: round(peak * (0.05 + 0.95 * frac ** 1.1) + gauss(rand, 0, 40), 0),
        viability_pct: round(Math.min(99, Math.max(55, 96 - day * (1.2 + rand()) + gauss(rand, 0, 1.5))), 1),
        VCD_e6: round(Math.max(0.2, 0.4 + day * 0.55 + gauss(rand, 0, 0.2)), 2),
      })
    }
  }
  return { id: uuid(), name: 'CHO fed-batch titer', source: 'demo', columns, rows, filters: [], views: [] }
}

/** 体外 ADCC / 杀伤剂量反应（非孔板全图，便于 4PL）。 */
export function buildAdccDoseTable(): AnalysisTable {
  const rand = rng(40404)
  const columns: ColumnMeta[] = [
    { field: 'sample', title: 'sample', dataType: 'string' },
    { field: 'concentration', title: 'concentration', dataType: 'number' },
    { field: 'response', title: 'response', dataType: 'number' },
  ]
  const fourPL = (conc: number, min: number, max: number, ec50: number, hill: number) =>
    min + (max - min) / (1 + (ec50 / Math.max(conc, 1e-12)) ** hill)

  const samples = [
    { name: 'mAb-A01', ec50: 0.08 },
    { name: 'mAb-B03', ec50: 0.35 },
    { name: 'Isotype control', ec50: 8 },
  ]
  const concs = [10, 3.333, 1.111, 0.37, 0.123, 0.041, 0.0137, 0.0046]
  const rows: Row[] = []
  for (const s of samples) {
    for (const concentration of concs) {
      const base = fourPL(concentration, 5, 95, s.ec50, 1.3)
      rows.push({
        [ROW_ID_FIELD]: uuid(),
        sample: s.name,
        concentration: round(concentration, 4),
        response: round(gauss(rand, base, 3.5), 1),
      })
    }
  }
  return { id: uuid(), name: 'ADCC dose-response', source: 'demo', columns, rows, filters: [], views: [] }
}

/** 体内 PDX 瘤体积 + 体重（长表）。 */
export function buildInVivoTable(): AnalysisTable {
  const rand = rng(50505)
  const columns: ColumnMeta[] = [
    { field: 'animal_id', title: 'animal_id', dataType: 'string' },
    { field: 'group', title: 'group', dataType: 'string' },
    { field: 'day', title: 'day', dataType: 'number' },
    { field: 'tumor_mm3', title: 'tumor_mm3', dataType: 'number' },
    { field: 'body_weight_g', title: 'body_weight_g', dataType: 'number' },
  ]
  const groups = [
    { name: 'Vehicle', growth: 1.18, start: 120 },
    { name: 'mAb-A01 10mpk', growth: 1.05, start: 118 },
    { name: 'mAb-B03 10mpk', growth: 1.1, start: 122 },
  ]
  const days = [0, 3, 7, 10, 14, 17, 21]
  const rows: Row[] = []
  let animal = 1
  for (const g of groups) {
    for (let n = 0; n < 6; n += 1) {
      const id = `M${String(animal).padStart(2, '0')}`
      animal += 1
      let tumor = g.start * (0.85 + rand() * 0.3)
      const bw0 = gauss(rand, 22, 1.2)
      for (const day of days) {
        if (day > 0) tumor *= g.growth * (0.97 + rand() * 0.06)
        const bw = bw0 * (1 - (g.name === 'Vehicle' ? 0 : 0.002) * day) + gauss(rand, 0, 0.25)
        rows.push({
          [ROW_ID_FIELD]: uuid(),
          animal_id: id,
          group: g.name,
          day,
          tumor_mm3: round(Math.max(20, tumor + gauss(rand, 0, 8)), 0),
          body_weight_g: round(Math.max(16, bw), 1),
        })
      }
    }
  }
  return { id: uuid(), name: 'PDX tumor & body weight', source: 'demo', columns, rows, filters: [], views: [] }
}

/** 完整科学家场景 Analysis。 */
export function createScientistAnalysis(): Analysis {
  const now = nowIso()
  return sealAnalysisRows({
    id: uuid(),
    name: 'Antibody discovery campaign',
    createdAt: now,
    updatedAt: now,
    project: 'AB-DSC-01',
    department: 'bio-ana',
    revision: 0,
    tables: [
      buildElisaScreenTable(),
      buildSprKineticsTable(),
      buildCellTiterTable(),
      buildAdccDoseTable(),
      buildInVivoTable(),
    ],
    flowchartLayout: {},
    steps: [],
    files: [],
  })
}
