import { afterEach, describe, expect, it } from 'vitest'
import {
  activateListSkipFocus,
  listSkipTabEntersEmptyCta,
  resolveNextTabAfterListSkip,
} from '@/modules/analysis/listFocusOrder'
import { listEmptyRegionAttrs } from '@/modules/analysis/listEmpty'

describe('list skip → Tab enters empty CTA (Round 52)', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('documents that Tab after skip on empty landmark enters the first empty CTA', () => {
    expect(listSkipTabEntersEmptyCta()).toBe(true)
  })

  it('resolves the first empty CTA as the next Tab target after skip on analysis-list', () => {
    document.body.innerHTML = `
      <div id="${listEmptyRegionAttrs().id}" tabindex="-1" role="region" class="empty-list">
        <button type="button" class="btn empty-cta">一键 Demo</button>
        <button type="button" class="btn btn-primary empty-cta create-trigger">+ Create Analysis</button>
      </div>
    `
    const state = { ready: true, hasRows: false }
    const landmark = activateListSkipFocus(state)
    expect(landmark?.id).toBe('analysis-list')
    expect(document.activeElement).toBe(landmark)

    const next = resolveNextTabAfterListSkip(state)
    expect(next?.textContent).toContain('一键 Demo')
    expect(next?.classList.contains('empty-cta')).toBe(true)
  })
})
