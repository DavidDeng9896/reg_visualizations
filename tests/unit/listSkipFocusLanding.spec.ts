import { afterEach, describe, expect, it } from 'vitest'
import {
  activateListSkipFocus,
  listSkipLandsAfterEmptyRowsFlip,
  listSkipMatchesFilterAriaControls,
  resolveListSkipFocusTarget,
} from '@/modules/analysis/listFocusOrder'
import { listEmptyRegionAttrs, listMainRegionAttrs, listSkipHref } from '@/modules/analysis/listEmpty'

describe('list skip focus landing after empty ↔ rows (Round 46)', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('documents skip landing on the aligned landmark after empty ↔ rows flips', () => {
    expect(listSkipLandsAfterEmptyRowsFlip()).toBe(true)
  })

  it('lands focus on #analysis-list-main when rows are visible', () => {
    document.body.innerHTML = `
      <a class="skip-link" data-ia-skip="1" href="${listSkipHref({ ready: true, hasRows: true })}">跳到列表</a>
      <table id="${listMainRegionAttrs().id}" tabindex="-1"></table>
      <div id="${listEmptyRegionAttrs().id}" tabindex="-1" hidden></div>
    `
    const state = { ready: true, hasRows: true }
    expect(listSkipMatchesFilterAriaControls(state)).toBe(true)
    const landed = activateListSkipFocus(state)
    expect(landed?.id).toBe('analysis-list-main')
    expect(document.activeElement).toBe(landed)
  })

  it('lands focus on #analysis-list after flipping to empty', () => {
    document.body.innerHTML = `
      <a class="skip-link" data-ia-skip="1" href="${listSkipHref({ ready: true, hasRows: false })}">跳到列表</a>
      <div id="${listEmptyRegionAttrs().id}" tabindex="-1" role="region">empty</div>
    `
    const before = { ready: true, hasRows: true }
    const after = { ready: true, hasRows: false }
    expect(listSkipHref(before)).not.toBe(listSkipHref(after))
    expect(listSkipMatchesFilterAriaControls(after)).toBe(true)

    const target = resolveListSkipFocusTarget(after)
    expect(target?.id).toBe('analysis-list')
    const landed = activateListSkipFocus(after)
    expect(landed).toBe(target)
    expect(document.activeElement).toBe(target)
  })

  it('lands focus on #analysis-list-main after flipping empty → rows', () => {
    document.body.innerHTML = `
      <table id="${listMainRegionAttrs().id}" tabindex="-1"><tbody><tr data-ia-list-row="0"></tr></tbody></table>
    `
    const before = { ready: true, hasRows: false }
    const after = { ready: true, hasRows: true }
    expect(listSkipMatchesFilterAriaControls(after)).toBe(true)
    expect(resolveListSkipFocusTarget(before)).toBeNull()
    const landed = activateListSkipFocus(after)
    expect(landed?.id).toBe('analysis-list-main')
    expect(document.activeElement).toBe(landed)
  })
})
