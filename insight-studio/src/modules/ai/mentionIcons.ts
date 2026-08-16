import type { Analysis, ViewNode } from '../../shared/types'
import type { IconName } from '../../ui'
import type { MentionTarget } from './context'
import type { AttachmentKind } from './attachments'
import { iconForViewType } from '../../shared/viewIcons'

export { VIEW_ICON, iconForViewType } from '../../shared/viewIcons'

/** 附件 kind → 图标。 */
export function attachmentKindIcon(kind: AttachmentKind | string): IconName {
  switch (kind) {
    case 'csv':
    case 'excel':
      return 'table'
    case 'text':
    case 'pdf':
      return 'file-text'
    case 'image':
      return 'image'
    default:
      return 'file'
  }
}

function findView(views: ViewNode[], viewId: string): ViewNode | undefined {
  for (const v of views) {
    if (v.id === viewId) return v
    const nested = findView(v.children, viewId)
    if (nested) return nested
  }
  return undefined
}

/** @ 引用 chip / 菜单项图标（可传入已知 viewType，避免再查树）。 */
export function iconForMention(target: MentionTarget, viewType?: string): IconName {
  if (target.kind === 'analysis') return 'database'
  if (target.kind === 'table') return 'table'
  if (target.kind === 'attachment') return attachmentKindIcon(target.fileKind ?? 'other')
  return iconForViewType(viewType)
}

/** @ 引用 chip / 菜单项图标（从 analysis 解析视图类型）。 */
export function mentionIcon(target: MentionTarget, analysis: Analysis | null): IconName {
  if (target.kind === 'analysis' || target.kind === 'table' || target.kind === 'attachment') {
    return iconForMention(target)
  }
  const table = analysis?.tables.find((t) => t.id === target.tableId)
  const view = table ? findView(table.views, target.viewId) : undefined
  return iconForMention(target, view?.type)
}

/** @ 引用展示名。 */
export function mentionName(target: MentionTarget, analysis: Analysis | null): string {
  if (target.kind === 'analysis') return analysis?.name ?? '分析'
  if (target.kind === 'table') return analysis?.tables.find((t) => t.id === target.tableId)?.name ?? '表'
  if (target.kind === 'attachment') return target.name?.trim() || '附件'
  const table = analysis?.tables.find((t) => t.id === target.tableId)
  return table ? findView(table.views, target.viewId)?.name ?? '视图' : '视图'
}
