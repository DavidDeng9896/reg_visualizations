/**
 * 表+图一体化上下文：TableChartWorkspace provide，图表切片 inject 消费。
 * 图表切片在 div[data-mount="chart-panel"] 内挂载，从这里拿当前 ViewResult 与选中态。
 */
import type { ComputedRef, InjectionKey, Ref } from 'vue'
import type { AnalysisTable, ChartPosition, ViewNode } from '../../shared/types'
import type { ViewResult } from '../../shared/pipeline'
import type { SelectedNode } from '../../stores/analysisStore'

export interface TableChartContext {
  /** 当前管道结果（表格与图表共用同一份）。 */
  result: ComputedRef<ViewResult | null>
  table: ComputedRef<AnalysisTable | undefined>
  view: ComputedRef<ViewNode | null>
  selected: Ref<SelectedNode | null>
  /** 图表相对表格的方位（仅图表视图有效）。 */
  chartPosition: ComputedRef<ChartPosition>
  /** 窄屏降级标志（<900px 时左右布局已降级为上下）。 */
  narrow: Ref<boolean>
  /** 表格是否可编辑（源表 / 可写回视图）。 */
  editable: ComputedRef<boolean>
}

export const TABLE_CHART_CONTEXT: InjectionKey<TableChartContext> = Symbol('table-chart-context')
