/**
 * Insight Studio — 核心领域类型（纯 TS，与 UI 无关）
 * 依据 DESIGN.md §3 与 docs/specs §3 数据模型。
 */

/** 单元格值。null 表示空。 */
export type CellValue = string | number | boolean | null

/** 数据行。key 为列 field。行内部携带稳定行 id（见 ROW_ID_FIELD），不计入 ColumnMeta。 */
export type Row = Record<string, CellValue>

/** 行对象内部的稳定 id 键（用于编辑写回、打标）。不作为普通列展示。 */
export const ROW_ID_FIELD = '__rowId'

export type DataType = 'string' | 'number' | 'boolean' | 'date' | 'datetime' | 'structure'

export interface ColumnMeta {
  field: string
  title: string
  dataType: DataType
}

/* ---------------------------------- 过滤 ---------------------------------- */

export type FilterOperator =
  | 'eq'
  | 'neq'
  | 'contains'
  | 'notContains'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'between'
  | 'isBlank'
  | 'notBlank'
  | 'in'

export interface FilterCondition {
  id: string
  column: string
  operator: FilterOperator
  /** 单值操作符取值；`in` 时为数组；`between` 时与 value2 组成区间。 */
  value?: CellValue | CellValue[]
  /** between 的上界。 */
  value2?: CellValue
}

/** 一条过滤 = 同一列/多列多条件 + and/or 组合。 */
export interface Filter {
  id: string
  combinator: 'and' | 'or'
  conditions: FilterCondition[]
}

/* ---------------------------------- 转换 ---------------------------------- */

export interface SelectTransform {
  id: string
  type: 'select'
  mode: 'keep' | 'drop'
  columns: string[]
}

export interface RenameEntry {
  from: string
  to: string
}

export interface RenameTransform {
  id: string
  type: 'rename'
  renames: RenameEntry[]
}

/** 派生列：列间 + - * /、常量、concat()。安全表达式，禁止 eval。 */
export interface DerivedTransform {
  id: string
  type: 'derived'
  /** 目标列名；已存在则覆盖该列值。 */
  name: string
  expression: string
}

export interface DedupeTransform {
  id: string
  type: 'dedupe'
  /** 按键列组合去重，保留首行；空数组 = 整行去重。 */
  columns: string[]
}

export interface SortKey {
  column: string
  direction: 'asc' | 'desc'
}

export interface SortTransform {
  id: string
  type: 'sort'
  keys: SortKey[]
}

export type Transform =
  | SelectTransform
  | RenameTransform
  | DerivedTransform
  | DedupeTransform
  | SortTransform

export type TransformType = Transform['type']

/* ---------------------------------- 图表 ---------------------------------- */

export type ChartType = 'bar' | 'line' | 'scatter' | 'box' | 'pie' | 'heatmap'

export type ViewType = 'table' | ChartType

export type ChartPosition = 'top' | 'bottom' | 'left' | 'right'

export type Aggregation = 'none' | 'count' | 'sum' | 'mean' | 'median' | 'min' | 'max'

/** 映射槽位中的一个字段（字段胶囊）。 */
export interface FieldMapping {
  field: string
  aggregation?: Aggregation
  /** 自定义标签（轴标题 / 图例标签）。 */
  label?: string
  /** 轴专属设置（Bar/Line/Scatter 等）。 */
  axis?: AxisMappingOptions
}

export interface AxisMappingOptions {
  range?: 'auto' | 'manual'
  min?: number
  max?: number
  scale?: 'linear' | 'log'
  /** Line/Scatter 双 Y 轴：该系列挂左轴还是右轴。 */
  side?: 'left' | 'right'
}

/** 统计误差棒类型（1A：仅 Mean 聚合上下文可用）。 */
export type ErrorBarType = 'none' | 'sd' | 'sem'

export type RegressionModel = 'none' | 'point-to-point' | 'linear' | 'quadratic' | '4pl'

