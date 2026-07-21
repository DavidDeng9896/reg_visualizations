/**
 * 配置面板 draft 上下文：ChartConfigPanel provide，各槽位/区段 inject。
 * draft 为 reactive 深拷贝，所有编辑就地修改 + touch() 触发 150ms 防抖预览。
 */
import type { ComputedRef, InjectionKey, Ref } from 'vue'
import type { ChartConfig, ChartType, ColumnMeta } from '../../../shared/types'
import type { ChartTypeDefinition, MappingError } from '../types'

export interface ChartDraftContext {
  def: ComputedRef<ChartTypeDefinition>
  /** 编辑中的草稿（就地修改）。 */
  draft: ChartConfig
  columns: ComputedRef<ColumnMeta[]>
  /** 校验错误（Save 尝试后高亮槽位）。 */
  errors: ComputedRef<MappingError[]>
  saveAttempted: Ref<boolean>
  /** 最近构建的系列名（STYLE 逐系列取色）。 */
  seriesNames: ComputedRef<string[]>
  /** 默认标题（视图名；Title 刷新恢复用）。 */
  defaultTitle: ComputedRef<string>
  /** 标脏 + 触发防抖预览。 */
  touch: () => void
  /** 草稿是否已修改（dirty dot / Save 亮起）。 */
  dirty: ComputedRef<boolean>
  /** 图种互切（11A）。 */
  changeType: (t: ChartType) => void
}

export const CHART_DRAFT_CONTEXT: InjectionKey<ChartDraftContext> = Symbol('chart-draft-context')
