/**
 * Unified `data-ia-*` markers for workspace overlays (Round 36).
 * Keep attribute names stable for E2E / a11y probes and inert contracts.
 */

export const IA_OVERLAY_MARKERS = {
  csv: 'data-ia-csv',
  combine: 'data-ia-combine',
  transform: 'data-ia-transform',
  chartEdit: 'data-ia-chart-edit',
} as const

export type IaOverlayId = keyof typeof IA_OVERLAY_MARKERS

export function iaOverlaySelector(id: IaOverlayId): string {
  return `[${IA_OVERLAY_MARKERS[id]}]`
}

/** All teleported workspace overlay roots currently in the document. */
export function queryOpenIaOverlays(doc: Document = document): Element[] {
  return Object.values(IA_OVERLAY_MARKERS).flatMap((attr) => [
    ...doc.querySelectorAll(`[${attr}]`),
  ])
}