export interface RegressionConfig {
  model: RegressionModel
  /** 权重列 field；缺省等权。约定 w = 1/σ²（值越大的点对拟合影响越大）。 */
  weightsField?: string
  /** 4PL 约束。 */
  constraints?: { min?: number; max?: number }
  excludeFlagged?: boolean
  /** 4PL 是否显示渐近线。 */
  showAsymptotes?: boolean
}

/** CONFIGURE Tab 骨架：各图种映射槽位（后续切片细化校验规则）。 */
export interface ChartConfigure {
  x?: FieldMapping
  y?: FieldMapping
  series?: FieldMapping
  color?: FieldMapping
  shape?: FieldMapping
  size?: FieldMapping
  categories?: FieldMapping
  measure?: FieldMapping
  values?: FieldMapping[]
  /** Color palette id（Light/Dark/Alternate…；Heatmap 用连续色阶 id）。 */
  palette?: string
  /** 统计误差棒（1A；仅 Mean 聚合上下文生效）。 */
  errorBars?: ErrorBarType
  regression?: RegressionConfig
}

export interface LegendStyle {
  show: boolean
  position: 'top' | 'bottom' | 'left' | 'right'
  /** 系列名 → 自定义图例标签。 */
  labels?: Record<string, string>
}

/** 参考线（阈值/对照线）：渲染为灰色虚线 shape。 */
export interface ReferenceLine {
  axis: 'x' | 'y'
  /** 未填数值的行在渲染时忽略。 */
  value?: number
  label?: string
}

/** 轴显示设置（STYLE X/Y-Axis 区与 CONFIGURE 齿轮弹层共用同一份存储）。 */
export interface AxisStyleSpec {
  /** 自定义轴标题；缺省为「聚合前缀 + 字段名」。 */
  label?: string
  range?: 'auto' | 'manual'
  min?: number
  max?: number
  scale?: 'linear' | 'log'
}

/** STYLE Tab 骨架：通用样式（图种专属样式后续切片扩展）。 */
export interface ChartStyle {
  title?: string
  subtitle?: string
  width?: number
  height?: number
  margins?: { top: number; right: number; bottom: number; left: number }
  opacity?: number
  legend?: LegendStyle
  /** 系列名 → 颜色覆盖。 */
  seriesColors?: Record<string, string>
  /** 轴显示设置（标签/Range/Scale）。 */
  xAxis?: AxisStyleSpec
  yAxis?: AxisStyleSpec
  /** Line/Scatter 双 Y 轴的右轴设置。 */
  yAxisRight?: AxisStyleSpec
  /** 拟合线型（Line/Scatter 回归拟合）：默认实线。 */
  fitLineStyle?: 'solid' | 'dash'
  /** 拟合注释（方程 + R² 上屏，Line/Scatter 回归拟合）。 */
  fitAnnotation?: boolean
  /** 参考线（阈值/对照线；Pie 无轴不适用）。 */
  referenceLines?: ReferenceLine[]
  /** Bar 专属。 */
  bar?: { direction?: 'vertical' | 'horizontal'; mode?: 'grouped' | 'stacked' | 'percent'; lineWidth?: number; lineColor?: string; showValues?: boolean }
  /** Line 专属（5B：无 Line Width / Point Size / Hide Points）。 */
  line?: { facet?: 'one' | 'per-measure'; pointShape?: string; defaultColor?: string }
  /** Scatter 专属。 */
  scatter?: {
    pointSize?: number
    pointShape?: string
    jitter?: boolean
    /** Jitter 强度 0–1。 */
    jitterStrength?: number
    /** Size 度量 → 点半径映射的像素半径范围。 */
    sizeMin?: number
    sizeMax?: number
    facet?: 'one' | 'per-measure'
  }
  /** Box 专属（4B：无 Jitter）。 */
  box?: {
    /** 形态：箱线图 / 小提琴图。 */
    mode?: 'box' | 'violin'
    showPoints?: 'all' | 'outliers' | 'none'
    pointSize?: number
    pointShape?: string
    lineWidth?: number
    lineColor?: string
    fillColor?: string
  }
  /** Pie 专属。 */
  pie?: { innerRadiusPct?: number; outerRadiusPct?: number; showPercent?: boolean; hideBelowPct?: number; percentColor?: string }
  /** Heatmap 专属。 */
  heatmap?: {
    showCellValues?: boolean
    rowSort?: 'label' | 'mean'
    colSort?: 'label' | 'mean'
    clusterRows?: boolean
    clusterCols?: boolean
    /** @deprecated 旧字段：等价于 clusterRows && clusterCols。 */
    cluster?: boolean
  }
}

