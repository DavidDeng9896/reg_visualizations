import { describe, expect, it } from 'vitest'
import {
  IA_OVERLAY_MARKERS,
  iaOverlaySelector,
  queryOpenIaOverlays,
} from '@/modules/analysis/dialogMarkers'

describe('dialogMarkers', () => {
  it('exposes stable data-ia-* markers for all workspace overlays (Round 36)', () => {
    expect(IA_OVERLAY_MARKERS).toEqual({
      csv: 'data-ia-csv',
      combine: 'data-ia-combine',
      transform: 'data-ia-transform',
      chartEdit: 'data-ia-chart-edit',
    })
    expect(iaOverlaySelector('csv')).toBe('[data-ia-csv]')
    expect(iaOverlaySelector('combine')).toBe('[data-ia-combine]')
    expect(iaOverlaySelector('transform')).toBe('[data-ia-transform]')
    expect(iaOverlaySelector('chartEdit')).toBe('[data-ia-chart-edit]')
  })

  it('queries open overlay roots by marker', () => {
    const csv = document.createElement('div')
    csv.setAttribute('data-ia-csv', '1')
    const combine = document.createElement('div')
    combine.setAttribute('data-ia-combine', '1')
    document.body.append(csv, combine)

    const found = queryOpenIaOverlays()
    expect(found).toContain(csv)
    expect(found).toContain(combine)

    csv.remove()
    combine.remove()
    expect(queryOpenIaOverlays()).toEqual([])
  })
})
