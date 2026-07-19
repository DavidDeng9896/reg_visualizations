import { afterEach, describe, expect, it } from 'vitest'
import {
  activateWorkspaceSkipFocus,
  resolveNextTabAfterWorkspaceSkip,
} from '@/modules/analysis/workspaceSkip'
import {
  flowchartSkipTabEmptyCtaR70Regression,
  flowchartSkipTabEntersEmptyCta,
} from '@/modules/flowchart/flowchartEmpty'

describe('flowchart skip → Tab empty CTA regression (Round 70)', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('documents Round 70 flowchart skip→empty Tab regression', () => {
    expect(flowchartSkipTabEmptyCtaR70Regression()).toBe(true)
    expect(flowchartSkipTabEntersEmptyCta()).toBe(true)
  })

  it('resolves the first flowchart empty CTA as next Tab after skip lands on #flow-empty', () => {
    document.body.innerHTML = `
      <div id="flow-empty" tabindex="-1" role="region" class="empty">
        <button type="button" class="btn btn-primary empty-cta" aria-label="从流程图空态导入 CSV">导入 CSV</button>
        <button type="button" class="btn empty-cta" aria-label="从流程图空态合并表">合并表</button>
      </div>
    `
    const opts = { mode: 'flowchart' as const, flowchartEmpty: true, workspaceEmpty: false }
    const landmark = activateWorkspaceSkipFocus(opts)
    expect(landmark?.id).toBe('flow-empty')
    expect(document.activeElement).toBe(landmark)

    const next = resolveNextTabAfterWorkspaceSkip(opts)
    expect(next?.getAttribute('aria-label')).toBe('从流程图空态导入 CSV')
    expect(next?.classList.contains('empty-cta')).toBe(true)
  })
})
