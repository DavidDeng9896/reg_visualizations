import { afterEach, describe, expect, it } from 'vitest'
import {
  applyListDeleteFocus,
  planListDeleteFocus,
} from '@/modules/analysis/listDeleteFocus'
import {
  listDeleteEmptyCtaCoexistsWithToast,
  listDeleteSuccessToastMessage,
  listEmptyCtaToastR81Regression,
} from '@/modules/analysis/listDeleteToastFocus'
import { FOCUS_RESTORE_RING_CLASS } from '@/shared/ui/focusRestore'
import { toast } from '@/shared/ui/feedback'

describe('list empty Create CTA × toast regression (Round 81)', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    document.querySelectorAll('[data-ia-toast-host]').forEach((el) => el.remove())
  })

  it('documents Round 81 empty Create CTA × toast regression contract', () => {
    expect(listDeleteEmptyCtaCoexistsWithToast()).toBe(true)
    expect(listEmptyCtaToastR81Regression()).toBe(true)
    expect(planListDeleteFocus(0, 0)).toEqual({ kind: 'empty-create' })
  })

  it('keeps visible restore ring on empty Create CTA while success toast is interactive', () => {
    const empty = document.createElement('div')
    empty.className = 'empty-list'
    const cta = document.createElement('button')
    cta.className = 'btn btn-primary empty-cta create-trigger'
    empty.appendChild(cta)
    document.body.appendChild(empty)

    applyListDeleteFocus({ kind: 'empty-create' })
    toast('success', listDeleteSuccessToastMessage())

    expect(document.activeElement).toBe(cta)
    expect(cta.classList.contains(FOCUS_RESTORE_RING_CLASS)).toBe(true)
    expect(document.querySelector('.ia-toast--success')?.textContent).toContain('已删除')
    expect(document.querySelector('[data-ia-toast-host]')?.hasAttribute('inert')).toBe(false)
  })
})
