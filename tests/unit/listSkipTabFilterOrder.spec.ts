import { afterEach, describe, expect, it } from 'vitest'
import {
  activateListSkipFocus,
  listChromeFocusOrder,
  listFilterBeforeRows,
  listSkipTabCoexistsWithFilterOrder,
  listSkipTabEntersRowRoving,
  resolveNextTabAfterListSkip,
} from '@/modules/analysis/listFocusOrder'
import { listMainRegionAttrs } from '@/modules/analysis/listEmpty'

describe('skip→Tab roving × filter Tab order (Round 48)', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('documents skip→Tab roving coexisting with filter-before-rows chrome order', () => {
    expect(listFilterBeforeRows()).toBe(true)
    expect(listChromeFocusOrder()).toEqual(['filter', 'rows'])
    expect(listSkipTabEntersRowRoving()).toBe(true)
    expect(listSkipTabCoexistsWithFilterOrder()).toBe(true)
  })

  it('keeps filter before rows in chrome order while skip→Tab still targets first row', () => {
    document.body.innerHTML = `
      <select data-ia-list-filter>
        <option value="">全部</option>
      </select>
      <table id="${listMainRegionAttrs().id}" tabindex="-1">
        <tbody>
          <tr data-ia-list-row="0" tabindex="0"><td>A</td></tr>
          <tr data-ia-list-row="1" tabindex="-1"><td>B</td></tr>
        </tbody>
      </table>
    `
    const state = { ready: true, hasRows: true }
    const landmark = activateListSkipFocus(state)
    expect(landmark?.id).toBe('analysis-list-main')

    // After skip lands on list-main, next Tab is the first roving row
    // (skip bypasses filter intentionally). Chrome order filter→rows still holds
    // for normal Tab from page chrome.
    const next = resolveNextTabAfterListSkip(state)
    expect(next?.getAttribute('data-ia-list-row')).toBe('0')
    expect(listChromeFocusOrder()[0]).toBe('filter')
    expect(listChromeFocusOrder()[1]).toBe('rows')
  })
})
