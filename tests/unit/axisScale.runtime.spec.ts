import { describe, expect, it } from 'vitest'
import { buildChartOption } from '@/modules/chart/runtime'
import type { ChartConfig, TableColumn } from '@/shared/types/analysis'

const columns: TableColumn[] = [
  { field: 'dose', title: 'dose', dataType: 'number' },
  { field: 'response', title: 'response', dataType: 'number' },
]

function baseConfig(overrides: Partial<ChartConfig['configure']> = {}): ChartConfig {
  return {
    chartPosition: 'bottom',
    configure: {
      xField: 'dose',
      yField: 'response',
      xScale: 'linear',
      yScale: 'linear',
      ...overrides,
    },
    style: {},
  }
}

describe('buildChartOption axis scale', () => {
  it('uses log axes when all values are positive', () => {
    const rows = [
      { dose: 1, response: 10 },
      { dose: 10, response: 20 },
    ]
    const result = buildChartOption({
      columns,
      rows,
      viewType: 'scatter',
      config: baseConfig({ xScale: 'log', yScale: 'log' }),
    })
    const opt = result.option as { xAxis: { type: string }; yAxis: { type: string }[] }
    expect(opt.xAxis.type).toBe('log')
    expect(opt.yAxis[0].type).toBe('log')
    expect(result.axisWarnings).toBeUndefined()
  })

  it('falls back to linear and warns when log meets non-positive values', () => {
    const rows = [
      { dose: 0, response: 10 },
      { dose: 10, response: -1 },
    ]
    const result = buildChartOption({
      columns,
      rows,
      viewType: 'line',
      config: baseConfig({ xScale: 'log', yScale: 'log' }),
    })
    const opt = result.option as { xAxis: { type: string }; yAxis: { type: string }[] }
    expect(opt.xAxis.type).toBe('value')
    expect(opt.yAxis[0].type).toBe('value')
    expect(result.axisWarnings?.length).toBeGreaterThan(0)
  })
})
