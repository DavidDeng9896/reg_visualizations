import { afterEach, describe, expect, it } from 'vitest'
import {
  activateListSkipFocus,
  listChromeFocusOrder,
  listFilterBeforeRows,
  listFilterTabCoexistsWithSkipTab,
  listFilterTabEntersRowRoving,
  listSkipTabEntersRowRoving,
  resolveNextTabAfterFilter,
  resolveNextTabAfterListSkip,
} from '@/modules/analysis/listFocusOrder'
import { listMainRegionAttrs } from '@/modules/analysis/listEmpty'

describe('filter Tab → first row × skip→Tab (Round 49)', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('documents filter Tab entering roving and coexisting with skip→Tab', () => {
    expect(listFilterBeforeRows()).toBe(true)
    expect(listFilterTabEntersRowRoving()).toBe(true)
    expect(listSkipTabEntersRowRoving()).toBe(true)
    expect(listFilterTabCoexistsWithSkipTab()).toBe(true)
    expect(listChromeFocusOrder()).toEqual(['filter', 'rows'])
  })

  it('resolves the same first roving row for filter Tab and skip→Tab paths', () => {
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
    const filter = document.querySelector<HTMLSelectElement>('[data-ia-list-filter]')!
    filter.focus()
    expect(document.activeElement).toBe(filter)

    const afterFilter = resolveNextTabAfterFilter(state)
    expect(afterFilter?.getAttribute('data-ia-list-row')).toBe('0')
    expect(afterFilter?.tabIndex).toBe(0)

    const landmark = activateListSkipFocus(state)
    expect(landmark?.id).toBe('analysis-list-main')
    const afterSkip = resolveNextTabAfterListSkip(state)
    expect(afterSkip).toBe(afterFilter)
    expect(afterSkip?.getAttribute('data-ia-list-row')).toBe('0')
  })
})
