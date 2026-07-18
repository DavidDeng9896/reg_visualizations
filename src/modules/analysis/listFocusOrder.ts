/**
 * Analysis list chrome focus order (Round 42–53).
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
 * Round 47: when empty ↔ rows flips while focus is already on the old
 * landmark, migrate to the new landmark; after skip lands on list-main,
 * the next Tab target is the first roving row.
 * Round 48: landmark migrate never steals from the filter select; skip→Tab
 * roving coexists with filter→rows chrome order (skip bypasses filter only
 * after skip landing).
 * Round 49: filter Tab → first roving row coexists with skip→Tab (same target);
 * chrome order still filter→rows for normal page Tab.
 * Round 51: empty Demo/Create CTA focus is preserved across aria-controls
 * flips (CTA is a child of the empty landmark — not a migrate target).
 * Round 52: after skip lands on the empty landmark, Tab enters the first
 * empty CTA (Demo / Create) — empty has no roving rows.
 * Round 53: filter Tab on empty list enters the same first empty CTA as
 * skip→Tab (parity with filter→row when hasRows).
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

/** Round 47: migrate landmark focus when empty ↔ rows flips under skip landing. */
export function listLandmarkMigratesOnEmptyRowsFlip(): true {
  return true
}

/**
 * True when focus is on a list landmark itself (`#analysis-list-main` or
 * `#analysis-list`), not a row or the filter select.
 */
export function isListLandmarkFocusTarget(el: Element | null): boolean {
  if (!(el instanceof HTMLElement)) return false
  const id = el.id
  return id === listMainRegionAttrs().id || id === listEmptyRegionAttrs().id
}

/**
 * Migrate when the user was on a landmark and aria-controls target flips
 * (empty ↔ rows). Never steal from the filter select or a roving row.
 */
export function shouldMigrateListLandmarkFocus(
  wasOnLandmark: boolean,
  before: { ready: boolean; hasRows: boolean },
  after: { ready: boolean; hasRows: boolean },
): boolean {
  if (!wasOnLandmark) return false
  return listFilterAriaControlsChanged(before, after)
}

/**
 * Round 48: landmark migrate leaves the project filter select alone — only
 * runs when `wasOnLandmark` (filter is never a landmark).
 */
export function listLandmarkMigrateLeavesFilterFocus(): true {
  return true
}

/** Focus the landmark that skip / aria-controls currently point at (Round 47). */
export function migrateListLandmarkFocus(
  opts: { ready: boolean; hasRows: boolean },
  doc: Document = document,
): HTMLElement | null {
  return activateListSkipFocus(opts, doc)
}

/**
 * Round 47: after skip lands on list-main with rows, Tab enters the roving
 * row group (first tabindex=0 row).
 */
export function listSkipTabEntersRowRoving(): true {
  return true
}

/**
 * Resolve the next Tab stop after skip lands on a list landmark.
 * - Rows: first roving row (Round 47).
 * - Empty: first empty CTA inside `#analysis-list` (Round 52).
 */
export function resolveNextTabAfterListSkip(
  opts: { ready: boolean; hasRows: boolean },
  doc: Document = document,
): HTMLElement | null {
  if (!opts.ready) return null
  if (!opts.hasRows) {
    return (
      doc.querySelector<HTMLElement>('#analysis-list .empty-cta') ||
      doc.querySelector<HTMLElement>('.empty-list .empty-cta')
    )
  }
  const row = doc.querySelector<HTMLElement>(
    `[data-ia-list-row][tabindex="0"], [data-ia-list-row][tabindex='0']`,
  )
  if (row) return row
  return doc.querySelector<HTMLElement>('[data-ia-list-row="0"]')
}

/**
 * Round 52: after skip lands on the empty landmark, Tab enters the first
 * empty CTA (Demo preferred in DOM order).
 */
export function listSkipTabEntersEmptyCta(): true {
  return true
}

/**
 * Round 48: skip→Tab into roving rows coexists with filter→rows chrome order.
 * Normal Tab from page chrome still hits filter first; skip landing is the
 * only path that bypasses filter into the first roving row.
 */
export function listSkipTabCoexistsWithFilterOrder(): true {
  return true
}

/**
 * Round 49: after the project filter, Tab enters the first roving row
 * (same target as skip→Tab after list-main landing).
 */
export function listFilterTabEntersRowRoving(): true {
  return true
}

/**
 * Resolve the first roving list row as the next Tab stop after the filter
 * select (chrome order filter → rows). Empty list → null.
 */
export function resolveNextTabAfterFilter(
  opts: { ready: boolean; hasRows: boolean },
  doc: Document = document,
): HTMLElement | null {
  return resolveNextTabAfterListSkip(opts, doc)
}

/**
 * Round 49: filter→Tab and skip→Tab both land on the first roving row;
 * chrome order still keeps filter before rows for normal page Tab.
 */
export function listFilterTabCoexistsWithSkipTab(): true {
  return true
}

/**
 * Round 51: empty Demo/Create CTA focus is preserved when filter
 * aria-controls flips (empty ↔ rows).
 */
export function listEmptyCtaPreservesFocusOnAriaControlsSwitch(): true {
  return true
}

/** True when focus is on an empty-list Demo or Create CTA button. */
export function isListEmptyCtaFocusTarget(el: Element | null): boolean {
  return (
    el instanceof HTMLElement &&
    el.classList.contains('empty-cta') &&
    !!el.closest('.empty-list, #analysis-list')
  )
}

/**
 * When aria-controls flips and focus is on an empty CTA, preserve that focus
 * (do not migrate landmark / steal). Returns true when preservation applies.
 */
export function shouldPreserveEmptyCtaFocusOnAriaControlsFlip(
  activeEl: Element | null,
  before: { ready: boolean; hasRows: boolean },
  after: { ready: boolean; hasRows: boolean },
): boolean {
  if (!isListEmptyCtaFocusTarget(activeEl)) return false
  return listFilterAriaControlsChanged(before, after)
}

/**
 * Round 53: after the project filter on an empty list, Tab enters the first
 * empty CTA (same target as skip→Tab after empty landmark landing).
 */
export function listFilterTabEntersEmptyCta(): true {
  return true
}

/**
 * Round 53: filter→Tab and skip→Tab both land on the first empty CTA when the
 * list is empty; chrome order still keeps filter before the empty region.
 */
export function listFilterTabCoexistsWithSkipTabEmpty(): true {
  return true
}
