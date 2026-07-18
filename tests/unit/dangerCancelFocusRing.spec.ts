import { afterEach, describe, expect, it, vi } from 'vitest'
import { confirm, isFeedbackCancel } from '@/shared/ui/feedback'
import { dangerDeleteOptions } from '@/shared/ui/dangerConfirm'
import { FOCUS_RESTORE_RING_CLASS } from '@/shared/ui/focusRestore'
import { dangerCancelUsesVisibleRing } from '@/shared/ui/dangerCancelFocusRing'

describe('dangerCancelFocusRing (Round 41)', () => {
  afterEach(() => {
    document.querySelectorAll('[data-ia-feedback],[data-ia-toast-host]').forEach((el) => el.remove())
    document.body.innerHTML = ''
  })

  it('documents Cancel visible-ring policy for danger confirms', () => {
    expect(dangerCancelUsesVisibleRing()).toBe(true)
  })

  it('paints a visible restore ring on Cancel when a danger confirm opens', async () => {
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
    const cancel = [...document.querySelectorAll('.ia-feedback-panel button')].find(
      (b) => b.textContent === '取消',
    ) as HTMLButtonElement
    await vi.waitFor(() => expect(document.activeElement).toBe(cancel))
    expect(cancel.classList.contains(FOCUS_RESTORE_RING_CLASS)).toBe(true)

    cancel.click()
    await expect(pending).rejects.toSatisfy((err) => isFeedbackCancel(err))
  })
})
