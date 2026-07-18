/**
 * Analysis list chrome focus order (Round 42).
 *
 * Project filter sits above the table in the DOM so Tab reaches it before the
 * roving row group. Arrow/Home/End/Delete stay inside rows; they never steal
 * the filter select.
 */

export function listFilterBeforeRows(): true {
  return true
}

export function listChromeFocusOrder(): ReadonlyArray<'filter' | 'rows'> {
  return ['filter', 'rows']
}

export function listFilterSelector(): string {
  return '[data-ia-list-filter]'
}

export function listRowsSelector(): string {
  return '[data-ia-list-row]'
}
