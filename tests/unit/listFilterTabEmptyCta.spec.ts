import { afterEach, describe, expect, it } from 'vitest'
import {
  activateListSkipFocus,
  listFilterTabCoexistsWithSkipTabEmpty,
  listFilterTabEntersEmptyCta,
  resolveNextTabAfterFilter,
  resolveNextTabAfterListSkip,
} from '@/modules/analysis/listFocusOrder'
import { listEmptyRegionAttrs } from '@/modules/analysis/listEmpty'

describe('filter Tab → empty CTA × skip→Tab (Round 53)', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('documents filter Tab entering empty CTA and coexisting with skip→Tab on empty list', () => {
    expect(listFilterTabEntersEmptyCta()).toBe(true)
    expect(listFilterTabCoexistsWithSkipTabEmpty()).toBe(true)
  })

  it('resolves the same first empty CTA for filter Tab and skip→Tab when list is empty', () => {
    document.body.innerHTML = `
      <select data-ia-list-filter>
        <option value="">全部</option>
      </select>
      <div id="${listEmptyRegionAttrs().id}" tabindex="-1" role="region" class="empty-list">
        <button type="button" class="btn empty-cta">一键 Demo</button>
        <button type="button" class="btn btn-primary empty-cta create-trigger">+ Create Analysis</button>
      </div>
    `
    const state = { ready: true, hasRows: false }
    const filter = document.querySelector<HTMLSelectElement>('[data-ia-list-filter]')!
    filter.focus()
    expect(document.activeElement).toBe(filter)

    const afterFilter = resolveNextTabAfterFilter(state)
    expect(afterFilter?.textContent).toContain('一键 Demo')
    expect(afterFilter?.classList.contains('empty-cta')).toBe(true)

    const landmark = activateListSkipFocus(state)
    expect(landmark?.id).toBe('analysis-list')
    const afterSkip = resolveNextTabAfterListSkip(state)
    expect(afterSkip).toBe(afterFilter)
    expect(afterSkip?.textContent).toContain('一键 Demo')
  })
})
