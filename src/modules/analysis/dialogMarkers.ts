/**
 * Unified `data-ia-*` markers for overlays (Round 36–37).
 * Keep attribute names stable for E2E / a11y probes and inert contracts.
 *
 * Round 37: Create Analysis + New view join the marker set (Teleport to body).
 */

export const IA_OVERLAY_MARKERS = {
  csv: 'data-ia-csv',
  combine: 'data-ia-combine',
  transform: 'data-ia-transform',
  chartEdit: 'data-ia-chart-edit',
  create: 'data-ia-create',
  newView: 'data-ia-new-view',
} as const

export type IaOverlayId = keyof typeof IA_OVERLAY_MARKERS

export function iaOverlaySelector(id: IaOverlayId): string {
  return `[${IA_OVERLAY_MARKERS[id]}]`
}

/** All teleported overlay roots currently in the document. */
export function queryOpenIaOverlays(doc: Document = document): Element[] {
  return Object.values(IA_OVERLAY_MARKERS).flatMap((attr) => [
    ...doc.querySelectorAll(`[${attr}]`),
  ])
}
