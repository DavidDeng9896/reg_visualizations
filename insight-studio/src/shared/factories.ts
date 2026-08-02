import type {
  Analysis,
  AnalysisTable,
  ChartConfig,
  ChartType,
  ColumnMeta,
  Dashboard,
  DashboardLayout,
  DashboardWidget,
  DashboardWidgetType,
  Filter,
  FilterCondition,
  FilterOperator,
  Row,
  Transform,
  ViewNode,
  ViewType,
} from './types'
import { ROW_ID_FIELD } from './types'
import { uuid } from './id'
import { nowIso } from './datetime'
import { markRaw } from 'vue'

/** 领域对象工厂。 */

/**
 * 封印行数据，避免 Pinia/Vue 对上万单元格做深度响应式代理（主线程卡顿主因之一）。
 * 行内容变更后需依赖 Analysis.updatedAt 等显式信号刷新派生计算。
 */
export function sealRows(rows: Row[]): Row[] {
  for (let i = 0; i < rows.length; i++) {
    rows[i] = markRaw(rows[i])
  }
  return markRaw(rows)
}

/** 加载/导入后封印分析内所有表的行数组。 */
export function sealAnalysisRows(analysis: Analysis): Analysis {
  for (const t of analysis.tables) {
    t.rows = sealRows(t.rows)
  }
  return analysis
}

export function createEmptyAnalysis(name: string, org?: { project?: string; department?: string }): Analysis {
  const now = nowIso()
  return {
    id: uuid(),
    name,
    createdAt: now,
    updatedAt: now,
    project: org?.project,
    department: org?.department,
    revision: 0,
    tables: [],
    flowchartLayout: {},
    steps: [],
    files: [],
  }
}

export const DEFAULT_DASHBOARD_LAYOUT: DashboardLayout = {
  columns: 12,
  rowHeight: 40,
  gap: 8,
}

export function createDashboard(name: string, org?: { project?: string; department?: string }): Dashboard {
  const now = nowIso()
  return {
    id: uuid(),
    name: name.trim() || '未命名看板',
    createdAt: now,
    updatedAt: now,
    project: org?.project,
    department: org?.department,
    layout: { ...DEFAULT_DASHBOARD_LAYOUT },
    widgets: [],
  }
}

export function createDashboardWidget(
  type: Exclude<DashboardWidgetType, 'link'>,
  ref: NonNullable<DashboardWidget['ref']>,
  grid?: Partial<DashboardWidget['grid']>,
): DashboardWidget {
  const defaults =
    type === 'chart'
      ? { x: 0, y: 0, w: 6, h: 8 }
      : { x: 0, y: 0, w: 12, h: 10 }
  return {
    id: uuid(),
    type,
    ref: { ...ref },
    grid: { ...defaults, ...grid },
  }
}

/** 规范化外部链接；非法则返回 null。 */
export function normalizeExternalUrl(raw: string): string | null {
  const s = raw.trim()
  if (!s) return null
  try {
    const withProto = /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(s) ? s : `https://${s.replace(/^\/\//, '')}`
    const u = new URL(withProto)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null
    return u.toString()
  } catch {
    return null
  }
}

export function createLinkWidget(
  url: string,
  opts?: { title?: string; grid?: Partial<DashboardWidget['grid']> },
): DashboardWidget {
  const normalized = normalizeExternalUrl(url)
  if (!normalized) throw new Error('无效的外部链接')
  let host = normalized
  try {
    host = new URL(normalized).hostname
  } catch {
    /* ignore */
  }
  return {
    id: uuid(),
    type: 'link',
    url: normalized,
    title: opts?.title?.trim() || host,
    grid: { x: 0, y: 0, w: 6, h: 10, ...opts?.grid },
  }
}

export function createTable(
  name: string,
  columns: ColumnMeta[],
  rows: Row[],
  source: AnalysisTable['source'] = 'csv',
): AnalysisTable {
  return { id: uuid(), name, source, columns, rows: sealRows(ensureRowIds(rows)), filters: [], views: [] }
}

