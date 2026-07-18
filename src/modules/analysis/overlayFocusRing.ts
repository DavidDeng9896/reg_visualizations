/**
 * Overlay focus-ring contract matrix (Round 38).
 *
 * Every teleported overlay must expose visible keyboard focus rings on at least
 * close + footer actions. Additional controls (input/select/tabs) are listed
 * when the surface owns them. Global `:focus-visible` in main.css is the
 * baseline; Create / New view / ChartEdit also ship scoped rings; CSV /
 * Combine / Transform add explicit close/footer rings in Round 38.
 */

import { IA_OVERLAY_MARKERS, type IaOverlayId } from '@/modules/analysis/dialogMarkers'

export type OverlayFocusRingControl = 'close' | 'footer' | 'input' | 'select' | 'tabs' | 'upload'

export const OVERLAY_FOCUS_RING_CONTROLS: Record<IaOverlayId, OverlayFocusRingControl[]> = {
  create: ['close', 'footer', 'input', 'select'],
  newView: ['close', 'footer', 'input', 'select'],
  csv: ['close', 'footer', 'upload', 'input'],
  combine: ['close', 'footer', 'input', 'select'],
  transform: ['close', 'footer', 'input', 'select'],
  chartEdit: ['close', 'footer', 'tabs', 'input', 'select'],
}

export function overlayFocusRingControls(id: IaOverlayId): OverlayFocusRingControl[] {
  return OVERLAY_FOCUS_RING_CONTROLS[id]
}

export function overlaysWithFocusRingContract(): IaOverlayId[] {
  return (Object.keys(IA_OVERLAY_MARKERS) as IaOverlayId[]).filter(
    (id) => (OVERLAY_FOCUS_RING_CONTROLS[id]?.length ?? 0) >= 2,
  )
}
