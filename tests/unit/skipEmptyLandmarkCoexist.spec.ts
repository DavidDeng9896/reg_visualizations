import { afterEach, describe, expect, it } from 'vitest'
import {
  activateWorkspaceSkipFocus,
  resolveNextTabAfterWorkspaceSkip,
  skipEmptyLandmarkCoexistSpotCheck,
  workspaceSkipTabEntersEmptyCta,
} from '@/modules/analysis/workspaceSkip'
import {
  listSkipTabEntersEmptyCta,
  resolveNextTabAfterListSkip,
} from '@/modules/analysis/listFocusOrder'
import { listEmptyRegionAttrs } from '@/modules/analysis/listEmpty'
import { flowchartSkipTabEntersEmptyCta } from '@/modules/flowchart/flowchartEmpty'

describe('skip → empty landmark coexistence (Round 57)', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('documents list / workspace / flowchart skip→empty landmark contracts coexist', () => {
    expect(skipEmptyLandmarkCoexistSpotCheck()).toBe(true)
    expect(listSkipTabEntersEmptyCta()).toBe(true)
    expect(workspaceSkipTabEntersEmptyCta()).toBe(true)
    expect(flowchartSkipTabEntersEmptyCta()).toBe(true)
  })

  it('resolves independent empty CTAs for list, workspace, and flowchart landmarks', () => {
    document.body.innerHTML = `
      <div id="${listEmptyRegionAttrs().id}" tabindex="-1" role="region" class="empty-list">
        <button type="button" class="btn empty-cta">一键 Demo</button>
      </div>
      <div id="ws-empty" tabindex="-1" role="region" class="empty">
        <button type="button" class="btn btn-primary empty-cta" aria-label="从工作区空态导入 CSV">导入 CSV</button>
      </div>
      <div id="flow-empty" tabindex="-1" role="region" class="empty">
        <button type="button" class="btn btn-primary empty-cta" aria-label="从流程图空态导入 CSV">导入 CSV</button>
      </div>
    `

    const listNext = resolveNextTabAfterListSkip({ ready: true, hasRows: false })
    expect(listNext?.textContent).toContain('一键 Demo')

    const wsOpts = { mode: 'workspace' as const, flowchartEmpty: false, workspaceEmpty: true }
    activateWorkspaceSkipFocus(wsOpts)
    const wsNext = resolveNextTabAfterWorkspaceSkip(wsOpts)
    expect(wsNext?.getAttribute('aria-label')).toBe('从工作区空态导入 CSV')

    const flowOpts = { mode: 'flowchart' as const, flowchartEmpty: true, workspaceEmpty: false }
    activateWorkspaceSkipFocus(flowOpts)
    const flowNext = resolveNextTabAfterWorkspaceSkip(flowOpts)
    expect(flowNext?.getAttribute('aria-label')).toBe('从流程图空态导入 CSV')

    expect(listNext).not.toBe(wsNext)
    expect(wsNext).not.toBe(flowNext)
    expect(listNext).not.toBe(flowNext)
  })
})
