import { describe, expect, it } from 'vitest'
import {
  IA_OVERLAY_MARKERS,
  iaOverlaySelector,
  queryOpenIaOverlays,
} from '@/modules/analysis/dialogMarkers'

describe('dialogMarkers', () => {
  it('exposes stable data-ia-* markers for workspace + list overlays (Round 37)', () => {
    expect(IA_OVERLAY_MARKERS).toEqual({
      csv: 'data-ia-csv',
      combine: 'data-ia-combine',
      transform: 'data-ia-transform',
      chartEdit: 'data-ia-chart-edit',
      create: 'data-ia-create',
      newView: 'data-ia-new-view',
    })
    expect(iaOverlaySelector('create')).toBe('[data-ia-create]')
    expect(iaOverlaySelector('newView')).toBe('[data-ia-new-view]')
    expect(iaOverlaySelector('csv')).toBe('[data-ia-csv]')
  })

  it('queries open overlay roots by marker including Create / New view', () => {
    const create = document.createElement('div')
    create.setAttribute('data-ia-create', '1')
    const newView = document.createElement('div')
    newView.setAttribute('data-ia-new-view', '1')
    document.body.append(create, newView)

    const found = queryOpenIaOverlays()
    expect(found).toContain(create)
    expect(found).toContain(newView)

    create.remove()
    newView.remove()
    expect(queryOpenIaOverlays()).toEqual([])
  })
})
