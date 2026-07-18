/**
 * Analysis list chrome focus order (Round 42–43).
 *
 * Project filter sits above the table in the DOM so Tab reaches it before the
 * roving row group. Arrow/Home/End/Delete stay inside rows; they never steal
 * the filter select.
 *
 * Round 43: filter `aria-controls` points at the list landmark (table or empty
 * region) so AT users know which region the project filter affects.
 */

import { listEmptyRegionAttrs, listMainRegionAttrs } from '@/modules/analysis/listEmpty'

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

/** Round 43: filter declares aria-controls → list landmark. */
export function listFilterControlsTable(): true {
  return true
}

/** Match skip-link targets: main table while loading / with rows; empty region otherwise. */
export function listFilterAriaControls(opts: {
  ready: boolean
  hasRows: boolean
}): string {
  if (!opts.ready || opts.hasRows) return listMainRegionAttrs().id
  return listEmptyRegionAttrs().id
}
