/**
 * 图种注册表：六图种各注册一个定义。
 * 新增图种 = 加一个定义 + 此处注册一行。
 */
import type { ChartConfig, ChartType, ColumnMeta, RowFlag } from '../../shared/types'
import { createChartConfig } from '../../shared/factories'
import type { ViewResult } from '../../shared/pipeline'
import { buildBarOption } from './runtime/bar'
import { buildLineOption } from './runtime/line'
import { buildScatterOption } from './runtime/scatter'
import { buildBoxOption } from './runtime/box'
import { buildPieOption } from './runtime/pie'
import { buildHeatmapOption } from './runtime/heatmap'
import { validateMappingWith } from './runtime/mapping'
import BarConfigure from './panel/configure/BarConfigure.vue'
import LineConfigure from './panel/configure/LineConfigure.vue'
import ScatterConfigure from './panel/configure/ScatterConfigure.vue'
import BoxConfigure from './panel/configure/BoxConfigure.vue'
import PieConfigure from './panel/configure/PieConfigure.vue'
import HeatmapConfigure from './panel/configure/HeatmapConfigure.vue'
import BarStyle from './panel/style/BarStyle.vue'
import LineStyle from './panel/style/LineStyle.vue'
import ScatterStyle from './panel/style/ScatterStyle.vue'
import BoxStyle from './panel/style/BoxStyle.vue'
import PieStyle from './panel/style/PieStyle.vue'
import HeatmapStyle from './panel/style/HeatmapStyle.vue'
import type { BuildInput, BuildOutput, ChartTypeDefinition, MappingError } from './types'

function makeDef(
  partial: Omit<ChartTypeDefinition, 'createDefaultConfigure' | 'createDefaultStyle' | 'validateMapping'>,
): ChartTypeDefinition {
  return {
    ...partial,
    createDefaultConfigure: () => createChartConfig(partial.type).configure,
    createDefaultStyle: () => createChartConfig(partial.type).style,
    validateMapping: (config: ChartConfig, columns: ColumnMeta[]) => validateMappingWith(partial, config, columns),
  }
}

const barDef = makeDef({
  type: 'bar',
  label: 'Bar chart',
  icon: 'bar',
  mappingSlots: [
    { key: 'x', label: 'X Axis', required: true, axisSettings: true },
    { key: 'y', label: 'Y Axis', aggregatable: true, axisSettings: true },
    { key: 'series', label: 'Series' },
  ],
  capabilities: { series: true, errorBars: true, horizontal: true, stack: true, swapXY: true },
  buildOption: (input: BuildInput) => buildBarOption(input),
  configureSection: BarConfigure,
  styleSection: BarStyle,
})

const lineDef = makeDef({
  type: 'line',
  label: 'Line chart',
  icon: 'line',
  mappingSlots: [
    { key: 'x', label: 'X Axis', required: true, axisSettings: true, acceptTypes: ['number', 'string', 'date', 'datetime'] },
    { key: 'values', label: 'Y Axis', required: true, multiple: true, aggregatable: true, axisSettings: true, ySide: true, acceptTypes: ['number'] },
    { key: 'series', label: 'Series' },
  ],
  capabilities: { series: true, secondY: true, faceting: true, regression: true, swapXY: true },
  buildOption: (input: BuildInput) => buildLineOption(input),
  configureSection: LineConfigure,
  styleSection: LineStyle,
})

const scatterDef = makeDef({
  type: 'scatter',
  label: 'Scatter plot',
  icon: 'scatter',
  mappingSlots: [
    { key: 'x', label: 'X Axis', required: true, axisSettings: true },
    { key: 'values', label: 'Y Axis', required: true, multiple: true, aggregatable: true, axisSettings: true, ySide: true, acceptTypes: ['number'] },
    { key: 'color', label: 'Color' },
    { key: 'shape', label: 'Shape' },
    { key: 'size', label: 'Size', acceptTypes: ['number'] },
  ],
  capabilities: { colorShape: true, size: true, errorBars: true, secondY: true, jitter: true, faceting: true, regression: true, swapXY: true },
  buildOption: (input: BuildInput) => buildScatterOption(input),
  configureSection: ScatterConfigure,
  styleSection: ScatterStyle,
})

const boxDef = makeDef({
  type: 'box',
  label: 'Box plot',
  icon: 'box',
  mappingSlots: [
    { key: 'y', label: 'Y Axis', required: true, axisSettings: true, acceptTypes: ['number'] },
    { key: 'x', label: 'X Axis Categories', axisSettings: true },
    { key: 'color', label: 'Color' },
    { key: 'shape', label: 'Shape' },
  ],
  capabilities: { colorShape: true, showPoints: true },
  buildOption: (input: BuildInput) => buildBoxOption(input),
  configureSection: BoxConfigure,
  styleSection: BoxStyle,
})

const pieDef = makeDef({
  type: 'pie',
  label: 'Pie chart',
  icon: 'pie',
  mappingSlots: [
    { key: 'categories', label: 'Categories', required: true },
    { key: 'measure', label: 'Measure', aggregatable: true, acceptTypes: ['number'] },
  ],
  capabilities: { donut: true },
  buildOption: (input: BuildInput) => buildPieOption(input),
  configureSection: PieConfigure,
  styleSection: PieStyle,
})

const heatmapDef = makeDef({
  type: 'heatmap',
  label: 'Heatmap',
  icon: 'heatmap',
  mappingSlots: [
    { key: 'x', label: 'X（列坐标）', required: true, axisSettings: true },
    { key: 'y', label: 'Y（行坐标）', required: true, axisSettings: true },
    { key: 'color', label: 'Color value', required: true, acceptTypes: ['number'] },
  ],
  capabilities: { clustering: true },
  buildOption: (input: BuildInput) => buildHeatmapOption(input),
  configureSection: HeatmapConfigure,
  styleSection: HeatmapStyle,
})

const DEFS: Record<ChartType, ChartTypeDefinition> = {
  bar: barDef,
  line: lineDef,
  scatter: scatterDef,
  box: boxDef,
  pie: pieDef,
  heatmap: heatmapDef,
}

export const CHART_DEFS: ChartTypeDefinition[] = [barDef, lineDef, scatterDef, boxDef, pieDef, heatmapDef]

export function getChartDef(type: ChartType): ChartTypeDefinition {
  return DEFS[type]
}

export function isChartType(t: string): t is ChartType {
  return t in DEFS
}

/** 统一构建入口：ViewResult + ChartConfig → option + warnings。 */
export function buildChartOption(result: ViewResult, config: ChartConfig, viewName?: string, flags?: RowFlag[]): BuildOutput {
  return DEFS[config.chartType].buildOption({ result, config, viewName, flags })
}

export function validateChartMapping(config: ChartConfig, columns: ColumnMeta[]): MappingError[] {
  return DEFS[config.chartType].validateMapping(config, columns)
}
