import { describe, expect, it } from 'vitest'
import {
  listFilterAriaControls,
  listFilterAriaControlsChanged,
  listSkipMatchesFilterAriaControls,
  listSkipAriaControlsAligned,
} from '@/modules/analysis/listFocusOrder'
import { listSkipHref } from '@/modules/analysis/listEmpty'

describe('listSkip × aria-controls align (Round 45)', () => {
  it('documents skip-link target matching filter aria-controls', () => {
    expect(listSkipAriaControlsAligned()).toBe(true)
  })

  it('keeps skip href hash equal to aria-controls for loading / rows / empty', () => {
    const states = [
      { ready: false, hasRows: false },
      { ready: false, hasRows: true },
      { ready: true, hasRows: true },
      { ready: true, hasRows: false },
    ] as const
    for (const s of states) {
      expect(listSkipMatchesFilterAriaControls(s)).toBe(true)
      expect(listSkipHref(s)).toBe(`#${listFilterAriaControls(s)}`)
    }
  })

  it('stays aligned after empty ↔ rows flips', () => {
    const withRows = { ready: true, hasRows: true }
    const empty = { ready: true, hasRows: false }
    expect(listFilterAriaControlsChanged(withRows, empty)).toBe(true)
    expect(listSkipMatchesFilterAriaControls(withRows)).toBe(true)
    expect(listSkipMatchesFilterAriaControls(empty)).toBe(true)
    expect(listSkipHref(withRows)).not.toBe(listSkipHref(empty))
  })
})
