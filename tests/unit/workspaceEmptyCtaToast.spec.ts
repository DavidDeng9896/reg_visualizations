import { afterEach, describe, expect, it } from 'vitest'
import {
  applyWorkspaceEmptyCtaFocus,
  workspaceEmptyCtaCoexistsWithToast,
  workspaceEmptyCtaSelector,
} from '@/modules/table/workspaceEmpty'
import { FOCUS_RESTORE_RING_CLASS } from '@/shared/ui/focusRestore'
import { toast } from '@/shared/ui/feedback'

describe('workspace empty CTA × toast (Round 52)', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    document.querySelectorAll('[data-ia-toast-host]').forEach((el) => el.remove())
  })

  it('documents workspace empty CTA focus ring coexisting with a toast', () => {
    expect(workspaceEmptyCtaCoexistsWithToast()).toBe(true)
    expect(workspaceEmptyCtaSelector()).toBe('#ws-empty .empty-cta')
  })

  it('keeps visible restore ring on workspace CSV CTA while toast stays interactive', () => {
    const empty = document.createElement('div')
    empty.id = 'ws-empty'
    empty.className = 'empty'
    const csv = document.createElement('button')
    csv.className = 'btn btn-primary empty-cta'
    csv.setAttribute('aria-label', '从工作区空态导入 CSV')
    csv.textContent = '导入 CSV'
    const combine = document.createElement('button')
    combine.className = 'btn empty-cta'
    combine.setAttribute('aria-label', '从工作区空态合并表')
    combine.textContent = '合并表'
    empty.appendChild(csv)
    empty.appendChild(combine)
    document.body.appendChild(empty)

    applyWorkspaceEmptyCtaFocus()
    toast('success', '已导入')

    expect(document.activeElement).toBe(csv)
    expect(csv.classList.contains(FOCUS_RESTORE_RING_CLASS)).toBe(true)
    expect(document.querySelector('.ia-toast--success')?.textContent).toContain('已导入')
    expect(document.querySelector('[data-ia-toast-host]')?.hasAttribute('inert')).toBe(false)
  })
})
