import { describe, expect, it } from 'vitest'
import {
  listFilterAriaControls,
  listFilterControlsTable,
} from '@/modules/analysis/listFocusOrder'
import { listMainRegionAttrs, listEmptyRegionAttrs } from '@/modules/analysis/listEmpty'

describe('listFilterAriaControls (Round 43)', () => {
  it('documents filter aria-controls pointing at the list landmark', () => {
    expect(listFilterControlsTable()).toBe(true)
  })

  it('targets the table landmark when rows are visible', () => {
    expect(listFilterAriaControls({ ready: true, hasRows: true })).toBe(
      listMainRegionAttrs().id,
    )
  })

  it('targets the empty-list landmark when there are no rows', () => {
    expect(listFilterAriaControls({ ready: true, hasRows: false })).toBe(
      listEmptyRegionAttrs().id,
    )
  })

  it('targets the main landmark while the list is still loading', () => {
    expect(listFilterAriaControls({ ready: false, hasRows: false })).toBe(
      listMainRegionAttrs().id,
    )
  })
})
