import { afterEach, describe, expect, it, vi } from 'vitest'
import { confirm, isFeedbackCancel, toast } from '@/shared/ui/feedback'
import { dangerDeleteOptions } from '@/shared/ui/dangerConfirm'
import { FOCUS_RESTORE_RING_CLASS } from '@/shared/ui/focusRestore'
import {
  dangerCancelRestoresRingAndToastInteractive,
  dangerCancelToastR58Regression,
  dangerConfirmInertsToastHost,
} from '@/shared/ui/dangerCancelFocusRing'

describe('danger Cancel × toast regression (Round 58)', () => {
  afterEach(() => {
    document.querySelectorAll('[data-ia-feedback],[data-ia-toast-host]').forEach((el) => el.remove())
    document.body.innerHTML = ''
    document.body.style.overflow = ''
  })

  it('documents Round 58 danger Cancel × toast regression contract', () => {
    expect(dangerCancelToastR58Regression()).toBe(true)
    expect(dangerConfirmInertsToastHost()).toBe(true)
    expect(dangerCancelRestoresRingAndToastInteractive()).toBe(true)
  })

  it('restores opener visible ring after Cancel and leaves toast interactive', async () => {
    toast('error', 'Demo 创建失败，请刷新后重试')
    const host = document.querySelector('[data-ia-toast-host]')!

    const opener = document.createElement('button')
    opener.textContent = '删除'
    document.body.appendChild(opener)
    opener.focus()

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
    await vi.waitFor(() => expect(document.activeElement).toBe(cancel))
    expect(cancel.classList.contains(FOCUS_RESTORE_RING_CLASS)).toBe(true)

    cancel.click()
    await expect(pending).rejects.toSatisfy((err) => isFeedbackCancel(err))

    expect(document.activeElement).toBe(opener)
    expect(opener.classList.contains(FOCUS_RESTORE_RING_CLASS)).toBe(true)
    expect(host.hasAttribute('inert')).toBe(false)
    expect(host.querySelector('.ia-toast--error')).toBeTruthy()
  })
})
