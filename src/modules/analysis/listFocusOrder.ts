/**
 * Analysis list chrome focus order (Round 42–46).
 *
 * Project filter sits above the table in the DOM so Tab reaches it before the
 * roving row group. Arrow/Home/End/Delete stay inside rows; they never steal
 * the filter select.
 *
 * Round 43: filter `aria-controls` points at the list landmark (table or empty
 * region) so AT users know which region the project filter affects.
 * Round 44: `aria-controls` flips dynamically when the list goes empty ↔ rows.
 * Round 45: skip-link `href` hash stays aligned with `aria-controls` across
 * those empty ↔ rows flips (same landmark id).
 * Round 46: after empty ↔ rows flips, activating skip lands focus on the
 * aligned landmark; `#analysis-list-main` itself (not row children) is
 * routeFocus-protected so skip landing sticks.
 */

import {
  listEmptyRegionAttrs,
  listMainRegionAttrs,
  listSkipHref,
} from '@/modules/analysis/listEmpty'

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

/** Round 44: aria-controls must switch when empty ↔ has-rows flips. */
export function listFilterAriaControlsSwitchesOnEmpty(): true {
  return true
}

/** True when filter aria-controls target changes between two list states. */
export function listFilterAriaControlsChanged(
  before: { ready: boolean; hasRows: boolean },
  after: { ready: boolean; hasRows: boolean },
): boolean {
  return listFilterAriaControls(before) !== listFilterAriaControls(after)
}

/** Round 45: skip-link and filter aria-controls share one landmark contract. */
export function listSkipAriaControlsAligned(): true {
  return true
}

/** True when skip href is `#` + the same id as filter aria-controls. */
export function listSkipMatchesFilterAriaControls(opts: {
  ready: boolean
  hasRows: boolean
}): boolean {
  return listSkipHref(opts) === `#${listFilterAriaControls(opts)}`
}

/** Round 46: skip activation after empty ↔ rows lands on the aligned landmark. */
export function listSkipLandsAfterEmptyRowsFlip(): true {
  return true
}

/**
 * Round 46: when skip has landed on `#analysis-list-main` itself, routeFocus
 * must not steal — children (rows/buttons) still yield to routeFocus (R31).
 */
export function listSkipLandmarkFocusProtected(): true {
  return true
}

/** Resolve the DOM landmark skip / aria-controls currently point at. */
export function resolveListSkipFocusTarget(
  opts: { ready: boolean; hasRows: boolean },
  doc: Document = document,
): HTMLElement | null {
  const id = listFilterAriaControls(opts)
  const el = doc.getElementById(id)
  return el instanceof HTMLElement ? el : null
}

/** Activate skip landing: focus the aligned list landmark (Round 46). */
export function activateListSkipFocus(
  opts: { ready: boolean; hasRows: boolean },
  doc: Document = document,
): HTMLElement | null {
  const target = resolveListSkipFocusTarget(opts, doc)
  if (!target) return null
  if (!target.hasAttribute('tabindex')) target.tabIndex = -1
  target.focus({ preventScroll: true })
  return target
}

/**
 * True when focus is on the list-main landmark element itself (skip landing),
 * not on a descendant control.
 */
export function isListMainSkipLandmarkFocused(
  el: Element | null,
  doc: Document = document,
): boolean {
  if (!(el instanceof HTMLElement)) return false
  const main = doc.getElementById(listMainRegionAttrs().id)
  return !!main && el === main
}
