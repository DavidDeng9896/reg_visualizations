import type { IconName } from '../../ui'
import type { MentionTarget } from './context'
import { iconForViewType } from '../../shared/viewIcons'

export { VIEW_ICON, iconForViewType } from '../../shared/viewIcons'

export function iconForMention(
  target: MentionTarget,
  viewType?: string,
): IconName {
  if (target.kind === 'analysis') return 'database'
  if (target.kind === 'table') return 'table'
  return iconForViewType(viewType)
}
