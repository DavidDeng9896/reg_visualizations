import { describe, expect, it } from 'vitest'
import { normalizeToolArguments } from '../../../src/modules/ai/client'
import {
  CREATE_CHART_TYPE_FAIL,
  coerceArrayToolArgs,
  coerceParsedToolArgs,
  inferChartTypeFromConfigure,
  normalizeChartTypeToken,
  pickRawChartTypeCandidate,
} from '../../../src/modules/ai/toolArgs'

describe('toolArgs', () => {
  it('coerceArrayToolArgs：字段映射数组 → configure.values', () => {
    const arr = [{ field: 'koff_1e4' }]
    expect(coerceArrayToolArgs(arr, 'set_chart_config')).toEqual({
      configure: { values: [{ field: 'koff_1e4' }] },
    })
  })

  it('normalizeToolArguments：顶层数组不再原样回灌（避免 502）', () => {
    const raw = '[{"field":"koff_1e4"}]'
    const out = normalizeToolArguments(raw, 'set_chart_config')
    expect(() => JSON.parse(out)).not.toThrow()
    expect(JSON.parse(out)).toEqual({ configure: { values: [{ field: 'koff_1e4' }] } })
    expect(out.startsWith('[')).toBe(false)
  })

  it('coerceParsedToolArgs：steps 误传为 configure.values', () => {
    expect(
      coerceParsedToolArgs('set_chart_config', {
        viewId: 'v1',
        steps: [{ field: 'kd' }],
      }),
    ).toEqual({
      viewId: 'v1',
      configure: { values: [{ field: 'kd' }] },
    })
  })

  describe('create_chart chartType coercion', () => {
    it('missing chartType + has type → chartType', () => {
      const out = coerceParsedToolArgs('create_chart', {
        tableId: 't1',
        type: 'scatter',
        configure: { x: { field: 'a' }, values: [{ field: 'b' }] },
      })
      expect(out.chartType).toBe('scatter')
    })

    it('wrong key aliases: viewType / chart_type / nested configure.type', () => {
      expect(
        coerceParsedToolArgs('create_chart', {
          viewType: 'bar',
          configure: { x: { field: 'a' }, y: { field: 'b' } },
        }).chartType,
      ).toBe('bar')

      expect(
        coerceParsedToolArgs('create_chart', {
          chart_type: 'line',
          configure: { x: { field: 'a' }, values: [{ field: 'b' }] },
        }).chartType,
      ).toBe('line')

      expect(
        coerceParsedToolArgs('create_chart', {
          configure: {
            type: 'heatmap',
            x: { field: 'a' },
            y: { field: 'b' },
            color: { field: 'c' },
          },
        }).chartType,
      ).toBe('heatmap')

      expect(
        coerceParsedToolArgs('create_chart', {
          chart: { chartType: 'box' },
          configure: { y: { field: 'v' } },
        }).chartType,
      ).toBe('box')
    })

    it('Chinese synonym → canonical type', () => {
      expect(normalizeChartTypeToken('散点图')).toBe('scatter')
      expect(normalizeChartTypeToken('柱状图')).toBe('bar')
      expect(normalizeChartTypeToken('折线图')).toBe('line')
      expect(normalizeChartTypeToken('饼图')).toBe('pie')
      expect(
        coerceParsedToolArgs('create_chart', {
          chartType: '散点图',
          configure: { x: { field: 'a' }, values: [{ field: 'b' }] },
        }).chartType,
      ).toBe('scatter')
      expect(
        coerceParsedToolArgs('create_chart', {
          type: '热力图',
          configure: { x: { field: 'a' }, y: { field: 'b' }, color: { field: 'c' } },
        }).chartType,
      ).toBe('heatmap')
    })

    it('still missing when truly absent → no invented chartType', () => {
      const out = coerceParsedToolArgs('create_chart', {
        tableId: 't1',
        configure: { x: { field: 'a' }, y: { field: 'b' } },
      })
      expect(out.chartType).toBeUndefined()
      expect(CREATE_CHART_TYPE_FAIL).toMatch(/chartType/)
      expect(CREATE_CHART_TYPE_FAIL).toMatch(/示例/)
    })

    it('ambiguous x+values does not invent line vs scatter', () => {
      const out = coerceParsedToolArgs('create_chart', {
        configure: { x: { field: 'a' }, values: [{ field: 'b' }] },
      })
      expect(out.chartType).toBeUndefined()
    })

    it('infer scatter when values + color uniquely imply scatter', () => {
      expect(
        inferChartTypeFromConfigure({
          x: { field: 'a' },
          values: [{ field: 'b' }],
          color: { field: 'g' },
        }),
      ).toBe('scatter')
      expect(
        coerceParsedToolArgs('create_chart', {
          configure: {
            x: { field: 'a' },
            values: [{ field: 'b' }],
            size: { field: 's' },
          },
        }).chartType,
      ).toBe('scatter')
    })

    it('infer pie when categories+measure and no axes', () => {
      expect(
        coerceParsedToolArgs('create_chart', {
          configure: {
            categories: { field: 'species' },
            measure: { field: 'count', aggregation: 'sum' },
          },
        }).chartType,
      ).toBe('pie')
    })

    it('valid create_chart chartType still works (regression)', () => {
      const out = coerceParsedToolArgs('create_chart', {
        tableId: 't1',
        chartType: 'bar',
        configure: { x: { field: 'species' }, y: { field: 'sepal_length', aggregation: 'mean' } },
      })
      expect(out.chartType).toBe('bar')
      expect(out.configure).toEqual({
        x: { field: 'species' },
        y: { field: 'sepal_length', aggregation: 'mean' },
      })
    })

    it('table is not accepted as chartType', () => {
      const out = coerceParsedToolArgs('create_chart', {
        type: 'table',
        configure: { x: { field: 'a' }, y: { field: 'b' } },
      })
      expect(out.chartType).toBeUndefined()
    })

    it('pickRawChartTypeCandidate prefers top-level chartType', () => {
      expect(
        pickRawChartTypeCandidate({
          chartType: 'bar',
          type: 'scatter',
          viewType: 'line',
        }),
      ).toBe('bar')
    })
  })
})
