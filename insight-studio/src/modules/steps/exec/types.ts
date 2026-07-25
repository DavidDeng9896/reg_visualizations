import type { Analysis, AnalysisTable, ColumnMeta, Row, StepNode } from '../../../shared/types'

export interface StepExecCtx {
  analysis: Analysis
  step: StepNode
  inputs: Record<string, AnalysisTable | AnalysisTable[]>
}

export interface StepExecResult {
  status: 'configured' | 'failed'
  error?: string
  outputTables?: AnalysisTable[]
}

export interface StepPreviewResult {
  columns: ColumnMeta[]
  rows: Row[]
  totalRows: number
  error?: string
  /** 附加统计行（如 join 的匹配/未匹配行数），在预览头部展示。 */
  stats?: { label: string; value: string }[]
}
