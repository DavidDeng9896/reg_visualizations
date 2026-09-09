import { describe, expect, it } from 'vitest'
import {
  EMPTY_CHART_COPY,
  categoryScatterWarning,
  chartOptionHasVisiblePoints,
  scatterCategoryAxisField,
  shouldShowEmptyChartGate,
  yMappingForBarAfterScatterSwitch,
} from '../../../src/modules/charts/chartEmptyState'
import { createChartConfig } from '../../../src/shared/factories'
import type { ColumnMeta } from '../../../src/shared/types'

const cols = (defs: Array<[string, ColumnMeta['dataType']]>): ColumnMeta[] =>
  defs.map(([field, dataType]) => ({ field, title: field, dataType }))

describe('chartEmptyState', () => {
  it('chartOptionHasVisiblePoints：空 data / 空数组 → false，有点 → true', () => {
    expect(chartOptionHasVisiblePoints(null)).toBe(false)
    expect(chartOptionHasVisiblePoints({ data: [], layout: {} })).toBe(false)
    expect(chartOptionHasVisiblePoints({ data: [{ type: 'scatter', x: [], y: [] }], layout: {} })).toBe(false)
    expect(
      chartOptionHasVisiblePoints({
        data: [{ type: 'scatter', x: [1, 2], y: [3, 4] }],
        layout: {},
      }),
    ).toBe(true)
  })

  it('scatterCategoryAxisField：分类 X 返回字段名', () => {
    const cfg = createChartConfig('scatter')
    cfg.configure.x = { field: 'step' }
    cfg.configure.values = [{ field: 'yield' }]
    expect(scatterCategoryAxisField(cfg, cols([['step', 'string'], ['yield', 'number']]))).toBe('step')
    expect(scatterCategoryAxisField(cfg, cols([['step', 'number'], ['yield', 'number']]))).toBeNull()
  })

  it('categoryScatterWarning 使用实际字段名', () => {
    expect(categoryScatterWarning('step')).toBe('「step」是分类，散点图通常不合适。建议改用柱状图。')
  })

  it('shouldShowEmptyChartGate：分类散点预渲染即触发；无墨迹在已构建后触发', () => {
    expect(
      shouldShowEmptyChartGate({
        requiredMissing: true,
        categoryField: 'step',
        option: null,
        hasBuilt: false,
      }),
    ).toBe(false)

    expect(
      shouldShowEmptyChartGate({
        requiredMissing: false,
        categoryField: 'step',
        option: null,
        hasBuilt: false,
      }),
    ).toBe(true)

    expect(
      shouldShowEmptyChartGate({
        requiredMissing: false,
        categoryField: null,
        option: { data: [{ x: [], y: [] }], layout: {} },
        hasBuilt: true,
      }),
    ).toBe(true)

    expect(
      shouldShowEmptyChartGate({
        requiredMissing: false,
        categoryField: null,
        option: { data: [{ x: [1], y: [2] }], layout: {} },
        hasBuilt: true,
      }),
    ).toBe(false)

    expect(
      shouldShowEmptyChartGate({
        requiredMissing: false,
        categoryField: null,
        option: null,
        hasBuilt: false,
      }),
    ).toBe(false)
  })

  it('EMPTY_CHART_COPY 为约定中文文案', () => {
    expect(EMPTY_CHART_COPY.title).toBe('没有画出可用数据')
    expect(EMPTY_CHART_COPY.openConfigure).toBe('打开图表配置')
    expect(EMPTY_CHART_COPY.keepScatter).toBe('仍用散点')
    expect(EMPTY_CHART_COPY.switchBar).toBe('改用柱状图')
  })

  it('yMappingForBarAfterScatterSwitch：none/空聚合 → sum，保留已有聚合', () => {
    expect(yMappingForBarAfterScatterSwitch(undefined)).toBeUndefined()
    expect(yMappingForBarAfterScatterSwitch({ field: 'yield', aggregation: 'none' })).toEqual({
      field: 'yield',
      aggregation: 'sum',
    })
    expect(yMappingForBarAfterScatterSwitch({ field: 'yield' })).toEqual({
      field: 'yield',
      aggregation: 'sum',
    })
    const mean = { field: 'yield', aggregation: 'mean' as const }
    expect(yMappingForBarAfterScatterSwitch(mean)).toBe(mean)
  })
})
