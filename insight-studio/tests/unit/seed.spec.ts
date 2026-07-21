import { describe, expect, it } from 'vitest'
import { buildIrisTable, buildPlateTable, buildWeightLengthTable, createDemoAnalysis } from '../../src/shared/seed'
import { ROW_ID_FIELD } from '../../src/shared/types'

describe('seed · Demo 数据形状', () => {
  it('createDemoAnalysis：3 张表 + 基本元信息', () => {
    const a = createDemoAnalysis()
    expect(a.id).toBeTruthy()
    expect(a.name).toBeTruthy()
    expect(a.createdAt).toBeTruthy()
    expect(a.tables).toHaveLength(3)
    expect(a.flowchartLayout).toEqual({})
  })

  it('iris：150 行，5 列，三个 species 各 50 行', () => {
    const t = buildIrisTable()
    expect(t.rows).toHaveLength(150)
    expect(t.columns.map((c) => c.field)).toEqual([
      'sepal_length',
      'sepal_width',
      'petal_length',
      'petal_width',
      'species',
    ])
    const counts = new Map<string, number>()
    for (const r of t.rows) counts.set(String(r.species), (counts.get(String(r.species)) ?? 0) + 1)
    expect(counts.get('setosa')).toBe(50)
    expect(counts.get('versicolor')).toBe(50)
    expect(counts.get('virginica')).toBe(50)
    for (const r of t.rows) {
      expect(typeof r.sepal_length).toBe('number')
      expect(typeof r[ROW_ID_FIELD]).toBe('string')
    }
  })

  it('plate96：96 个孔位，含浓度/响应/分组/行列坐标', () => {
    const t = buildPlateTable()
    expect(t.rows).toHaveLength(96)
    expect(t.columns.map((c) => c.field)).toEqual([
      'well',
      'plate_row',
      'plate_col',
      'group',
      'concentration',
      'response',
    ])
    const wells = new Set(t.rows.map((r) => r.well))
    expect(wells.size).toBe(96)
    const controls = t.rows.filter((r) => r.group === 'DMSO control')
    expect(controls).toHaveLength(16) // 8 行 × 2 列
    for (const c of controls) expect(c.concentration).toBe(0)
    // 行列坐标合法
    for (const r of t.rows) {
      expect('ABCDEFGH').toContain(String(r.plate_row))
      expect(Number(r.plate_col)).toBeGreaterThanOrEqual(1)
      expect(Number(r.plate_col)).toBeLessThanOrEqual(12)
      expect(typeof r.response).toBe('number')
    }
  })

  it('weight-length：400 行回归数据，两组', () => {
    const t = buildWeightLengthTable()
    expect(t.rows).toHaveLength(400)
    expect(t.columns.map((c) => c.field)).toEqual(['subject_id', 'group', 'weight_kg', 'length_cm'])
    const groups = new Set(t.rows.map((r) => r.group))
    expect(groups).toEqual(new Set(['Group A', 'Group B']))
    // 粗校验线性关系：length 随 weight 正相关
    const xs = t.rows.map((r) => Number(r.weight_kg))
    const ys = t.rows.map((r) => Number(r.length_cm))
    const mx = xs.reduce((a, b) => a + b, 0) / xs.length
    const my = ys.reduce((a, b) => a + b, 0) / ys.length
    let num = 0
    let den = 0
    for (let i = 0; i < xs.length; i += 1) {
      num += (xs[i] - mx) * (ys[i] - my)
      den += (xs[i] - mx) ** 2
    }
    expect(num / den).toBeGreaterThan(0.5)
  })

  it('确定性：同一生成器两次输出数值一致（id 除外）', () => {
    const a = buildIrisTable()
    const b = buildIrisTable()
    expect(a.rows[0].sepal_length).toBe(b.rows[0].sepal_length)
    expect(a.rows[149].species).toBe(b.rows[149].species)
  })
})
