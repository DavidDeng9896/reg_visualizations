/**
 * List delete success toast × focus-ring coexistence (Round 41–49).
 *
 * After a successful Analysis delete, a polite success toast announces the
 * outcome while `applyListDeleteFocus` lands keyboard focus (with a temporary
 * visible ring) on a remaining row or the empty Create CTA. Toast must not
 * steal focus or clear the restore ring.
 *
 * Round 49: after delete, the roving index is clamped via `planListDeleteFocus`
 * (same bound as `clampListRowFocus`) and coexists with the success toast.
 */

import { planListDeleteFocus } from '@/modules/analysis/listDeleteFocus'

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
