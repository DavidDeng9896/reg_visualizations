import { afterEach, describe, expect, it, vi } from 'vitest'
import { confirm, isFeedbackCancel, toast } from '@/shared/ui/feedback'
import { dangerDeleteOptions } from '@/shared/ui/dangerConfirm'
import { FOCUS_RESTORE_RING_CLASS } from '@/shared/ui/focusRestore'
import { listDeleteSuccessToastMessage } from '@/modules/analysis/listDeleteToastFocus'
import {
  deleteKeyDangerCancelRestoresOpenerRing,
  deleteKeyDangerCancelRingCoexistsWithToast,
} from '@/shared/ui/dangerCancelFocusRing'

describe('Delete Cancel ring × toast (Round 46)', () => {
  afterEach(() => {
    document.querySelectorAll('[data-ia-feedback],[data-ia-toast-host]').forEach((el) => el.remove())
    document.body.innerHTML = ''
  })

  it('documents Delete Cancel opener ring coexisting with a visible toast', () => {
    expect(deleteKeyDangerCancelRestoresOpenerRing()).toBe(true)
    expect(deleteKeyDangerCancelRingCoexistsWithToast()).toBe(true)
  })

  it('restores row opener ring after Cancel while a success toast stays interactive', async () => {
    toast('success', listDeleteSuccessToastMessage())
    const host = document.querySelector('[data-ia-toast-host]')!
    expect(host.hasAttribute('inert')).toBe(false)

    const row = document.createElement('tr')
    row.setAttribute('data-ia-list-row', '0')
    row.tabIndex = 0
    row.textContent = 'Demo Analysis'
    document.body.appendChild(row)
    row.focus()

    const pending = confirm(
      '确定删除该 Analysis？此操作不可撤销。',
      '删除 Analysis',
      dangerDeleteOptions('删除'),
    )
    await vi.waitFor(() => expect(document.querySelector('[data-ia-feedback="confirm"]')).toBeTruthy())
    expect(host.hasAttribute('inert')).toBe(true)

    const cancel = [...document.querySelectorAll('.ia-feedback-panel button')].find(
      (b) => b.textContent === '取消',
    ) as HTMLButtonElement
    cancel.click()
    await expect(pending).rejects.toSatisfy((err) => isFeedbackCancel(err))

    expect(document.activeElement).toBe(row)
    expect(row.classList.contains(FOCUS_RESTORE_RING_CLASS)).toBe(true)
    expect(host.hasAttribute('inert')).toBe(false)
    expect(host.querySelector('.ia-toast--success')?.textContent).toContain('已删除')
  })
})
