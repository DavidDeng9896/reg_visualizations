import { expect, it } from 'vitest'
import { createChartConfig } from '../../../src/shared/factories'
import { buildChartOption } from '../../../src/modules/charts/registry'
import type { ColumnMeta, Row } from '../../../src/shared/types'
import { ROW_ID_FIELD } from '../../../src/shared/types'
import { vr } from './helpers'

it('冒烟：plate dose-response（含 0 浓度）+ 4PL + excludeFlagged', () => {
  const cols: ColumnMeta[] = [
    { field: 'concentration', title: 'concentration', dataType: 'number' },
    { field: 'response', title: 'response', dataType: 'number' },
    { field: 'sample', title: 'sample', dataType: 'string' },
  ]
  const rows: Row[] = []
  const fourPL = (x: number, min: number, max: number, ic50: number, hill: number) =>
    min + (max - min) / (1 + (x / ic50) ** -hill)
  let id = 0
  for (let pc = 1; pc <= 12; pc += 1) {
    for (let pr = 0; pr < 8; pr += 1) {
      const isControl = pc === 12
      const concentration = isControl ? 0 : 10 * (1 / 3) ** (pc - 1)
      const sample = pr < 4 ? 'Drug A' : 'Drug B'
      const base = isControl ? 100 : fourPL(concentration, 5, 100, sample === 'Drug A' ? 0.5 : 1.5, 1.2)
      rows.push({ [ROW_ID_FIELD]: `r${id++}`, concentration, response: base + Math.sin(id * 7.7) * 1.5, sample })
    }
  }
  const c = createChartConfig('scatter')
  c.configure.x = { field: 'concentration' }
  c.configure.values = [{ field: 'response' }]
  c.configure.color = { field: 'sample' }
  c.configure.regression = { model: '4pl', excludeFlagged: true, showAsymptotes: true }
  const flags = [{ rowId: 'r3', comment: 'bubble' }]
  const out = buildChartOption(vr(rows, cols), c, 'Standard Curve', flags)
  const fits = out.option.series.filter((s: { type: string }) => s.type === 'line')
  expect(fits).toHaveLength(2) // 每组一条拟合线
  expect(out.fits).toHaveLength(2)
  // 0 浓度被过滤并警告
  expect(out.warnings.some((w) => w.includes('非正 X'))).toBe(true)
  // IC50 恢复合理（Drug A ≈ 0.5，Drug B ≈ 1.5）
  const drugA = out.fits!.find((f) => f.group.includes('Drug A'))!
  const infl = drugA.variables.find((v) => v.name === 'Inflection Point')!.estimate!
  expect(Math.abs(infl - 0.5) / 0.5).toBeLessThan(0.3)
  expect(drugA.r2!).toBeGreaterThan(0.9)
  // 渐近线 markLine
  expect(fits[0].markLine).toBeTruthy()
  // 打标 × 系列存在
  expect(out.option.series.some((s: { name?: string }) => s.name === 'Flagged')).toBe(true)
  // MODEL OUTPUT 行数 = 行数
  expect(drugA.output.length).toBe(48)
})
