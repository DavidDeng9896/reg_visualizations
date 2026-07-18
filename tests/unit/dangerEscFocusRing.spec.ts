import { afterEach, describe, expect, it, vi } from 'vitest'
import { confirm, isFeedbackCancel } from '@/shared/ui/feedback'
import { dangerDeleteOptions } from '@/shared/ui/dangerConfirm'
import { FOCUS_RESTORE_RING_CLASS } from '@/shared/ui/focusRestore'
import { dangerEscRestoresVisibleRing } from '@/shared/ui/dangerCancelFocusRing'

describe('dangerEscFocusRing (Round 42)', () => {
  afterEach(() => {
    document.querySelectorAll('[data-ia-feedback],[data-ia-toast-host]').forEach((el) => el.remove())
    document.body.innerHTML = ''
  })

  it('documents Esc cancel restoring the opener with a visible ring', () => {
    expect(dangerEscRestoresVisibleRing()).toBe(true)
  })

  it('paints a visible restore ring on the Delete opener after Esc', async () => {
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
    const panel = document.querySelector('[data-ia-feedback="confirm"]')!
    panel.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))

    await expect(pending).rejects.toSatisfy((err) => isFeedbackCancel(err))
    expect(document.activeElement).toBe(opener)
    expect(opener.classList.contains(FOCUS_RESTORE_RING_CLASS)).toBe(true)
  })
})
