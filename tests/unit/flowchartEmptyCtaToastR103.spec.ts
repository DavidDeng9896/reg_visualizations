import { afterEach, describe, expect, it } from 'vitest'
import {
  applyFlowchartEmptyCtaFocus,
  flowchartEmptyCtaCoexistsWithToast,
  flowchartEmptyCtaToastR103Regression,
} from '@/modules/flowchart/flowchartEmpty'
import { FOCUS_RESTORE_RING_CLASS } from '@/shared/ui/focusRestore'
import { toast } from '@/shared/ui/feedback'

describe('flowchart empty CTA × toast regression (Round 103)', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    document.querySelectorAll('[data-ia-toast-host]').forEach((el) => el.remove())
  })

  it('documents Round 103 flowchart empty CTA × toast regression', () => {
    expect(flowchartEmptyCtaToastR103Regression()).toBe(true)
    expect(flowchartEmptyCtaCoexistsWithToast()).toBe(true)
  })

  it('keeps visible restore ring on flowchart CSV CTA while toast stays interactive', () => {
    const empty = document.createElement('div')
    empty.id = 'flow-empty'
    empty.className = 'flow-empty'
    const csv = document.createElement('button')
    csv.className = 'btn btn-primary empty-cta'
    csv.setAttribute('aria-label', '从流程图空态导入 CSV')
    csv.textContent = '导入 CSV'
    empty.appendChild(csv)
    document.body.appendChild(empty)

    applyFlowchartEmptyCtaFocus()
    toast('success', '已合并')

    expect(document.activeElement).toBe(csv)
    expect(csv.classList.contains(FOCUS_RESTORE_RING_CLASS)).toBe(true)
    expect(document.querySelector('.ia-toast--success')?.textContent).toContain('已合并')
    expect(document.querySelector('[data-ia-toast-host]')?.hasAttribute('inert')).toBe(false)
  })
})
