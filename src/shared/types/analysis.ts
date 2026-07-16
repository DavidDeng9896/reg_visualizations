/** Domain types for Insight Analysis (spec §3) */

export type DataType = 'string' | 'number' | 'date' | 'datetime' | 'boolean' | 'unknown'

export interface TableColumn {
  field: string
  title: string
  dataType: DataType
}

export type FilterOp = 'eq' | 'neq' | 'contains' | 'empty' | 'notEmpty' | 'gt' | 'gte' | 'lt' | 'lte' | 'between'

export interface FilterCondition {
  id: string
  field: string
  op: FilterOp
  value?: unknown
  valueTo?: unknown
}

export type TransformKind = 'select' | 'rename' | 'derived' | 'dedupe' | 'sort'

export interface TransformStep {
  id: string
  kind: TransformKind
  /** kind-specific payload */
  config: Record<string, unknown>
}

export type ViewType = 'table' | 'bar' | 'box' | 'line' | 'pie' | 'scatter' | 'heatmap'
export type ChartPosition = 'top' | 'bottom' | 'left' | 'right'
export type JoinType = 'left' | 'inner' | 'right' | 'full' | 'append'

export type TableSource =
  | { type: 'csv'; fileName: string }
  | {
      type: 'combine'
      joinType: JoinType
      leftTableId: string
      rightTableId: string
      leftKeys?: string[]
      rightKeys?: string[]
    }
  | { type: 'registry' }
  | { type: 'plate' }

export interface ChartConfigure {
  xField?: string
  yField?: string
  yFieldRight?: string
  seriesField?: string
  colorField?: string
  shapeField?: string
  sizeField?: string
  categoriesField?: string
  measureField?: string
  aggregation?: 'count' | 'sum' | 'min' | 'max' | 'mean' | 'median'
  orientation?: 'vertical' | 'horizontal'
  stacked?: boolean
  errorBars?: 'none' | 'sd' | 'sem'
  xLabel?: string
  yLabel?: string
  yLabelRight?: string
  xScale?: 'linear' | 'log'
  yScale?: 'linear' | 'log'
  fitModel?: 'none' | 'ptp' | 'linear' | 'quadratic' | '4pl'
  excludeFlagged?: boolean
  colorPalette?: 'light' | 'dark' | 'alternate'
  showPoints?: boolean
  heatmapValueField?: string
  heatmapRowField?: string
  heatmapColField?: string
}

export interface ChartStyle {
  title?: string
  subtitle?: string
  width?: number
  height?: number
  marginTop?: number
  marginRight?: number
  marginBottom?: number
  marginLeft?: number
  opacity?: number
  pointShape?: string
  legendShow?: boolean
  legendPosition?: 'left' | 'right' | 'top' | 'bottom'
  legendLabel?: string
  seriesColors?: Record<string, string>
}

export interface ChartFlags {
  pointIds: string[]
  comments: Record<string, string>
}

export interface ChartConfig {
  configure: ChartConfigure
  style: ChartStyle
  flags?: ChartFlags
  chartPosition: ChartPosition
  /** 图表区相对表+图总空间的占比 0.2–0.8；缺省 0.45（需求 L-04） */
  splitRatio?: number
}

export interface ViewNode {
  id: string
  parentId: string | null
  tableId: string
  name: string
  viewType: ViewType
  viewFilters: FilterCondition[]
  transforms: TransformStep[]
  chartConfig: ChartConfig
  children: ViewNode[]
}

export interface AnalysisTable {
  id: string
  name: string
  source: TableSource
  columns: TableColumn[]
  rows: Record<string, unknown>[]
  tableFilters: FilterCondition[]
  views: ViewNode[]
}

export interface FlowchartLayout {
  [nodeId: string]: { x: number; y: number }
}

export interface Analysis {
  id: string
  name: string
  projectId: string
  createdAt: string
  updatedAt: string
  tables: AnalysisTable[]
  flowchartLayout: FlowchartLayout
}

export interface Project {
  id: string
  name: string
}

export interface ViewResult {
  columns: TableColumn[]
  rows: Record<string, unknown>[]
}
