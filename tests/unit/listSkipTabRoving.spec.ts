import { afterEach, describe, expect, it } from 'vitest'
import {
  activateListSkipFocus,
  listSkipTabEntersRowRoving,
  resolveNextTabAfterListSkip,
} from '@/modules/analysis/listFocusOrder'
import { listMainRegionAttrs } from '@/modules/analysis/listEmpty'

describe('list skip → Tab enters row roving (Round 47)', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('documents that Tab after skip lands enters the roving row group', () => {
    expect(listSkipTabEntersRowRoving()).toBe(true)
  })

  it('resolves the first roving row as the next Tab target after skip on list-main', () => {
    document.body.innerHTML = `
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
    expect(document.activeElement).toBe(landmark)

    const next = resolveNextTabAfterListSkip(state)
    expect(next?.getAttribute('data-ia-list-row')).toBe('0')
    expect(next?.tabIndex).toBe(0)
  })

  it('defers empty-landmark Tab to Round 52 empty-CTA order (no roving rows)', () => {
    document.body.innerHTML = `
      <div id="analysis-list" tabindex="-1" role="region">
        <button type="button" class="empty-cta">一键 Demo</button>
      </div>
    `
    const state = { ready: true, hasRows: false }
    activateListSkipFocus(state)
    // Round 47: no roving rows. Round 52: next Tab is the first empty CTA.
    const next = resolveNextTabAfterListSkip(state)
    expect(next?.classList.contains('empty-cta')).toBe(true)
  })
})
