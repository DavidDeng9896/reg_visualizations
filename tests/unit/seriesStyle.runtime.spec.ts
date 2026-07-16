import { describe, expect, it } from 'vitest'
import { buildChartOption } from '@/modules/chart/runtime'
import type { ChartConfig, TableColumn } from '@/shared/types/analysis'

const columns: TableColumn[] = [
  { field: 'dose', title: 'dose', dataType: 'number' },
  { field: 'response', title: 'response', dataType: 'number' },
  { field: 'group', title: 'group', dataType: 'string' },
]

describe('buildChartOption seriesColors + title', () => {
  it('applies per-series color overrides', () => {
    const config: ChartConfig = {
      chartPosition: 'bottom',
      configure: { xField: 'dose', yField: 'response', seriesField: 'group' },
      style: {
        title: 'Custom Title',
        seriesColors: { A: '#112233', B: '#aabbcc' },
      },
    }
    const result = buildChartOption({
      columns,
      rows: [
        { dose: 1, response: 2, group: 'A' },
        { dose: 2, response: 3, group: 'B' },
      ],
      viewType: 'bar',
      config,
    })
    const opt = result.option as {
      title: { text: string }
      series: { name: string; itemStyle: { color: string } }[]
    }
    expect(opt.title.text).toBe('Custom Title')
    const byName = Object.fromEntries(opt.series.map((s) => [s.name, s.itemStyle.color]))
    expect(byName.A).toBe('#112233')
    expect(byName.B).toBe('#aabbcc')
  })

  it('uses empty title text when style.title omitted', () => {
    const result = buildChartOption({
      columns,
      rows: [{ dose: 1, response: 2 }],
      viewType: 'scatter',
      config: {
        chartPosition: 'bottom',
        configure: { xField: 'dose', yField: 'response' },
        style: {},
      },
    })
    const opt = result.option as { title: { text: string } }
    expect(opt.title.text).toBe('')
  })
})
