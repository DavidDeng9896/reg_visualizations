import { describe, expect, it } from 'vitest'
import { createChartConfig } from '../../../src/shared/factories'
import type { ColumnMeta, Row, RowFlag } from '../../../src/shared/types'
import { ROW_ID_FIELD } from '../../../src/shared/types'
import { buildLineOption } from '../../../src/modules/charts/runtime/line'
import { buildScatterOption } from '../../../src/modules/charts/runtime/scatter'
import { vr } from './helpers'
import type { BuildOutput, ChartOption } from '../../../src/modules/charts/types'

const numCols: ColumnMeta[] = [
  { field: 'n', title: 'n', dataType: 'number' },
  { field: 'val', title: 'val', dataType: 'number' },
  { field: 'grp', title: 'grp', dataType: 'string' },
]

function nrow(id: string, n: number, val: number, grp = 'g1'): Row {
  return { [ROW_ID_FIELD]: id, n, val, grp }
}

function scatterCfg() {
  const c = createChartConfig('scatter')
  c.configure.x = { field: 'n' }
  c.configure.values = [{ field: 'val' }]
  return c
}

function lineCfg() {
  const c = createChartConfig('line')
  c.configure.x = { field: 'n' }
  c.configure.values = [{ field: 'val' }]
  return c
}

const fitLines = (out: BuildOutput): ChartOption[] =>
  (out.option.series as ChartOption[]).filter((s) => s.type === 'line' && typeof s.name === 'string' && s.name.endsWith(' · fit'))

describe('scatter 拟合叠加（6B）', () => {
  it('Linear：叠加一条虚线拟合 series + fits 摘要', () => {
    const rows = [1, 2, 3, 4, 5].map((x, i) => nrow(`r${i}`, x, 2 * x + 1))
    const c = scatterCfg()
    c.configure.regression = { model: 'linear' }
    const out = buildScatterOption({ result: vr(rows, numCols), config: c })
    const fits = fitLines(out)
    expect(fits).toHaveLength(1)
    expect(fits[0].lineStyle.type).toBe('dashed')
    expect(fits[0].symbol).toBe('none')
    expect(fits[0].data.length).toBe(120)
    expect(out.fits).toHaveLength(1)
    expect(out.fits![0].model).toBe('linear')
    expect(out.fits![0].variables.map((v) => v.name)).toContain('Slope')
  })

  it('Color 分组 → 每组分别拟合', () => {
    const rows = [
      ...[1, 2, 3, 4].map((x, i) => nrow(`a${i}`, x, 2 * x, 'g1')),
      ...[1, 2, 3, 4].map((x, i) => nrow(`b${i}`, x, -x + 10, 'g2')),
    ]
    const c = scatterCfg()
    c.configure.color = { field: 'grp' }
    c.configure.regression = { model: 'linear' }
    const out = buildScatterOption({ result: vr(rows, numCols), config: c })
    expect(fitLines(out)).toHaveLength(2)
    expect(out.fits).toHaveLength(2)
    expect(out.fits![0].group).not.toBe('')
    // 拟合线不进图例
    expect(out.option.legend.data).toHaveLength(2)
  })

  it('点数不足 → 不画线 + 黄色警告', () => {
    const rows = [nrow('r1', 1, 2)]
    const c = scatterCfg()
    c.configure.regression = { model: 'linear' }
    const out = buildScatterOption({ result: vr(rows, numCols), config: c })
    expect(fitLines(out)).toHaveLength(0)
    expect(out.warnings.some((w: string) => w.includes('至少需要'))).toBe(true)
  })

  it('Exclude flagged：开启后打标点不参与拟合（6F-1）', () => {
    const rows = [1, 2, 3, 4].map((x, i) => nrow(`r${i}`, x, 2 * x))
    rows.push(nrow('out', 10, 100)) // 离群
    const flags: RowFlag[] = [{ rowId: 'out', comment: 'bad' }]
    const c = scatterCfg()
    c.configure.regression = { model: 'linear', excludeFlagged: true }
    const out = buildScatterOption({ result: vr(rows, numCols), config: c, flags })
    expect(fitLines(out)).toHaveLength(1)
    const slopeRow = out.fits![0].variables.find((v) => v.name === 'Slope')
    expect(slopeRow!.estimate).toBeCloseTo(2, 6)
    expect(out.fits![0].usedPoints).toBe(4)
    // MODEL OUTPUT 仍包含全部点（含 flagged）
    expect(out.fits![0].output).toHaveLength(5)
    expect(out.fits![0].output.filter((r) => r.flagged)).toHaveLength(1)
  })

  it('打标点渲染为 × 叠加层，数据系列带 __rowIds', () => {
    const rows = [1, 2, 3].map((x, i) => nrow(`r${i}`, x, x * 2))
    const flags: RowFlag[] = [{ rowId: 'r1', comment: 'bad' }]
    const c = scatterCfg()
    const out = buildScatterOption({ result: vr(rows, numCols), config: c, flags })
    const flagSeries = out.option.series.find((s: { name?: string }) => s.name === 'Flagged')
    expect(flagSeries).toBeTruthy()
    expect(flagSeries.symbol).toBe('x')
    expect(flagSeries.data).toHaveLength(1)
    const dataSeries = out.option.series[0]
    expect(dataSeries.__rowIds).toEqual([['r0'], ['r1'], ['r2']])
  })

  it('4PL + showAsymptotes → markLine 渐近线', () => {
    const xs = [0.1, 0.5, 1, 2, 3, 5, 8, 10, 20, 50]
    const rows = xs.map((x, i) => nrow(`r${i}`, x, 100 / (1 + Math.exp(-1.5 * (Math.log(x) - Math.log(5))))))
    const c = scatterCfg()
    c.configure.regression = { model: '4pl', showAsymptotes: true }
    const out = buildScatterOption({ result: vr(rows, numCols), config: c })
    const fits = fitLines(out)
    expect(fits).toHaveLength(1)
    expect(fits[0].markLine).toBeTruthy()
    expect(fits[0].markLine.data).toHaveLength(2)
    expect(out.fits![0].variables.map((v) => v.name)).toEqual(['Min', 'Max', 'Hill Slope', 'Inflection Point', 'R²'])
  })

  it('Point-to-Point：实线连接 + 无回归参数', () => {
    const rows = [nrow('r2', 3, 30), nrow('r0', 1, 10), nrow('r1', 2, 20)]
    const c = scatterCfg()
    c.configure.regression = { model: 'point-to-point' }
    const out = buildScatterOption({ result: vr(rows, numCols), config: c })
    const fits = fitLines(out)
    expect(fits).toHaveLength(1)
    expect(fits[0].lineStyle.type).toBe('solid')
    expect(fits[0].data.map((d: number[]) => d[0])).toEqual([1, 2, 3])
    expect(out.fits![0].variables).toHaveLength(0)
  })
})

