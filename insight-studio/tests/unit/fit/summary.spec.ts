import { describe, expect, it } from 'vitest'
import { runFit, type FitInputPoint } from '../../../src/modules/charts/fit/engine'
import { modelOutputOf, modelVariablesOf, summarizeFit } from '../../../src/modules/charts/fit/summary'

const linPts: FitInputPoint[] = [1, 2, 3, 4].map((x, i) => ({ x, y: 2 * x + 1, rowId: `r${i}` }))
const linearFit = () => runFit(linPts, { model: 'linear' })

describe('modelVariablesOf（MODEL VARIABLES）', () => {
  it('Linear：Slope / Intercept 两行 + CI', () => {
    const vars = modelVariablesOf(linearFit())
    expect(vars.map((v) => v.name)).toEqual(['Slope', 'Intercept'])
    expect(vars[0].estimate).toBeCloseTo(2, 8)
    expect(vars[1].estimate).toBeCloseTo(1, 8)
    expect(vars[0].ciLow).not.toBeNull()
    expect(vars[0].ciHigh).not.toBeNull()
  })

  it('Quadratic：a / b / c 三行', () => {
    const xs = Array.from({ length: 8 }, (_, i) => i)
    const fit = runFit(
      xs.map((x, i) => ({ x, y: 3 + 2 * x - 0.5 * x * x, rowId: `r${i}` })),
      { model: 'quadratic' },
    )
    const vars = modelVariablesOf(fit)
    expect(vars).toHaveLength(3)
    expect(vars[2].estimate).toBeCloseTo(-0.5, 8)
  })

  it('4PL：Min / Max / Hill Slope / Inflection Point 四行', () => {
    const xs = [0.1, 0.5, 1, 2, 3, 5, 8, 10, 20, 50, 100]
    const fit = runFit(
      xs.map((x, i) => ({ x, y: 100 / (1 + Math.exp(-1.5 * (Math.log(x) - Math.log(5)))), rowId: `r${i}` })),
      { model: '4pl' },
    )
    const names = modelVariablesOf(fit).map((v) => v.name)
    expect(names).toEqual(['Min', 'Max', 'Hill Slope', 'Inflection Point'])
  })

  it('Point-to-Point：非回归 → 空参数表', () => {
    const fit = runFit(linPts, { model: 'point-to-point' })
    expect(modelVariablesOf(fit)).toHaveLength(0)
  })
})

describe('modelOutputOf（MODEL OUTPUT）', () => {
  it('pred / residual 计算正确且按 x 排序', () => {
    const shuffled: FitInputPoint[] = [
      { x: 4, y: 9, rowId: 'r3' },
      { x: 1, y: 3, rowId: 'r0' },
      { x: 3, y: 7, rowId: 'r2' },
      { x: 2, y: 5, rowId: 'r1' },
    ]
    const out = modelOutputOf(linearFit(), shuffled)
    expect(out.map((r) => r.x)).toEqual([1, 2, 3, 4])
    expect(out[0].yPred).toBeCloseTo(3, 8)
    expect(out[0].residual).toBeCloseTo(0, 8)
    expect(out[3].yPred).toBeCloseTo(9, 8)
  })

  it('flagged 状态透传', () => {
    const input = linPts.map((p, i) => ({ ...p, flagged: i === 1 }))
    const out = modelOutputOf(linearFit(), input)
    expect(out.filter((r) => r.flagged)).toHaveLength(1)
  })

  it('拟合失败 → 空输出', () => {
    const bad = runFit([{ x: 1, y: 1 }], { model: 'linear' })
    expect(modelOutputOf(bad, linPts)).toHaveLength(0)
  })
})

describe('summarizeFit', () => {
  it('追加 R² 行；组名与模型标签', () => {
    const s = summarizeFit('Group A', linearFit(), linPts)
    expect(s.group).toBe('Group A')
    expect(s.modelLabel).toBe('Linear')
    expect(s.variables[s.variables.length - 1].name).toBe('R²')
    expect(s.variables[s.variables.length - 1].estimate).toBeCloseTo(1, 8)
    expect(s.output).toHaveLength(4)
    expect(s.usedPoints).toBe(4)
  })

  it('point-to-point 无 R² 行', () => {
    const s = summarizeFit('', runFit(linPts, { model: 'point-to-point' }), linPts)
    expect(s.variables).toHaveLength(0)
    expect(s.r2).toBeNull()
  })
})
