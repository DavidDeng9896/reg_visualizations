import { afterEach, describe, expect, it, vi } from 'vitest'
import { confirm, isFeedbackCancel, toast } from '@/shared/ui/feedback'
import { dangerDeleteOptions } from '@/shared/ui/dangerConfirm'
import { FOCUS_RESTORE_RING_CLASS } from '@/shared/ui/focusRestore'
import { demoFailToastMessage } from '@/modules/analysis/demoFailToastCreate'
import {
  deleteKeyDangerEscRingCoexistsWithDemoToast,
  deleteKeyDangerEscRingCoexistsWithToast,
} from '@/shared/ui/dangerCancelFocusRing'

describe('Delete Esc ring × Demo-fail toast (Round 48)', () => {
  afterEach(() => {
    document.querySelectorAll('[data-ia-feedback],[data-ia-toast-host]').forEach((el) => el.remove())
    document.body.innerHTML = ''
  })

  it('documents Delete Esc opener ring coexisting with a Demo-fail toast', () => {
    expect(deleteKeyDangerEscRingCoexistsWithToast()).toBe(true)
    expect(deleteKeyDangerEscRingCoexistsWithDemoToast()).toBe(true)
  })

  it('restores row opener ring after Esc while Demo-fail toast stays interactive', async () => {
    toast('error', demoFailToastMessage())
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

    const panel = document.querySelector('[data-ia-feedback="confirm"]')!
    panel.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await expect(pending).rejects.toSatisfy((err) => isFeedbackCancel(err))

    expect(document.activeElement).toBe(row)
    expect(row.classList.contains(FOCUS_RESTORE_RING_CLASS)).toBe(true)
    expect(host.hasAttribute('inert')).toBe(false)
    expect(host.querySelector('.ia-toast--error')?.textContent).toContain('Demo 创建失败')
  })
})
