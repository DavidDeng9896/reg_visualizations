/**
 * List-row delete confirm → focus restore (Round 40).
 *
 * Native confirm restores focus to the Delete control, but after a successful
 * remove that control (and its row) unmount. Land focus on a remaining row or
 * the empty-list Create CTA with a temporary visible ring.
 */

import { restoreFocusEl } from '@/shared/ui/focusRestore'
import { createHeaderTriggerSelector } from '@/modules/analysis/createAnalysisHandoff'

export type ListDeleteFocusPlan =
  | { kind: 'row'; index: number }
  | { kind: 'empty-create' }

/**
 * After deleting the row at `deletedIndex`, given `remainingCount` rows left,
 * choose where keyboard focus should land.
 */
export function planListDeleteFocus(
  deletedIndex: number,
  remainingCount: number,
): ListDeleteFocusPlan {
  if (remainingCount <= 0) return { kind: 'empty-create' }
  const safeIndex = deletedIndex < 0 ? 0 : deletedIndex
  return { kind: 'row', index: Math.min(safeIndex, remainingCount - 1) }
}

/** 1-based nth-child selector for a remaining analysis table row. */
export function listDeleteRowSelector(index: number): string {
  return `.analysis-table tbody tr:nth-child(${index + 1})`
}

export function listDeleteEmptyCreateSelector(): string {
  return '.empty-list .empty-cta.btn-primary.create-trigger'
}

/**
 * Apply the planned focus restore with a visible ring so keyboard users see
 * the landing control after the confirm dialog closes.
 */
export function applyListDeleteFocus(
  plan: ListDeleteFocusPlan,
  doc: Document = document,
): void {
  let el: HTMLElement | null = null
  if (plan.kind === 'row') {
    const found = doc.querySelector(listDeleteRowSelector(plan.index))
    el = found instanceof HTMLElement ? found : null
  } else {
    const found = doc.querySelector(listDeleteEmptyCreateSelector())
    el = found instanceof HTMLElement ? found : null
  }
  restoreFocusEl(el, () => {
    const header = doc.querySelector(createHeaderTriggerSelector())
    return header instanceof HTMLElement ? header : null
  }, { visibleRing: true })
}
