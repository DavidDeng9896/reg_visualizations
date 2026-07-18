import { describe, expect, it } from 'vitest'
import { IA_OVERLAY_MARKERS, type IaOverlayId } from '@/modules/analysis/dialogMarkers'
import {
  OVERLAY_FOCUS_RING_CONTROLS,
  overlayFocusRingControls,
  overlaysWithFocusRingContract,
} from '@/modules/analysis/overlayFocusRing'

describe('overlayFocusRing', () => {
  it('documents focus-ring controls for every teleported overlay (Round 38)', () => {
    const ids = Object.keys(IA_OVERLAY_MARKERS) as IaOverlayId[]
    expect(overlaysWithFocusRingContract().sort()).toEqual([...ids].sort())
    for (const id of ids) {
      const controls = overlayFocusRingControls(id)
      expect(controls.length).toBeGreaterThanOrEqual(2)
      expect(controls).toContain('close')
      expect(controls).toContain('footer')
    }
  })

  it('requires Create / New view / CSV / Combine / Transform / Edit in the matrix', () => {
    expect(OVERLAY_FOCUS_RING_CONTROLS.create).toEqual(
      expect.arrayContaining(['close', 'footer', 'input', 'select']),
    )
    expect(OVERLAY_FOCUS_RING_CONTROLS.newView).toEqual(
      expect.arrayContaining(['close', 'footer', 'input', 'select']),
    )
    expect(OVERLAY_FOCUS_RING_CONTROLS.csv).toEqual(
      expect.arrayContaining(['close', 'footer']),
    )
    expect(OVERLAY_FOCUS_RING_CONTROLS.combine).toEqual(
      expect.arrayContaining(['close', 'footer']),
    )
    expect(OVERLAY_FOCUS_RING_CONTROLS.transform).toEqual(
      expect.arrayContaining(['close', 'footer']),
    )
    expect(OVERLAY_FOCUS_RING_CONTROLS.chartEdit).toEqual(
      expect.arrayContaining(['close', 'footer', 'tabs']),
    )
  })
})
