import { describe, expect, it } from 'vitest'
import { createChartConfig } from '../../../src/shared/factories'
import type { ColumnMeta, RowFlag } from '../../../src/shared/types'
import { ROW_ID_FIELD } from '../../../src/shared/types'
import { buildLineOption } from '../../../src/modules/charts/runtime/line'
import { buildScatterOption } from '../../../src/modules/charts/runtime/scatter'
import { vr } from './helpers'

const columns: ColumnMeta[] = [
  { field: 'n', title: 'n', dataType: 'number' },
  { field: 'val', title: 'val', dataType: 'number' },
]
const rows = [1, 2, 3, 4, 5].map((n, i) => ({ [ROW_ID_FIELD]: `r${i}`, n, val: 2 * n + 1 }))
const config = (type: 'line' | 'scatter') => {
  const c = createChartConfig(type)
  c.configure.x = { field: 'n' }
  c.configure.values = [{ field: 'val' }]
  c.configure.regression = { model: 'linear' }
  return c
}
const fitTrace = (data: Array<Record<string, unknown>>) => data.find((trace) => String(trace.name).endsWith(' · fit'))

describe('Plotly fit overlays', () => {
  it('scatter 拟合默认实线（fitLineStyle 缺省 solid）', () => {
    const out = buildScatterOption({ result: vr(rows, columns), config: config('scatter') })
    const fit = fitTrace(out.option.data)!
    expect(fit).toMatchObject({ type: 'scatter', mode: 'lines', showlegend: false })
    expect((fit.line as { dash: string }).dash).toBe('solid')
    expect(out.fits).toHaveLength(1)
  })

  it('fitLineStyle = dash 时拟合为虚线（line 与 scatter 一致）', () => {
    const sc = config('scatter')
    sc.style.fitLineStyle = 'dash'
    const fitScatter = fitTrace(buildScatterOption({ result: vr(rows, columns), config: sc }).option.data)!
    expect((fitScatter.line as { dash: string }).dash).toBe('dash')

    const lc = config('line')
    lc.style.fitLineStyle = 'dash'
    const fitLine = fitTrace(buildLineOption({ result: vr(rows, columns), config: lc }).option.data)!
    expect((fitLine.line as { dash: string }).dash).toBe('dash')
  })

  it('line 拟合保留 fit engine 摘要', () => {
    const out = buildLineOption({ result: vr(rows, columns), config: config('line') })
    expect(fitTrace(out.option.data)).toBeTruthy()
    expect(out.fits?.[0].model).toBe('linear')
  })

  it('flagged 点为红色 x 且 customdata 含 rowId', () => {
    const flags: RowFlag[] = [{ rowId: 'r1', comment: 'bad' }]
    const out = buildScatterOption({ result: vr(rows, columns), config: config('scatter'), flags })
    const flagged = out.option.data.find((trace) => trace.name === 'Flagged')!
    expect(flagged.customdata).toEqual([['r1']])
    expect(flagged.marker).toMatchObject({ symbol: 'x', color: '#d92d20' })
  })

  it('4PL 渐近线进入 layout.shapes', () => {
    const c = config('scatter')
    c.configure.regression = { model: '4pl', showAsymptotes: true }
    const xs = [0.1, 0.5, 1, 2, 3, 5, 8, 10, 20, 50]
    const logistic = xs.map((n, i) => ({ [ROW_ID_FIELD]: `r${i}`, n, val: 100 / (1 + Math.exp(-1.5 * (Math.log(n) - Math.log(5)))) }))
    const out = buildScatterOption({ result: vr(logistic, columns), config: c })
    expect(out.option.layout.shapes).toHaveLength(2)
  })
})