export interface ChartConfig {
  chartType: ChartType
  /** 表+图布局方位，默认 top（图在上、数据源在下）。 */
  position: ChartPosition
  configure: ChartConfigure
  style: ChartStyle
}

/** 套索打标（Line/Scatter），存于视图。 */
export interface RowFlag {
  rowId: string
  comment: string
}

/* ---------------------------------- 视图树 ---------------------------------- */

export interface ViewNode {
  id: string
  name: string
  type: ViewType
  filters: Filter[]
  transforms: Transform[]
  chart?: ChartConfig
  flags?: RowFlag[]
  children: ViewNode[]
}

/* ---------------------------------- 表合并 ---------------------------------- */

export type JoinType = 'left' | 'inner' | 'right' | 'full' | 'append'

export interface JoinKey {
  left: string
  right: string
}

/** combine 输入引用（供流程图连线与依赖检查）。 */
export interface CombineInputRef {
  kind: 'table' | 'view'
  tableId: string
  viewId?: string
}

export interface CombineSpec {
  joinType: JoinType
  left: CombineInputRef
  right: CombineInputRef
  keys: JoinKey[]
}

/* ---------------------------------- 步骤（流程图可编辑画布） ---------------------------------- */

/** 端口数据类型：决定拖线合法性。 */
export type PortType = 'table' | 'file' | 'chart'

/** 步骤节点的类型化端口定义。 */
export interface StepPort {
  name: string
  type: PortType
  /** 是否多输入（Union 等步骤可接 2..n 个）。 */
  multiple?: boolean
  /** 可选端口，新建节点时可不连。 */
  optional?: boolean
}

/** 步骤类型（P0 仅实现带 * 的核心步骤；其余占位）。 */
export type StepType =
  | 'upload-csv' // * 现有 CSV 导入对应的源步骤
  | 'upload-xlsx' // * Excel 导入源步骤
  | 'query-sql' // * SQL 查询导入源步骤
  | 'import-files' // 多文件源（P1）
  | 'file-to-table' // 文件转表（P1）
  | 'join' // * 合并步骤
  | 'union' // * 合并步骤
  | 'filter' // * 行过滤步骤
  | 'hide-columns' // * 列选择步骤
  | 'computed-column' // * 派生列步骤
  | 'convert-formats' // 列类型转换（P1）
  | 'find-replace' // 文本查找替换（P1）
  | 'aggregate' // 分组聚合（P1）
  | 'bin' // 数值分箱（P1）
  | 'pivot' // 透视（P2）
  | 'window' // 窗口函数（P2）
  | 'format-columns' // 显示格式（P2）
  | 'dedupe' // 去重（P1/P2）
  | 'sort' // 排序（P1/P2）
  | 'interpolation' // 标准曲线插值（P2）
  | 'custom-code' // Python Custom Code（托管 Worker）

export type StepStatus = 'pending' | 'configured' | 'running' | 'failed' | 'stale'

/** 上游输入引用：端口 → 节点输出端口。 */
export interface StepInputRef {
  port: string
  from: { nodeId: string; port: string }
}

/** 步骤节点输出产物引用。 */
export interface StepOutputRefs {
  tables: string[]
  files: string[]
  views: string[]
  /** Custom Code 等产出的独立 Plotly 图表产物 id。 */
  charts?: string[]
}

