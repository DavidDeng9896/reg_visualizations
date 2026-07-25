/**
 * 步骤注册表（Step Registry）。
 * 所有流程图可编辑步骤统一在此注册：metadata、端口、默认配置。
 * 具体执行/预览逻辑在 `exec/` 目录中，避免循环依赖与巨型 if-else。
 */
import type { Filter, JoinType, PortType, SelectTransform, StepOutputRefs, StepPort, StepType } from '../../shared/types'

/** 步骤配置校验结果。 */
export interface ValidationResult {
  ok: boolean
  errors: string[]
}

/** 步骤元数据定义。 */
export interface StepDef {
  type: StepType
  label: string
  /** 分类，用于 Add step 目录分组。 */
  category: 'source' | 'combine' | 'transform' | 'statistics' | 'output'
  description: string
  /** 输入端口定义。 */
  inputs: StepPort[]
  /** 输出端口定义（目前仅支持单表/单文件/单图表，后续扩展）。 */
  outputs: StepPort[]
  /** 默认配置对象。 */
  defaultConfig: Record<string, unknown>
}

/* --------------------------------- 注册表 --------------------------------- */

const STEP_DEFS: StepDef[] = [
  /* ---------- source ---------- */
  {
    type: 'upload-csv',
    label: 'Upload CSV',
    category: 'source',
    description: 'Upload a CSV file to create a table.',
    inputs: [],
    outputs: [{ name: 'Output dataset', type: 'table' }],
    defaultConfig: { tableName: 'Untitled table' },
  },
  {
    type: 'import-files',
    label: 'Import files',
    category: 'source',
    description: 'Import multiple files as a single source step.',
    inputs: [],
    outputs: [{ name: 'Output files', type: 'file', multiple: true }],
    defaultConfig: { baseName: '' },
  },
  {
    type: 'file-to-table',
    label: 'Convert file to table',
    category: 'source',
    description: 'Parse files into a table with delimiter and locale options.',
    inputs: [{ name: 'Input files', type: 'file', multiple: true }],
    outputs: [{ name: 'Output dataset', type: 'table' }],
    defaultConfig: { tableName: 'Untitled table', delimiter: 'comma', dateLocale: 'en-US' },
  },

  /* ---------- combine ---------- */
  {
    type: 'join',
    label: 'Join tables',
    category: 'combine',
    description: 'Join two tables by selected keys.',
    inputs: [
      { name: 'Left table', type: 'table' },
      { name: 'Right table', type: 'table' },
    ],
    outputs: [{ name: 'Output dataset', type: 'table' }],
    defaultConfig: {
      joinType: 'left' as JoinType,
      keys: [] as { left: string; right: string }[],
      suffixes: ['_x', '_y'],
    },
  },
  {
    type: 'union',
    label: 'Union tables',
    category: 'combine',
    description: 'Append multiple tables by column name or position.',
    inputs: [{ name: 'Input tables', type: 'table', multiple: true }],
    outputs: [{ name: 'Output dataset', type: 'table' }],
    defaultConfig: {
      alignBy: 'name' as 'name' | 'position',
      fillNull: true,
      addSourceColumn: false,
    },
  },

  /* ---------- transform ---------- */
  {
    type: 'filter',
    label: 'Filter table',
    category: 'transform',
    description: 'Filter rows by column conditions.',
    inputs: [{ name: 'Input dataset', type: 'table' }],
    outputs: [{ name: 'Output dataset', type: 'table' }],
    defaultConfig: { filters: [] as Filter[] },
  },
  {
    type: 'hide-columns',
    label: 'Hide columns',
    category: 'transform',
    description: 'Keep or drop selected columns.',
    inputs: [{ name: 'Input dataset', type: 'table' }],
    outputs: [{ name: 'Output dataset', type: 'table' }],
    defaultConfig: { mode: 'drop' as SelectTransform['mode'], columns: [] as string[] },
  },
  {
    type: 'computed-column',
    label: 'Add computed column',
    category: 'transform',
    description: 'Create a new column from a safe expression.',
    inputs: [{ name: 'Input dataset', type: 'table' }],
    outputs: [{ name: 'Output dataset', type: 'table' }],
    defaultConfig: { name: '', expression: '' },
  },
  {
    type: 'convert-formats',
    label: 'Convert column formats',
    category: 'transform',
    description: 'Convert columns between text, number, boolean, date and datetime.',
    inputs: [{ name: 'Input dataset', type: 'table' }],
    outputs: [{ name: 'Output dataset', type: 'table' }],
    defaultConfig: { conversions: [] as { column: string; targetType: string; onError: 'null' | 'keep' | 'error' }[] },
  },
  {
    type: 'find-replace',
    label: 'Find and replace text',
    category: 'transform',
    description: 'Replace text within a column.',
    inputs: [{ name: 'Input dataset', type: 'table' }],
    outputs: [{ name: 'Output dataset', type: 'table' }],
    defaultConfig: { column: '', search: '', replace: '', regex: false, caseSensitive: false },
  },
  {
    type: 'aggregate',
    label: 'Aggregate table',
    category: 'transform',
    description: 'Group by columns and aggregate values.',
    inputs: [{ name: 'Input dataset', type: 'table' }],
    outputs: [{ name: 'Output dataset', type: 'table' }],
    defaultConfig: { groupBy: [] as string[], aggregations: [] as { column: string; func: string; alias: string }[] },
  },
  {
    type: 'bin',
    label: 'Bin data',
    category: 'transform',
    description: 'Bin numeric data into equal-width or custom bins.',
    inputs: [{ name: 'Input dataset', type: 'table' }],
    outputs: [{ name: 'Output dataset', type: 'table' }],
    defaultConfig: { column: '', method: 'equal-width' as 'equal-width' | 'custom', bins: 10, boundaries: [] as number[], outputColumn: '' },
  },
  {
    type: 'pivot',
    label: 'Pivot table',
    category: 'transform',
    description: 'Pivot rows into columns.',
    inputs: [{ name: 'Input dataset', type: 'table' }],
    outputs: [{ name: 'Output dataset', type: 'table' }],
    defaultConfig: { rowColumns: [] as string[], pivotColumn: '', valueColumn: '', aggregation: 'sum' },
  },
  {
    type: 'window',
    label: 'Add window functions',
    category: 'transform',
    description: 'Add ranking, cumulative or moving window columns.',
    inputs: [{ name: 'Input dataset', type: 'table' }],
    outputs: [{ name: 'Output dataset', type: 'table' }],
    defaultConfig: {
      function: 'row_number' as 'row_number' | 'rank' | 'dense_rank' | 'cumsum' | 'moving_avg' | 'pct_of_total',
      partitionBy: [] as string[],
      orderBy: [] as { column: string; direction: 'asc' | 'desc' }[],
      windowSize: 3,
      outputColumn: '',
    },
  },
  {
    type: 'format-columns',
    label: 'Format columns',
    category: 'transform',
    description: 'Control display formatting without changing underlying values.',
    inputs: [{ name: 'Input dataset', type: 'table' }],
    outputs: [{ name: 'Output dataset', type: 'table' }],
    defaultConfig: { formats: [] as { column: string; format: string; decimals?: number }[] },
  },
  {
    type: 'dedupe',
    label: 'Deduplicate rows',
    category: 'transform',
    description: 'Remove duplicate rows by selected columns.',
    inputs: [{ name: 'Input dataset', type: 'table' }],
    outputs: [{ name: 'Output dataset', type: 'table' }],
    defaultConfig: { columns: [] as string[] },
  },
  {
    type: 'sort',
    label: 'Sort rows',
    category: 'transform',
    description: 'Sort rows by multiple columns.',
    inputs: [{ name: 'Input dataset', type: 'table' }],
    outputs: [{ name: 'Output dataset', type: 'table' }],
    defaultConfig: { keys: [] as { column: string; direction: 'asc' | 'desc' }[] },
  },

  /* ---------- statistics ---------- */
  {
    type: 'interpolation',
    label: 'Calculate interpolation',
    category: 'statistics',
    description: 'Interpolate unknown samples from a standard curve.',
    inputs: [{ name: 'Input dataset', type: 'table' }],
    outputs: [
      { name: 'Output dataset', type: 'table' },
      { name: 'Output chart', type: 'chart' },
    ],
    defaultConfig: {
      xColumn: '',
      yColumn: '',
      interpolateColumn: '',
      model: 'linear' as 'linear' | 'quadratic' | '4pl',
    },
  },
]

