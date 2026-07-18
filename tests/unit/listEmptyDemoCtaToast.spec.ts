import { afterEach, describe, expect, it } from 'vitest'
import {
  applyEmptyDemoCtaFocus,
  listEmptyDemoCtaCoexistsWithToast,
  listEmptyDemoCtaSelector,
} from '@/modules/analysis/listDeleteToastFocus'
import { FOCUS_RESTORE_RING_CLASS } from '@/shared/ui/focusRestore'
import { toast } from '@/shared/ui/feedback'

describe('list empty Demo CTA × toast (Round 51)', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    document.querySelectorAll('[data-ia-toast-host]').forEach((el) => el.remove())
  })

  it('documents empty Demo CTA focus ring coexisting with a toast', () => {
    expect(listEmptyDemoCtaCoexistsWithToast()).toBe(true)
    expect(listEmptyDemoCtaSelector()).toBe('.empty-list .empty-cta:not(.create-trigger)')
  })

  it('keeps visible restore ring on empty Demo CTA while toast stays interactive', () => {
    const empty = document.createElement('div')
    empty.className = 'empty-list'
    empty.id = 'analysis-list'
    const demo = document.createElement('button')
    demo.className = 'btn empty-cta'
    demo.textContent = '一键 Demo'
    const create = document.createElement('button')
    create.className = 'btn btn-primary empty-cta create-trigger'
    create.textContent = '+ Create Analysis'
    empty.appendChild(demo)
    empty.appendChild(create)
    document.body.appendChild(empty)

    applyEmptyDemoCtaFocus()
    toast('success', '已删除')

    expect(document.activeElement).toBe(demo)
    expect(demo.classList.contains(FOCUS_RESTORE_RING_CLASS)).toBe(true)
    expect(document.querySelector('.ia-toast--success')?.textContent).toContain('已删除')
    expect(document.querySelector('[data-ia-toast-host]')?.hasAttribute('inert')).toBe(false)
  })
})