/** Custom Code / 步骤产出的独立图表（非 bar/line ViewNode.chart）。 */
export interface AnalysisChartArtifact {
  id: string
  name: string
  stepId: string
  /** Plotly figure JSON（data/layout）。 */
  plotlyJson: Record<string, unknown>
}

export interface StepNode {
  id: string
  type: StepType
  name: string
  inputs: StepInputRef[]
  /** 步骤专属配置，由各 StepDef 定义具体 shape。 */
  config: Record<string, unknown>
  status: StepStatus
  error?: string
  output: StepOutputRefs
}

/** 文件实体（P1 启用；P0 先占位以保持模型稳定）。 */
export interface AnalysisFile {
  id: string
  name: string
  sizeBytes: number
  mimeHint: string
  contentRef: string
  importedAt: string
}

/* ---------------------------------- 表 / 分析 ---------------------------------- */

export type TableSource = 'csv' | 'combine' | 'demo' | 'file' | 'step'

export interface AnalysisTable {
  id: string
  name: string
  source: TableSource
  columns: ColumnMeta[]
  rows: Row[]
  /** 表级过滤：向下作用于所有后代视图。 */
  filters: Filter[]
  views: ViewNode[]
  /** source === 'combine' 时保留输入引用（旧数据兼容）。 */
  combine?: CombineSpec
  /** source === 'step' 时指向产出该表的步骤节点。 */
  stepId?: string
}

export interface Analysis {
  id: string
  name: string
  /** ISO 字符串。 */
  createdAt: string
  updatedAt: string
  /** 所属项目代码（见 shared/org.ts mock）。 */
  project?: string
  /** 所属部门 id。 */
  department?: string
  /**
   * 单调递增版本；每次成功落盘 mutate +1。
   * Dashboard / 多端缓存与乐观锁用。旧数据缺省，加载时 normalize 为 0。
   */
  revision?: number
  tables: AnalysisTable[]
  /** 流程图节点 id → 坐标。 */
  flowchartLayout: Record<string, { x: number; y: number }>
  /** 数据加工步骤图（真相源）。 */
  steps: StepNode[]
  /**
   * 文件源占位（兼容旧模型）。
   * Custom Code 可将 BytesIO 内容以 data URL 写入 contentRef。
   */
  files: AnalysisFile[]
  /** Custom Code 等步骤产出的独立 Plotly 图表。 */
  charts?: AnalysisChartArtifact[]
  /** 旧数据迁移备份，便于回退与调试。 */
  __legacyTables?: AnalysisTable[]
}

/* ---------------------------------- 看板（与 Analysis 平级） ---------------------------------- */

export type DashboardWidgetType = 'chart' | 'table' | 'link'

export interface DashboardLayout {
  /** 网格列数，固定 12。 */
  columns: 12
  /** 行高基准（px），用于换算 widget.h。 */
  rowHeight: number
  gap: number
}

export interface DashboardWidgetRef {
  analysisId: string
  tableId: string
  /** 缺省 = 源表只读。 */
  viewId?: string
}

export interface DashboardWidgetGrid {
  x: number
  y: number
  w: number
  h: number
}

export interface DashboardWidget {
  id: string
  type: DashboardWidgetType
  /** chart / table：指向 Insight 内表/视图。 */
  ref?: DashboardWidgetRef
  /** link：可在看板内预览的外部 http(s) 链接。 */
  url?: string
  grid: DashboardWidgetGrid
  /** 看板层展示名；默认用源 ViewNode.name / 表名 / 链接主机名。 */
  title?: string
}

/** 顶层看板文档（与 Analysis 平级持久化）。 */
export interface Dashboard {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  /** 所属项目代码（见 shared/org.ts mock）。 */
  project?: string
  /** 所属部门 id。 */
  department?: string
  layout: DashboardLayout
  widgets: DashboardWidget[]
}
