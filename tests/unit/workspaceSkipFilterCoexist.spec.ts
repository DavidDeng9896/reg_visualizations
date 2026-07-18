import { afterEach, describe, expect, it } from 'vitest'
import {
  activateWorkspaceSkipFocus,
  resolveNextTabAfterWorkspaceSkip,
  workspaceSkipFilterCoexistSpotCheck,
  workspaceSkipTabEntersEmptyCta,
} from '@/modules/analysis/workspaceSkip'
import {
  listFilterTabCoexistsWithSkipTabEmpty,
  listFilterTabEntersEmptyCta,
  resolveNextTabAfterFilter,
} from '@/modules/analysis/listFocusOrder'
import { listEmptyRegionAttrs } from '@/modules/analysis/listEmpty'

describe('workspace skip × list filter coexistence (Round 54)', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('documents workspace skip→empty Tab coexisting with list filter Tab contracts', () => {
    expect(workspaceSkipFilterCoexistSpotCheck()).toBe(true)
    expect(workspaceSkipTabEntersEmptyCta()).toBe(true)
    expect(listFilterTabEntersEmptyCta()).toBe(true)
    expect(listFilterTabCoexistsWithSkipTabEmpty()).toBe(true)
  })

  it('keeps workspace skip→CTA and list filter→CTA resolutions independent when both landmarks exist', () => {
    document.body.innerHTML = `
      <select data-ia-list-filter>
        <option value="">全部</option>
      </select>
      <div id="${listEmptyRegionAttrs().id}" tabindex="-1" role="region" class="empty-list">
        <button type="button" class="btn empty-cta">一键 Demo</button>
      </div>
      <div id="ws-empty" tabindex="-1" role="region" class="empty">
        <button type="button" class="btn btn-primary empty-cta" aria-label="从工作区空态导入 CSV">导入 CSV</button>
      </div>
    `
    const listNext = resolveNextTabAfterFilter({ ready: true, hasRows: false })
    expect(listNext?.textContent).toContain('一键 Demo')

    const wsOpts = { mode: 'workspace' as const, flowchartEmpty: false, workspaceEmpty: true }
    activateWorkspaceSkipFocus(wsOpts)
    const wsNext = resolveNextTabAfterWorkspaceSkip(wsOpts)
    expect(wsNext?.getAttribute('aria-label')).toBe('从工作区空态导入 CSV')
    expect(wsNext).not.toBe(listNext)
  })
})
