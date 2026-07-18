import { afterEach, describe, expect, it } from 'vitest'
import {
  isListEmptyCtaFocusTarget,
  listEmptyCtaPreservesFocusOnAriaControlsSwitch,
  shouldPreserveEmptyCtaFocusOnAriaControlsFlip,
  listFilterAriaControls,
  listFilterAriaControlsChanged,
  shouldMigrateListLandmarkFocus,
} from '@/modules/analysis/listFocusOrder'
import { listEmptyRegionAttrs, listMainRegionAttrs } from '@/modules/analysis/listEmpty'

describe('empty CTA focus × filter aria-controls (Round 51)', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('documents that empty CTA focus is preserved across aria-controls flips', () => {
    expect(listEmptyCtaPreservesFocusOnAriaControlsSwitch()).toBe(true)
  })

  it('does not migrate landmark when focus is on empty Demo/Create CTA during flip', () => {
    document.body.innerHTML = `
      <select data-ia-list-filter aria-controls="${listEmptyRegionAttrs().id}">
        <option value="">全部</option>
      </select>
      <div id="${listEmptyRegionAttrs().id}" tabindex="-1" role="region">
        <button type="button" class="btn empty-cta">一键 Demo</button>
        <button type="button" class="btn btn-primary empty-cta create-trigger">+ Create</button>
      </div>
    `
    const demo = document.querySelector('.empty-cta:not(.create-trigger)') as HTMLButtonElement
    demo.focus()
    expect(isListEmptyCtaFocusTarget(document.activeElement)).toBe(true)

    const before = { ready: true, hasRows: false }
    const after = { ready: true, hasRows: true }
    expect(listFilterAriaControlsChanged(before, after)).toBe(true)
    expect(listFilterAriaControls(after)).toBe(listMainRegionAttrs().id)
    expect(shouldPreserveEmptyCtaFocusOnAriaControlsFlip(document.activeElement, before, after)).toBe(
      true,
    )
    // Landmark migrate requires wasOnLandmark — empty CTA is a child, not the landmark.
    expect(shouldMigrateListLandmarkFocus(false, before, after)).toBe(false)
    expect(document.activeElement).toBe(demo)
  })

  it('also preserves Create empty CTA across empty → rows flip', () => {
    document.body.innerHTML = `
      <div id="${listEmptyRegionAttrs().id}" tabindex="-1" role="region">
        <button type="button" class="btn empty-cta">一键 Demo</button>
        <button type="button" class="btn btn-primary empty-cta create-trigger">+ Create</button>
      </div>
    `
    const create = document.querySelector('.create-trigger') as HTMLButtonElement
    create.focus()
    expect(isListEmptyCtaFocusTarget(document.activeElement)).toBe(true)

    const before = { ready: true, hasRows: false }
    const after = { ready: true, hasRows: true }
    expect(shouldPreserveEmptyCtaFocusOnAriaControlsFlip(document.activeElement, before, after)).toBe(
      true,
    )
  })
})
