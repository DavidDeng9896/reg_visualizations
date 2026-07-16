import type { ChartConfigure, ChartConfig, TableColumn, ViewType } from '@/shared/types/analysis'

type ColType = TableColumn['dataType']

function colsOf(columns: TableColumn[], type: ColType | ColType[]) {
  const types = Array.isArray(type) ? type : [type]
  return columns.filter((c) => types.includes(c.dataType))
}

/** Keep previous field only when it still exists and matches allowed types. */
function pickCompatible(
  field: string | undefined,
  columns: TableColumn[],
  allowed: ColType[] | null,
  fallback?: TableColumn,
): string | undefined {
  if (field) {
    const col = columns.find((c) => c.field === field)
    if (col && (allowed == null || allowed.includes(col.dataType))) return field
  }
  return fallback?.field
}

/** Infer sensible CONFIGURE mappings so new charts are immediately usable. */
export function guessConfigure(viewType: ViewType, columns: TableColumn[], prev?: ChartConfigure): ChartConfigure {
  const numbers = colsOf(columns, 'number')
  const cats = colsOf(columns, ['string', 'boolean', 'date', 'datetime'])
  const all = columns
  const catTypes: ColType[] = ['string', 'boolean', 'date', 'datetime']
  const numTypes: ColType[] = ['number']

  const base: ChartConfigure = {
    aggregation: prev?.aggregation || 'mean',
    errorBars: prev?.errorBars || 'none',
    fitModel: prev?.fitModel || 'none',
    fitConstraints: prev?.fitConstraints,
    colorPalette: prev?.colorPalette || 'light',
    orientation: prev?.orientation || 'vertical',
    stacked: prev?.stacked || false,
    excludeFlagged: prev?.excludeFlagged || false,
    xScale: prev?.xScale || 'linear',
    yScale: prev?.yScale || 'linear',
    fitThroughOrigin: prev?.fitThroughOrigin,
  }

  if (viewType === 'table') return base

  if (viewType === 'bar' || viewType === 'box') {
    return {
      ...base,
      xField: pickCompatible(prev?.xField, all, catTypes, cats[0] || all[0]),
      yField: pickCompatible(prev?.yField, all, numTypes, numbers[0] || all[1] || all[0]),
      seriesField: pickCompatible(prev?.seriesField, all, catTypes, cats[1]),
      aggregation: viewType === 'box' ? 'mean' : base.aggregation,
    }
  }

  if (viewType === 'line' || viewType === 'scatter') {
    // Must be numeric axes — do not keep a categorical X/Y from bar/box.
    const x = pickCompatible(prev?.xField, all, numTypes, numbers[0] || all[0])
    const yCandidates = numbers.filter((c) => c.field !== x)
    let y = pickCompatible(prev?.yField, all, numTypes, yCandidates[0] || numbers[0] || all[1] || all[0])
    if (y && y === x) {
      y = yCandidates[0]?.field || numbers.find((c) => c.field !== x)?.field || y
    }
    return {
      ...base,
      xField: x,
      yField: y,
      seriesField: pickCompatible(prev?.seriesField || prev?.colorField, all, catTypes, cats[0]),
      colorField: pickCompatible(prev?.colorField, all, catTypes, cats[0]),
      fitModel: prev?.fitModel && prev.fitModel !== 'none' ? prev.fitModel : 'none',
    }
  }

  if (viewType === 'pie') {
    const measure = pickCompatible(
      prev?.measureField || prev?.yField,
      all,
      numTypes,
      numbers[0],
    )
    return {
      ...base,
      categoriesField: pickCompatible(
        prev?.categoriesField || prev?.xField,
        all,
        catTypes,
        cats[0] || all[0],
      ),
      measureField: measure,
      aggregation: measure ? base.aggregation : 'count',
    }
  }

  if (viewType === 'heatmap') {
    const row = pickCompatible(
      prev?.heatmapRowField || prev?.yField,
      all,
      catTypes,
      cats[0] || all[0],
    )
    const col = pickCompatible(
      prev?.heatmapColField || prev?.xField,
      all,
      null,
      cats.find((c) => c.field !== row) || numbers[0] || all[1] || all[0],
    )
    const val = pickCompatible(
      prev?.heatmapValueField || prev?.yField,
      all,
      numTypes,
      numbers[0] || all[2] || all[0],
    )
    return {
      ...base,
      heatmapRowField: row,
      heatmapColField: col,
      heatmapValueField: val,
      xField: col,
      yField: row,
    }
  }

  return base
}

export function withGuessedConfig(
  viewType: ViewType,
  columns: TableColumn[],
  config: ChartConfig,
): ChartConfig {
  return {
    ...config,
    configure: guessConfigure(viewType, columns, config.configure),
  }
}

export function missingRequiredFields(viewType: ViewType, cfg: ChartConfigure): string[] {
  const miss: string[] = []
  if (viewType === 'table') return miss
  if (viewType === 'bar' || viewType === 'box' || viewType === 'line' || viewType === 'scatter') {
    if (!cfg.xField) miss.push('X')
    if (!cfg.yField) miss.push('Y')
  }
  if (viewType === 'pie' && !cfg.categoriesField) miss.push('Categories')
  if (viewType === 'heatmap') {
    if (!cfg.heatmapRowField) miss.push('Heatmap Row')
    if (!cfg.heatmapColField) miss.push('Heatmap Col')
    if (!cfg.heatmapValueField) miss.push('Heatmap Value')
  }
  return miss
}
