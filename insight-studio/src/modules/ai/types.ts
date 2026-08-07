/** AI 助手共享类型：产物引用。 */

export type ArtifactKind = 'analysis' | 'table' | 'view' | 'dashboard' | 'step' | 'report'

export interface Artifact {
  kind: ArtifactKind
  /** 展示名。 */
  name: string
  analysisId?: string
  tableId?: string
  viewId?: string
  dashboardId?: string
  stepId?: string
  /** 视图类型（view 产物用于小图标）。 */
  viewType?: string
}
