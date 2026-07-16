import { describe, expect, it } from 'vitest'
import { buildChartOption } from '@/modules/chart/runtime'
import type { ChartConfig, TableColumn } from '@/shared/types/analysis'

const columns: TableColumn[] = [
  { field: 'dose', title: 'dose', dataType: 'number' },
  { field: 'response', title: 'response', dataType: 'number' },
  { field: 'group', title: 'group', dataType: 'string' },
]

describe('buildChartOption layout (STYLE)', () => {
  it('applies custom margins and legend label/position', () => {
    const config: ChartConfig = {
      chartPosition: 'bottom',
      configure: { xField: 'dose', yField: 'response', seriesField: 'group' },
      style: {
        marginTop: 88,
        marginRight: 22,
        marginBottom: 77,
        marginLeft: 66,
        legendPosition: 'bottom',
        legendLabel: 'Cohort',
      },
    }
    const result = buildChartOption({
      columns,
      rows: [
        { dose: 1, response: 2, group: 'A' },
        { dose: 2, response: 3, group: 'B' },
      ],
      viewType: 'scatter',
      config,
    })
    const opt = result.option as {
      grid: { top: number; right: number; bottom: number; left: number }
      legend: { show: boolean; bottom?: number; orient?: string; formatter?: (n: string) => string }
    }
    expect(opt.grid).toEqual({ top: 88, right: 22, bottom: 77, left: 66 })
    expect(opt.legend.show).toBe(true)
    expect(opt.legend.bottom).toBe(0)
    expect(opt.legend.orient).toBe('horizontal')
    expect(opt.legend.formatter?.('A')).toBe('Cohort · A')
  })

  it('hides legend when disabled', () => {
    const result = buildChartOption({
      columns,
      rows: [{ dose: 1, response: 2 }],
      viewType: 'line',
      config: {
        chartPosition: 'bottom',
        configure: { xField: 'dose', yField: 'response' },
        style: { legendShow: false },
      },
    })
    const opt = result.option as { legend: { show: boolean } }
    expect(opt.legend.show).toBe(false)
  })
})
