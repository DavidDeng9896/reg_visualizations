import { afterEach, describe, expect, it, vi } from 'vitest'
import { confirm, isFeedbackCancel, toast } from '@/shared/ui/feedback'
import { dangerDeleteOptions } from '@/shared/ui/dangerConfirm'
import { FOCUS_RESTORE_RING_CLASS } from '@/shared/ui/focusRestore'
import { demoFailToastMessage } from '@/modules/analysis/demoFailToastCreate'
import {
  dangerConfirmInertsToastHost,
  dangerEscRestoresRingAndToastInteractive,
  dangerEscRestoresVisibleRing,
} from '@/shared/ui/dangerCancelFocusRing'

describe('danger Esc × toast inert regression (Round 48)', () => {
  afterEach(() => {
    document.querySelectorAll('[data-ia-feedback],[data-ia-toast-host]').forEach((el) => el.remove())
    document.body.innerHTML = ''
    document.body.style.overflow = ''
  })

  it('documents danger Esc restoring opener ring and clearing toast inert', () => {
    expect(dangerConfirmInertsToastHost()).toBe(true)
    expect(dangerEscRestoresVisibleRing()).toBe(true)
    expect(dangerEscRestoresRingAndToastInteractive()).toBe(true)
  })

  it('inerts Demo-fail toast while danger open, then restores ring + toast after Esc', async () => {
    toast('error', demoFailToastMessage())
    const host = document.querySelector('[data-ia-toast-host]')!

    const opener = document.createElement('button')
    opener.className = 'create-trigger'
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
    expect(host.querySelector('.ia-toast--error')).toBeTruthy()

    const panel = document.querySelector('[data-ia-feedback="confirm"]')!
    panel.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await expect(pending).rejects.toSatisfy((err) => isFeedbackCancel(err))

    expect(document.activeElement).toBe(opener)
    expect(opener.classList.contains(FOCUS_RESTORE_RING_CLASS)).toBe(true)
    expect(host.hasAttribute('inert')).toBe(false)
    expect(host.querySelector('.ia-toast--error')?.textContent).toContain('Demo 创建失败')
  })
})
