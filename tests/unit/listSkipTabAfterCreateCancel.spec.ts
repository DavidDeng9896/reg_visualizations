import { afterEach, describe, expect, it } from 'vitest'
import {
  listSkipTabAfterCreateCancel,
  listSkipVisibleWhenCreateClosed,
  syncListSkipVisibility,
} from '@/modules/analysis/listSkipCreate'
import {
  activateListSkipFocus,
  listSkipTabEntersRowRoving,
  resolveNextTabAfterListSkip,
} from '@/modules/analysis/listFocusOrder'
import { listMainRegionAttrs } from '@/modules/analysis/listEmpty'

describe('Create Cancel → skip→Tab (Round 51)', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('documents that Create Cancel restores skip so skip→Tab still works', () => {
    expect(listSkipTabAfterCreateCancel()).toBe(true)
    expect(listSkipTabEntersRowRoving()).toBe(true)
  })

  it('after Create open→Cancel, skip is visible and Tab still enters first roving row', () => {
    document.body.innerHTML = `
      <a class="skip-link" data-ia-skip="1" href="#analysis-list-main">跳到列表</a>
      <table id="${listMainRegionAttrs().id}" tabindex="-1">
        <tbody>
          <tr data-ia-list-row="0" tabindex="0"><td>A</td></tr>
          <tr data-ia-list-row="1" tabindex="-1"><td>B</td></tr>
        </tbody>
      </table>
    `
    const skip = document.querySelector('.skip-link') as HTMLAnchorElement

    // Create opens → hide skip
    syncListSkipVisibility(skip, true)
    expect(skip.hidden).toBe(true)

    // Create Cancel → restore skip
    syncListSkipVisibility(skip, false)
    expect(skip.hidden).toBe(false)
    expect(skip.hasAttribute('aria-hidden')).toBe(false)
    expect(listSkipVisibleWhenCreateClosed(false)).toBe(true)

    const state = { ready: true, hasRows: true }
    const landmark = activateListSkipFocus(state)
    expect(landmark?.id).toBe('analysis-list-main')

    const next = resolveNextTabAfterListSkip(state)
    expect(next?.getAttribute('data-ia-list-row')).toBe('0')
    expect(next?.tabIndex).toBe(0)
  })
})