describe('line 拟合叠加（6B）', () => {
  it('数值 X + Linear → 拟合 series', () => {
    const rows = [1, 2, 3, 4, 5].map((x, i) => nrow(`r${i}`, x, 3 * x))
    const c = lineCfg()
    c.configure.regression = { model: 'linear' }
    const out = buildLineOption({ result: vr(rows, numCols), config: c })
    expect(fitLines(out)).toHaveLength(1)
    expect(out.fits).toHaveLength(1)
  })

  it('分类 X + 拟合模型 → 警告且不画线', () => {
    const cols: ColumnMeta[] = [
      { field: 'cat', title: 'cat', dataType: 'string' },
      { field: 'val', title: 'val', dataType: 'number' },
    ]
    const rows = [
      { [ROW_ID_FIELD]: 'r1', cat: 'a', val: 1 },
      { [ROW_ID_FIELD]: 'r2', cat: 'b', val: 2 },
      { [ROW_ID_FIELD]: 'r3', cat: 'c', val: 3 },
    ]
    const c = lineCfg()
    c.configure.x = { field: 'cat' }
    c.configure.regression = { model: 'linear' }
    const out = buildLineOption({ result: vr(rows, cols), config: c })
    expect(fitLines(out)).toHaveLength(0)
    expect(out.warnings.some((w: string) => w.includes('拟合需要数值或时间 X 轴'))).toBe(true)
  })

  it('Series 分组 → 每组分别拟合 + 打标 × 叠加 + __rowIds', () => {
    const rows = [
      ...[1, 2, 3].map((x, i) => nrow(`a${i}`, x, x, 'g1')),
      ...[1, 2, 3].map((x, i) => nrow(`b${i}`, x, 2 * x, 'g2')),
    ]
    const flags: RowFlag[] = [{ rowId: 'a1', comment: 'bad' }]
    const c = lineCfg()
    c.configure.series = { field: 'grp' }
    c.configure.regression = { model: 'linear' }
    const out = buildLineOption({ result: vr(rows, numCols), config: c, flags })
    expect(fitLines(out)).toHaveLength(2)
    expect(out.fits).toHaveLength(2)
    const flagSeries = out.option.series.find((s: { name?: string }) => s.name === 'Flagged')
    expect(flagSeries).toBeTruthy()
    expect(flagSeries.__rowIds).toEqual([['a1']])
    const g1 = out.option.series[0]
    expect(g1.__rowIds).toEqual([['a0'], ['a1'], ['a2']])
    // 拟合线/Flagged 不进图例
    expect(out.option.legend.data).toEqual(['g1', 'g2'])
  })

  it('无拟合（none）→ 无 fit series、无 fits', () => {
    const rows = [1, 2, 3].map((x, i) => nrow(`r${i}`, x, x))
    const c = lineCfg()
    const out = buildLineOption({ result: vr(rows, numCols), config: c })
    expect(fitLines(out)).toHaveLength(0)
    expect(out.fits).toBeUndefined()
  })
})
