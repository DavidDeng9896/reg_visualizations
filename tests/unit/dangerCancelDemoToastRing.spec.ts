import { afterEach, describe, expect, it, vi } from 'vitest'
import { confirm, isFeedbackCancel, toast } from '@/shared/ui/feedback'
import { dangerDeleteOptions } from '@/shared/ui/dangerConfirm'
import { FOCUS_RESTORE_RING_CLASS } from '@/shared/ui/focusRestore'
import { demoFailToastMessage } from '@/modules/analysis/demoFailToastCreate'
import {
  dangerCancelRestoresRingAndDemoToastInteractive,
  dangerCancelRestoresRingAndToastInteractive,
  dangerConfirmInertsToastHost,
} from '@/shared/ui/dangerCancelFocusRing'

describe('danger Cancel × Demo-fail toast (Round 49)', () => {
  afterEach(() => {
    document.querySelectorAll('[data-ia-feedback],[data-ia-toast-host]').forEach((el) => el.remove())
    document.body.innerHTML = ''
    document.body.style.overflow = ''
  })

  it('documents danger Cancel restoring opener ring with Demo-fail toast interactive', () => {
    expect(dangerConfirmInertsToastHost()).toBe(true)
    expect(dangerCancelRestoresRingAndToastInteractive()).toBe(true)
    expect(dangerCancelRestoresRingAndDemoToastInteractive()).toBe(true)
  })

  it('restores opener ring after Cancel while Demo-fail toast stays interactive', async () => {
    toast('error', demoFailToastMessage())
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
    expect(host.querySelector('.ia-toast--error')?.textContent).toContain('Demo 创建失败')
  })
})
