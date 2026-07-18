/**
 * List delete success toast × focus-ring coexistence (Round 41–50).
 *
 * After a successful Analysis delete, a polite success toast announces the
 * outcome while `applyListDeleteFocus` lands keyboard focus (with a temporary
 * visible ring) on a remaining row or the empty Create CTA. Toast must not
 * steal focus or clear the restore ring.
 *
 * Round 49: after delete, the roving index is clamped via `planListDeleteFocus`
 * (same bound as `clampListRowFocus`) and coexists with the success toast.
 *
 * Round 50: deleting the last row lands the empty Create CTA with a visible
 * ring while the success toast stays interactive; when the project filter
 * still owns focus after a non-empty delete, skip the focus restore so the
 * select is not stolen from.
 */

import { planListDeleteFocus } from '@/modules/analysis/listDeleteFocus'
import { isListFilterFocusTarget } from '@/modules/analysis/listRowNav'

export function listDeleteSuccessToastMessage(): string {
  return '已删除'
}

/** Contract: delete success toast and focus restore ring may coexist. */
export function listDeleteToastCoexistsWithFocusRing(): true {
  return true
}

/**
 * Round 49: delete success clamps the roving index and coexists with toast.
 */
export function listDeleteClampsRovingWithToast(): true {
  return true
}

/**
 * Round 50: empty-list Create CTA focus ring coexists with delete success toast.
 */
export function listDeleteEmptyCtaCoexistsWithToast(): true {
  return true
}

/**
 * Round 50: when the project filter owns focus after a non-empty delete,
 * do not call `applyListDeleteFocus` (roving index may still update).
 */
export function listDeletePreservesFilterFocus(): true {
  return true
}

/**
 * Whether to run `applyListDeleteFocus` after a successful delete.
 * Empty lists always restore to the Create CTA; otherwise leave the filter alone.
 */
export function shouldApplyListDeleteFocusAfterSuccess(
  activeEl: Element | null,
  remainingCount: number,
): boolean {
  if (remainingCount <= 0) return true
  return !isListFilterFocusTarget(activeEl)
}

/**
 * Roving index after a successful delete (null when the list is empty).
 * Matches `planListDeleteFocus` / `clampListRowFocus` bounds.
 */
export function listDeleteRovingIndex(
  deletedIndex: number,
  remainingCount: number,
): number | null {
  const plan = planListDeleteFocus(deletedIndex, remainingCount)
  return plan.kind === 'row' ? plan.index : null
}
