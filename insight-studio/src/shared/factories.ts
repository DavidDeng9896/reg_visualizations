import type {
  Analysis,
  AnalysisTable,
  ChartConfig,
  ChartType,
  ColumnMeta,
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

/** 领域对象工厂。 */

export function createEmptyAnalysis(name: string): Analysis {
  const now = nowIso()
  return { id: uuid(), name, createdAt: now, updatedAt: now, tables: [], flowchartLayout: {} }
}

export function createTable(
  name: string,
  columns: ColumnMeta[],
  rows: Row[],
  source: AnalysisTable['source'] = 'csv',
): AnalysisTable {
  return { id: uuid(), name, source, columns, rows, filters: [], views: [] }
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
