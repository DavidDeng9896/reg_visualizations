/**
 * 图种映射槽（无 Vue）。供配置面板、AI 配图校验、dsh 后端工具共用。
 */
import type { ChartConfig, ChartType, ColumnMeta } from '../../shared/types'
import type { MappingError, SlotDef } from './types'
import { validateMappingWith } from './runtime/mapping'

export const CHART_MAPPING_SLOTS: Record<ChartType, SlotDef[]> = {
  bar: [
    { key: 'x', label: 'X Axis', required: true, axisSettings: true },
    { key: 'y', label: 'Y Axis', aggregatable: true, axisSettings: true },
    { key: 'series', label: 'Series' },
  ],
  line: [
    { key: 'x', label: 'X Axis', required: true, axisSettings: true, acceptTypes: ['number', 'string', 'date', 'datetime'] },
    {
      key: 'values',
      label: 'Y Axis',
      required: true,
      multiple: true,
      aggregatable: true,
      axisSettings: true,
      ySide: true,
      acceptTypes: ['number'],
    },
    { key: 'series', label: 'Series' },
  ],
  scatter: [
    { key: 'x', label: 'X Axis', required: true, axisSettings: true },
    {
      key: 'values',
      label: 'Y Axis',
      required: true,
      multiple: true,
      aggregatable: true,
      axisSettings: true,
      ySide: true,
      acceptTypes: ['number'],
    },
    { key: 'color', label: 'Color' },
    { key: 'shape', label: 'Shape' },
    { key: 'size', label: 'Size', acceptTypes: ['number'] },
  ],
  box: [
    { key: 'y', label: 'Y Axis', required: true, axisSettings: true, acceptTypes: ['number'] },
    { key: 'x', label: 'X Axis Categories', axisSettings: true },
    { key: 'color', label: 'Color' },
    { key: 'shape', label: 'Shape' },
  ],
  pie: [
    { key: 'categories', label: 'Categories', required: true },
    { key: 'measure', label: 'Measure', aggregatable: true, acceptTypes: ['number'] },
  ],
  heatmap: [
    { key: 'x', label: 'X（列坐标）', required: true, axisSettings: true },
    { key: 'y', label: 'Y（行坐标）', required: true, axisSettings: true },
    { key: 'color', label: 'Color value', required: true, acceptTypes: ['number'] },
  ],
  bignumber: [
    { key: 'values', label: 'Metrics', multiple: true, aggregatable: true, acceptTypes: ['number'] },
    { key: 'categories', label: 'Categories' },
    { key: 'measure', label: 'Measure', aggregatable: true, acceptTypes: ['number'] },
  ],
}

export function mappingSlotsFor(type: string): SlotDef[] {
  return CHART_MAPPING_SLOTS[type as ChartType] ?? CHART_MAPPING_SLOTS.bar
}

/** 无 Vue 的映射校验（与 registry.validateChartMapping 对齐，含 bignumber 特例）。 */
export function validateChartMapping(config: ChartConfig, columns: ColumnMeta[]): MappingError[] {
  const type = (config.chartType || 'bar') as ChartType
  const slots = mappingSlotsFor(type)
  const errors = validateMappingWith({ mappingSlots: slots }, config, columns)
  if (type === 'bignumber') {
    const hasValues = (config.configure.values ?? []).some((m) => !!m.field)
    const hasCats = !!config.configure.categories?.field
    if (!hasValues && !hasCats) {
      errors.push({ slot: 'values', kind: 'required', message: '请至少映射 Metrics 或 Categories' })
    }
  }
  return errors
}