const STEP_DEF_MAP = new Map<StepType, StepDef>(STEP_DEFS.map((d) => [d.type, d]))

export function getStepDef(type: StepType): StepDef {
  const def = STEP_DEF_MAP.get(type)
  if (!def) throw new Error(`未注册的步骤类型: ${type}`)
  return def
}

export function listStepDefs(): StepDef[] {
  return STEP_DEFS.slice()
}

export function stepDefsByCategory(): Record<StepDef['category'], StepDef[]> {
  const groups: Record<StepDef['category'], StepDef[]> = {
    source: [],
    combine: [],
    transform: [],
    statistics: [],
    output: [],
  }
  for (const def of STEP_DEFS) {
    groups[def.category].push(def)
  }
  return groups
}

/** 按名称/描述模糊搜索步骤。 */
export function searchStepDefs(query: string): StepDef[] {
  const q = query.trim().toLowerCase()
  if (!q) return STEP_DEFS.slice()
  return STEP_DEFS.filter((d) => d.label.toLowerCase().includes(q) || d.description.toLowerCase().includes(q))
}

/** 端口类型图标名（供画布/目录使用）。 */
export function portTypeIcon(type: PortType): string {
  switch (type) {
    case 'table':
      return 'database'
    case 'file':
      return 'upload'
    case 'chart':
      return 'bar'
  }
}

/** 创建空的 StepOutputRefs。 */
export function emptyStepOutput(): StepOutputRefs {
  return { tables: [], files: [], views: [] }
}