export const VIEW_TYPE_LABELS: Record<ViewType, string> = {
  table: 'Table',
  bar: 'Bar chart',
  line: 'Line chart',
  scatter: 'Scatter plot',
  box: 'Box plot',
  pie: 'Pie chart',
  heatmap: 'Heatmap',
}

export function defaultViewName(type: ViewType, existing: ViewNode[] = []): string {
  const base = VIEW_TYPE_LABELS[type]
  const names = new Set<string>()
  const walk = (list: ViewNode[]) => {
    for (const v of list) {
      names.add(v.name)
      walk(v.children)
    }
  }
  walk(existing)
  if (!names.has(base)) return base
  let i = 2
  while (names.has(`${base} ${i}`)) i += 1
  return `${base} ${i}`
}

export function createViewNode(type: ViewType, name?: string): ViewNode {
  const node: ViewNode = {
    id: uuid(),
    name: name ?? defaultViewName(type),
    type,
    filters: [],
    transforms: [],
    children: [],
  }
  if (type !== 'table') node.chart = createChartConfig(type)
  return node
}

export function createChartConfig(chartType: ChartType): ChartConfig {
  return {
    chartType,
    position: 'bottom',
    configure: {
      palette: chartType === 'heatmap' ? 'blues' : 'light',
      errorBars: 'none',
      regression:
        chartType === 'line' || chartType === 'scatter'
          ? { model: 'none', excludeFlagged: false, showAsymptotes: false }
          : undefined,
    },
    style: {
      opacity: 1,
      legend: { show: true, position: chartType === 'heatmap' ? 'right' : 'top' },
      ...(chartType === 'bar'
        ? { bar: { direction: 'vertical' as const, mode: 'grouped' as const, lineWidth: 0, lineColor: '#1d2939' } }
        : {}),
      ...(chartType === 'line'
        ? { line: { facet: 'one' as const, pointShape: 'circle' } }
        : {}),
      ...(chartType === 'scatter'
        ? {
            scatter: {
              pointSize: 8,
              pointShape: 'circle',
              jitter: false,
              jitterStrength: 0.4,
              sizeMin: 4,
              sizeMax: 24,
              facet: 'one' as const,
            },
          }
        : {}),
      ...(chartType === 'box' ? { box: { showPoints: 'outliers' as const, pointSize: 5, lineWidth: 1.5 } } : {}),
      ...(chartType === 'pie'
        ? { pie: { innerRadiusPct: 0, outerRadiusPct: 72, showPercent: true, hideBelowPct: 5, percentColor: '#ffffff' } }
        : {}),
      ...(chartType === 'heatmap'
        ? { heatmap: { showCellValues: false, rowSort: 'label' as const, colSort: 'label' as const, clusterRows: false, clusterCols: false } }
        : {}),
    },
  }
}

export function createFilter(column: string, operator: FilterOperator = 'eq'): Filter {
  return { id: uuid(), combinator: 'and', conditions: [createCondition(column, operator)] }
}

export function createCondition(column: string, operator: FilterOperator = 'eq'): FilterCondition {
  return { id: uuid(), column, operator }
}

/** 为行补齐稳定行 id（就地写入 ROW_ID_FIELD；已有则保留）。 */
export function ensureRowIds(rows: Row[]): Row[] {
  for (const row of rows) {
    if (row[ROW_ID_FIELD] == null) row[ROW_ID_FIELD] = uuid()
  }
  return rows
}

let transformSeq = 0
export function createTransform<T extends Transform['type']>(
  type: T,
  init: Omit<Extract<Transform, { type: T }>, 'id' | 'type'>,
): Extract<Transform, { type: T }> {
  transformSeq += 1
  return { id: uuid(), type, ...init } as Extract<Transform, { type: T }>
}
