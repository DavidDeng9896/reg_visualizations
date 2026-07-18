import { afterEach, describe, expect, it } from 'vitest'
import {
  applyFlowchartEmptyCtaFocus,
  flowchartEmptyCtaCoexistsWithToast,
  flowchartEmptyCtaSelector,
} from '@/modules/flowchart/flowchartEmpty'
import { FOCUS_RESTORE_RING_CLASS } from '@/shared/ui/focusRestore'
import { toast } from '@/shared/ui/feedback'

describe('flowchart empty CTA × toast (Round 53)', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    document.querySelectorAll('[data-ia-toast-host]').forEach((el) => el.remove())
  })

  it('documents flowchart empty CTA focus ring coexisting with a toast', () => {
    expect(flowchartEmptyCtaCoexistsWithToast()).toBe(true)
    expect(flowchartEmptyCtaSelector()).toBe('#flow-empty .empty-cta')
  })

  it('keeps visible restore ring on flowchart CSV CTA while toast stays interactive', () => {
    const empty = document.createElement('div')
    empty.id = 'flow-empty'
    empty.className = 'flow-empty'
    const csv = document.createElement('button')
    csv.className = 'btn btn-primary empty-cta'
    csv.setAttribute('aria-label', '从流程图空态导入 CSV')
    csv.textContent = '导入 CSV'
    const combine = document.createElement('button')
    combine.className = 'btn empty-cta'
    combine.setAttribute('aria-label', '从流程图空态合并表')
    combine.textContent = '合并表'
    empty.appendChild(csv)
    empty.appendChild(combine)
    document.body.appendChild(empty)

    applyFlowchartEmptyCtaFocus()
    toast('success', '已合并')

    expect(document.activeElement).toBe(csv)
    expect(csv.classList.contains(FOCUS_RESTORE_RING_CLASS)).toBe(true)
    expect(document.querySelector('.ia-toast--success')?.textContent).toContain('已合并')
    expect(document.querySelector('[data-ia-toast-host]')?.hasAttribute('inert')).toBe(false)
  })
})
