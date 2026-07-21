/**
 * 图表系统 —— 图种注册表类型定义。
 * 新增图种 = 一个定义文件 + registry.ts 注册一行；严禁巨型 if-else。
 */
import type { Component } from 'vue'
import type { ChartConfig, ChartConfigure, ChartStyle, ChartType, ColumnMeta, DataType, RowFlag } from '../../shared/types'
import type { ViewResult } from '../../shared/pipeline'
import type { IconName } from '../../ui'
import type { FitGroupSummary } from './fit/summary'

export type SlotKey = 'x' | 'y' | 'series' | 'color' | 'shape' | 'size' | 'categories' | 'measure' | 'values'

/** 映射槽位定义（CONFIGURE 面板据此渲染 MappingSlot）。 */
export interface SlotDef {
  key: SlotKey
  label: string
  required?: boolean
  /** 接受的数据类型；缺省接受全部。 */
  acceptTypes?: DataType[]
  /** 多值槽位（Line/Scatter 多 Y 度量），存储于 configure.values。 */
  multiple?: boolean
  /** 胶囊支持聚合（齿轮弹层含聚合下拉）。 */
  aggregatable?: boolean
  /** 齿轮弹层含轴设置（Custom label / Range / Scale）。 */
  axisSettings?: boolean
  /** 胶囊可切换 Y Axis Side（Line/Scatter 双 Y 轴）。 */
  ySide?: boolean
}

export interface ChartCapabilities {
  series?: boolean
  colorShape?: boolean
  size?: boolean
  errorBars?: boolean
  secondY?: boolean
  jitter?: boolean
  faceting?: boolean
  horizontal?: boolean
  stack?: boolean
  showPoints?: boolean
  donut?: boolean
  clustering?: boolean
  regression?: boolean
  swapXY?: boolean
}

/** 松散 ECharts option（builder 纯函数产物，交给 ChartPanel 渲染）。 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ChartOption = Record<string, any>

export interface BuildInput {
  result: ViewResult
  config: ChartConfig
  /** 默认标题来源（视图名 / 表名）。 */
  viewName?: string
  /** 视图打标（Line/Scatter 拟合排除与 × 叠加）。 */
  flags?: RowFlag[]
}

export interface BuildOutput {
  option: ChartOption
  warnings: string[]
  /** 当前渲染的系列名（供 STYLE 逐系列取色/改标签）。 */
  seriesNames: string[]
  /** 各组拟合摘要（MODEL TABLES；无拟合时缺省）。 */
  fits?: FitGroupSummary[]
}

export interface MappingError {
  slot: SlotKey
  kind: 'required' | 'missing-column'
  message: string
}

export interface ChartTypeDefinition {
  type: ChartType
  label: string
  icon: IconName
  mappingSlots: SlotDef[]
  capabilities: ChartCapabilities
  createDefaultConfigure(): ChartConfigure
  createDefaultStyle(): ChartStyle
  buildOption(input: BuildInput): BuildOutput
  validateMapping(config: ChartConfig, columns: ColumnMeta[]): MappingError[]
  /** CONFIGURE 面板区段组件。 */
  configureSection: Component
  /** STYLE 面板区段组件。 */
  styleSection: Component
}
