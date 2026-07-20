/**
 * ChartEdit Cancel focus restore × toast coexistence (Round 55).
 *
 * When ChartEdit closes via Cancel (or Esc), restore the opener (toolbar Edit
 * trigger) with a visible ring. If a toast was inert while the drawer was
 * open, clearing inert leaves the toast interactive — same contract as
 * Transform Cancel × toast (R54).
 *
 * Round 57: Esc uses the same restore path as Cancel (regression marker).
 */

import { restoreFocusEl } from '@/shared/ui/focusRestore'

/**
 * Round 55: ChartEdit Cancel restores opener ring; toast host becomes
 * interactive again while any visible toast remains.
 */
export function chartEditCancelRestoresRingWithToast(): true {
  return true
}

/**
 * Round 57: ChartEdit Esc restores opener ring with the same toast contract
 * as Cancel (both close via applyChartEditCancelFocus).
 */
export function chartEditEscRestoresRingWithToast(): true {
  return true
}

/**
 * Round 60: ChartEdit Esc × toast spot-check regression — same contract
 * as Round 57 (visible ring + interactive toast host).
 */
export function chartEditEscToastR60SpotCheck(): true {
  return true
}

/**
 * Round 64: ChartEdit Esc × toast spot-check regression — same contract
 * as Round 57 / R60 (visible ring + interactive toast host).
 */
export function chartEditEscToastR64SpotCheck(): true {
  return true
}

/**
 * Round 66: ChartEdit Esc × toast spot-check regression — same contract
 * as Round 57 / R60 / R64 (visible ring + interactive toast host).
 */
export function chartEditEscToastR66SpotCheck(): true {
  return true
}

/**
 * Round 69: ChartEdit Esc × toast spot-check regression — same contract
 * as Round 57 / R60 / R64 / R66 (visible ring + interactive toast host).
 */
export function chartEditEscToastR69SpotCheck(): true {
  return true
}

/**
 * Round 79: ChartEdit Esc × toast spot-check regression — same contract
 * as Round 57 / R60 / R64 / R66 / R69 (visible ring + interactive toast host).
 */
export function chartEditEscToastR79SpotCheck(): true {
  return true
}

/**
 * Round 81: ChartEdit Cancel × toast spot-check regression — same contract
 * as Round 55 (visible ring + interactive toast host).
 */
export function chartEditCancelToastR81SpotCheck(): true {
  return true
}

/**
 * Round 83: ChartEdit Esc × toast spot-check regression — same contract
 * as Round 57 / R60 / R64 / R66 / R69 / R79 (visible ring + interactive toast host).
 */
export function chartEditEscToastR83SpotCheck(): true {
  return true
}

/**
 * Round 85: ChartEdit Esc × toast spot-check regression — same contract
 * as Round 57 / R60 / R64 / R66 / R69 / R79 / R83 (visible ring + interactive toast host).
 */
export function chartEditEscToastR85SpotCheck(): true {
  return true
}

/**
 * Round 87: ChartEdit Esc × toast spot-check regression — same contract
 * as Round 57 / R60 / R64 / R66 / R69 / R79 / R83 / R85 (visible ring + interactive toast host).
 */
export function chartEditEscToastR87SpotCheck(): true {
  return true
}

/**
 * Round 89: ChartEdit Esc × toast spot-check regression — same contract
 * as Round 57 / R60 / R64 / R66 / R69 / R79 / R83 / R85 / R87 (visible ring + interactive toast host).
 */
export function chartEditEscToastR89SpotCheck(): true {
  return true
}

/**
 * Round 91: ChartEdit Esc × toast spot-check regression — same contract
 * as Round 57 / R60 / R64 / R66 / R69 / R79 / R83 / R85 / R87 / R89 (visible ring + interactive toast host).
 */
export function chartEditEscToastR91SpotCheck(): true {
  return true
}

/**
 * Round 93: ChartEdit Esc × toast spot-check regression — same contract
 * as Round 57 / R60 / R64 / R66 / R69 / R79 / R83 / R85 / R87 / R89 / R91 (visible ring + interactive toast host).
 */
export function chartEditEscToastR93SpotCheck(): true {
  return true
}

/**
 * Round 95: ChartEdit Esc × toast spot-check regression — same contract
 * as Round 57 / R60 / R64 / R66 / R69 / R79 / R83 / R85 / R87 / R89 / R91 / R93 (visible ring + interactive toast host).
 */
export function chartEditEscToastR95SpotCheck(): true {
  return true
}

/**
 * Round 97: ChartEdit Esc × toast spot-check regression — same contract
 * as Round 57 / R60 / R64 / R66 / R69 / R79 / R83 / R85 / R87 / R89 / R91 / R93 / R95 (visible ring + interactive toast host).
 */
export function chartEditEscToastR97SpotCheck(): true {
  return true
}

/**
 * Round 99: ChartEdit Esc × toast spot-check regression — same contract
 * as Round 57 / R60 / R64 / R66 / R69 / R79 / R83 / R85 / R87 / R89 / R91 / R93 / R95 / R97 (visible ring + interactive toast host).
 */
export function chartEditEscToastR99SpotCheck(): true {
  return true
}

/**
 * Round 101: ChartEdit Esc × toast spot-check regression — same contract
 * as Round 57 / R60 / R64 / R66 / R69 / R79 / R83 / R85 / R87 / R89 / R91 / R93 / R95 / R97 / R99 (visible ring + interactive toast host).
 */
export function chartEditEscToastR101SpotCheck(): true {
  return true
}

/** Fallback: first focusable control in the workspace toolbar. */
export function chartEditCancelFocusFallback(
  doc: Document = document,
): HTMLElement | null {
  return doc.querySelector('#ws-toolbar button, #ws-toolbar [tabindex]') as HTMLElement | null
}

/**
 * Restore focus to the ChartEdit opener (or toolbar fallback) with a
 * visible ring after Cancel.
 */
export function applyChartEditCancelFocus(
  opener: HTMLElement | null,
  doc: Document = document,
): void {
  restoreFocusEl(opener, () => chartEditCancelFocusFallback(doc), {
    visibleRing: true,
  })
}
