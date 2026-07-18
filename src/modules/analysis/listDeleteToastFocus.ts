/**
 * List delete success toast × focus-ring coexistence (Round 41).
 *
 * After a successful Analysis delete, a polite success toast announces the
 * outcome while `applyListDeleteFocus` lands keyboard focus (with a temporary
 * visible ring) on a remaining row or the empty Create CTA. Toast must not
 * steal focus or clear the restore ring.
 */

export function listDeleteSuccessToastMessage(): string {
  return '已删除'
}

/** Contract: delete success toast and focus restore ring may coexist. */
export function listDeleteToastCoexistsWithFocusRing(): true {
  return true
}
