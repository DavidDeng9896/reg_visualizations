import { afterEach, describe, expect, it } from 'vitest'
import {
  applySidebarEmptyCtaFocus,
  sidebarEmptyCtaCoexistsWithToast,
  sidebarEmptyCtaToastR114Regression,
} from '@/modules/sidebar/sidebarEmpty'
import { FOCUS_RESTORE_RING_CLASS } from '@/shared/ui/focusRestore'
import { toast } from '@/shared/ui/feedback'

describe('sidebar empty CTA × toast regression (Round 114)', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    document.querySelectorAll('[data-ia-toast-host]').forEach((el) => el.remove())
  })

  it('documents Round 114 sidebar empty CTA × toast regression', () => {
    expect(sidebarEmptyCtaToastR114Regression()).toBe(true)
    expect(sidebarEmptyCtaCoexistsWithToast()).toBe(true)
  })

  it('keeps visible restore ring on sidebar CSV CTA while toast stays interactive', () => {
    const empty = document.createElement('div')
    empty.id = 'sidebar-empty'
    empty.className = 'empty'
    const csv = document.createElement('button')
    csv.className = 'btn btn-primary empty-cta'
    csv.setAttribute('aria-label', '从侧栏空态导入 CSV')
    csv.textContent = '导入 CSV'
    empty.appendChild(csv)
    document.body.appendChild(empty)

    applySidebarEmptyCtaFocus()
    toast('success', '已导入')

    expect(document.activeElement).toBe(csv)
    expect(csv.classList.contains(FOCUS_RESTORE_RING_CLASS)).toBe(true)
    expect(document.querySelector('.ia-toast--success')?.textContent).toContain('已导入')
    expect(document.querySelector('[data-ia-toast-host]')?.hasAttribute('inert')).toBe(false)
  })
})
