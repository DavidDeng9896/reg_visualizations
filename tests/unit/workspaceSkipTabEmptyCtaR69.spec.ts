import { afterEach, describe, expect, it } from 'vitest'
import {
  activateWorkspaceSkipFocus,
  resolveNextTabAfterWorkspaceSkip,
  workspaceSkipTabEmptyCtaR69Regression,
  workspaceSkipTabEntersEmptyCta,
} from '@/modules/analysis/workspaceSkip'

describe('workspace skip → Tab empty CTA regression (Round 69)', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('documents Round 69 workspace skip→empty Tab regression', () => {
    expect(workspaceSkipTabEmptyCtaR69Regression()).toBe(true)
    expect(workspaceSkipTabEntersEmptyCta()).toBe(true)
  })

  it('resolves the first workspace empty CTA as next Tab after skip lands on #ws-empty', () => {
    document.body.innerHTML = `
      <div id="ws-empty" tabindex="-1" role="region" class="empty">
        <button type="button" class="btn btn-primary empty-cta" aria-label="从工作区空态导入 CSV">导入 CSV</button>
        <button type="button" class="btn empty-cta" aria-label="从工作区空态合并表">合并表</button>
      </div>
    `
    const opts = { mode: 'workspace' as const, flowchartEmpty: false, workspaceEmpty: true }
    const landmark = activateWorkspaceSkipFocus(opts)
    expect(landmark?.id).toBe('ws-empty')
    expect(document.activeElement).toBe(landmark)

    const next = resolveNextTabAfterWorkspaceSkip(opts)
    expect(next?.getAttribute('aria-label')).toBe('从工作区空态导入 CSV')
    expect(next?.classList.contains('empty-cta')).toBe(true)
  })
})
