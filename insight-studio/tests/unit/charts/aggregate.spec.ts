import { describe, expect, it } from 'vitest'
import {
  aggregateRows,
  aggregateValues,
  errorValue,
  fiveNumber,
  numericValues,
  quantile,
  standardDeviation,
  standardError,
} from '../../../src/modules/charts/runtime/aggregate'
import type { Row } from '../../../src/shared/types'

describe('aggregate · 六种聚合', () => {
  const vals = [4, 1, 3, 2]

  it('count / sum / min / max / mean / median', () => {
    expect(aggregateValues(vals, 'count')).toBe(4)
    expect(aggregateValues(vals, 'sum')).toBe(10)
    expect(aggregateValues(vals, 'min')).toBe(1)
    expect(aggregateValues(vals, 'max')).toBe(4)
    expect(aggregateValues(vals, 'mean')).toBe(2.5)
    expect(aggregateValues(vals, 'median')).toBe(2.5)
  })

  it('空数组 → null', () => {
    expect(aggregateValues([], 'mean')).toBeNull()
    expect(aggregateValues([], 'sum')).toBeNull()
  })

  it('median 偶数长度取中间两值均值', () => {
    expect(aggregateValues([1, 2, 3, 4], 'median')).toBe(2.5)
    expect(quantile([1, 2, 3], 0.5)).toBe(2)
  })
})

describe('aggregate · 空值/非数值剔除', () => {
  it('numericValues 剔除 null/空串/非数值字符串', () => {
    const rows: Row[] = [{ v: 1 }, { v: null }, { v: '' }, { v: 'abc' }, { v: '2.5' }, { v: true }]
    expect(numericValues(rows, 'v')).toEqual([1, 2.5, 1])
  })

  it('count = Count non-blank（不计 null 与空串）', () => {
    const rows: Row[] = [{ v: 1 }, { v: null }, { v: '' }, { v: 'x' }]
    expect(aggregateRows(rows, 'v', 'count')).toBe(2)
  })

  it('count 无字段 → 行数', () => {
    expect(aggregateRows([{ a: 1 }, { a: 2 }, { a: 3 }], null, 'count')).toBe(3)
  })
})

describe('aggregate · SD / SEM（样本标准差，n-1）', () => {
  it('SD / SEM 已知答案', () => {
    // [1,2,3] mean=2, 样本方差=1, SD=1, SEM=1/√3
    expect(standardDeviation([1, 2, 3])).toBe(1)
    expect(standardError([1, 2, 3])).toBeCloseTo(1 / Math.sqrt(3), 10)
  })

  it('n<2 → null', () => {
    expect(standardDeviation([5])).toBeNull()
    expect(standardError([])).toBeNull()
  })

  it('errorValue 按类型分发', () => {
    expect(errorValue([1, 2, 3], 'sd')).toBe(1)
    expect(errorValue([1, 2, 3], 'sem')).toBeCloseTo(0.5774, 3)
    expect(errorValue([1, 2, 3], 'none')).toBeNull()
  })
})

describe('aggregate · 箱线五数（1.5×IQR 须）', () => {
  it('无离群：须 = 最值', () => {
    const s = fiveNumber([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])!
    expect(s.q1).toBeCloseTo(3.25)
    expect(s.q2).toBeCloseTo(5.5)
    expect(s.q3).toBeCloseTo(7.75)
    expect(s.low).toBe(1)
    expect(s.high).toBe(10)
    expect(s.outliers).toEqual([])
  })

  it('离群点剔除出须端', () => {
    const s = fiveNumber([1, 2, 3, 4, 5, 100])!
    // q1=2.25 q3=4.75 iqr=2.5 hiFence=8.5 → 100 离群
    expect(s.outliers).toEqual([100])
    expect(s.high).toBe(5)
    expect(s.low).toBe(1)
  })

  it('空数组 → null', () => {
    expect(fiveNumber([])).toBeNull()
  })
})
