import { describe, expect, it } from 'vitest'
import {
  listFilterAriaControls,
  listFilterAriaControlsChanged,
  listFilterAriaControlsSwitchesOnEmpty,
} from '@/modules/analysis/listFocusOrder'
import { listEmptyRegionAttrs, listMainRegionAttrs } from '@/modules/analysis/listEmpty'

describe('listFilterAriaControlsSwitch (Round 44)', () => {
  it('documents dynamic aria-controls when empty ↔ has-rows flips', () => {
    expect(listFilterAriaControlsSwitchesOnEmpty()).toBe(true)
  })

  it('switches from table landmark to empty landmark when the last row disappears', () => {
    const before = { ready: true, hasRows: true }
    const after = { ready: true, hasRows: false }
    expect(listFilterAriaControls(before)).toBe(listMainRegionAttrs().id)
    expect(listFilterAriaControls(after)).toBe(listEmptyRegionAttrs().id)
    expect(listFilterAriaControlsChanged(before, after)).toBe(true)
  })

  it('switches from empty landmark back to table when rows reappear', () => {
    const before = { ready: true, hasRows: false }
    const after = { ready: true, hasRows: true }
    expect(listFilterAriaControlsChanged(before, after)).toBe(true)
    expect(listFilterAriaControls(after)).toBe(listMainRegionAttrs().id)
  })

  it('does not switch while loading (skeleton keeps main landmark)', () => {
    expect(
      listFilterAriaControlsChanged(
        { ready: false, hasRows: false },
        { ready: false, hasRows: true },
      ),
    ).toBe(false)
  })
})
