/**
 * 图种注册表：各图种各注册一个定义。
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
import { buildBignumberOption } from './runtime/bignumber'
import { CHART_MAPPING_SLOTS } from './chartSlots'
import { validateMappingWith } from './runtime/mapping'
import BarConfigure from './panel/configure/BarConfigure.vue'
import LineConfigure from './panel/configure/LineConfigure.vue'
import ScatterConfigure from './panel/configure/ScatterConfigure.vue'
import BoxConfigure from './panel/configure/BoxConfigure.vue'
import PieConfigure from './panel/configure/PieConfigure.vue'
import HeatmapConfigure from './panel/configure/HeatmapConfigure.vue'
import BigNumberConfigure from './panel/configure/BigNumberConfigure.vue'
import BarStyle from './panel/style/BarStyle.vue'
import LineStyle from './panel/style/LineStyle.vue'
import ScatterStyle from './panel/style/ScatterStyle.vue'
import BoxStyle from './panel/style/BoxStyle.vue'
import PieStyle from './panel/style/PieStyle.vue'
import HeatmapStyle from './panel/style/HeatmapStyle.vue'
import BigNumberStyle from './panel/style/BigNumberStyle.vue'
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
  mappingSlots: CHART_MAPPING_SLOTS.bar,
  capabilities: { series: true, errorBars: true, horizontal: true, stack: true, swapXY: true },
  buildOption: (input: BuildInput) => buildBarOption(input),
  configureSection: BarConfigure,
  styleSection: BarStyle,
})

const lineDef = makeDef({
  type: 'line',
  label: 'Line chart',
  icon: 'line',
  mappingSlots: CHART_MAPPING_SLOTS.line,
  capabilities: { series: true, secondY: true, faceting: true, regression: true, swapXY: true },
  buildOption: (input: BuildInput) => buildLineOption(input),
  configureSection: LineConfigure,
  styleSection: LineStyle,
})

const scatterDef = makeDef({
  type: 'scatter',
  label: 'Scatter plot',
  icon: 'scatter',
  mappingSlots: CHART_MAPPING_SLOTS.scatter,
  capabilities: { colorShape: true, size: true, errorBars: true, secondY: true, jitter: true, faceting: true, regression: true, swapXY: true },
  buildOption: (input: BuildInput) => buildScatterOption(input),
  configureSection: ScatterConfigure,
  styleSection: ScatterStyle,
})

const boxDef = makeDef({
  type: 'box',
  label: 'Box plot',
  icon: 'box',
  mappingSlots: CHART_MAPPING_SLOTS.box,
  capabilities: { colorShape: true, showPoints: true },
  buildOption: (input: BuildInput) => buildBoxOption(input),
  configureSection: BoxConfigure,
  styleSection: BoxStyle,
})

const pieDef = makeDef({
  type: 'pie',
  label: 'Pie chart',
  icon: 'pie',
  mappingSlots: CHART_MAPPING_SLOTS.pie,
  capabilities: { donut: true },
  buildOption: (input: BuildInput) => buildPieOption(input),
  configureSection: PieConfigure,
  styleSection: PieStyle,
})

const heatmapDef = makeDef({
  type: 'heatmap',
  label: 'Heatmap',
  icon: 'heatmap',
  mappingSlots: CHART_MAPPING_SLOTS.heatmap,
  capabilities: { clustering: true },
  buildOption: (input: BuildInput) => buildHeatmapOption(input),
  configureSection: HeatmapConfigure,
  styleSection: HeatmapStyle,
})

const bignumberSlots = CHART_MAPPING_SLOTS.bignumber

const bignumberDef: ChartTypeDefinition = {
  ...makeDef({
    type: 'bignumber',
    label: 'Big number',
    icon: 'bignumber',
    mappingSlots: bignumberSlots,
    capabilities: {},
    buildOption: (input: BuildInput) => buildBignumberOption(input),
    configureSection: BigNumberConfigure,
    styleSection: BigNumberStyle,
  }),
  validateMapping: (config: ChartConfig, columns: ColumnMeta[]) => {
    const errors = validateMappingWith({ mappingSlots: bignumberSlots }, config, columns)
    const hasValues = (config.configure.values ?? []).some((m) => !!m.field)
    const hasCats = !!config.configure.categories?.field
    if (!hasValues && !hasCats) {
      errors.push({
        slot: 'values',
        kind: 'required',
        message: '请至少映射 Metrics 或 Categories',
      })
    }
    return errors
  },
}

const DEFS: Record<ChartType, ChartTypeDefinition> = {
  bar: barDef,
  line: lineDef,
  scatter: scatterDef,
  box: boxDef,
  pie: pieDef,
  heatmap: heatmapDef,
  bignumber: bignumberDef,
}

export const CHART_DEFS: ChartTypeDefinition[] = [barDef, lineDef, scatterDef, boxDef, pieDef, heatmapDef, bignumberDef]

export function getChartDef(type: ChartType): ChartTypeDefinition {
  return DEFS[type] ?? DEFS.bar
}

export function isChartType(t: string): t is ChartType {
  return t in DEFS
}

/** 统一构建入口：ViewResult + ChartConfig → option + warnings。 */
export function buildChartOption(
  result: ViewResult,
  config: ChartConfig,
  viewName?: string,
  flags?: RowFlag[],
  opts?: { hideTitle?: boolean },
): BuildOutput {
  const def = getChartDef(config.chartType)
  let cfg: ChartConfig = { ...config, chartType: def.type }
  if (opts?.hideTitle) {
    // 嵌入卡片场景：卡头已展示名称，隐藏图内标题并收紧顶部留白
    cfg = { ...cfg, style: { ...cfg.style, title: undefined, subtitle: undefined } }
  }
  return def.buildOption({ result, config: cfg, viewName, flags })
}

export function validateChartMapping(config: ChartConfig, columns: ColumnMeta[]): MappingError[] {
  const def = getChartDef(config.chartType)
  return def.validateMapping({ ...config, chartType: def.type }, columns)
}
