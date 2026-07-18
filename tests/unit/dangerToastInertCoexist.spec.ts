import { afterEach, describe, expect, it, vi } from 'vitest'
import { confirm, isFeedbackCancel, toast } from '@/shared/ui/feedback'
import { dangerDeleteOptions } from '@/shared/ui/dangerConfirm'
import { dangerConfirmInertsToastHost } from '@/shared/ui/dangerCancelFocusRing'

describe('danger confirm × toast inert (Round 45)', () => {
  afterEach(() => {
    document.querySelectorAll('[data-ia-feedback],[data-ia-toast-host]').forEach((el) => el.remove())
    document.body.innerHTML = ''
    document.body.style.overflow = ''
  })

  it('documents danger confirm marking toast host inert while open', () => {
    expect(dangerConfirmInertsToastHost()).toBe(true)
  })

  it('inerts toast while danger confirm is open and restores after Cancel', async () => {
    toast('error', 'Demo 创建失败，请刷新后重试')
    const host = document.querySelector('[data-ia-toast-host]')!
    expect(host.hasAttribute('inert')).toBe(false)

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
    // Esc must not dismiss toast while danger owns the layer
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(host.querySelector('.ia-toast--error')).toBeTruthy()

    const cancel = [...document.querySelectorAll('.ia-feedback-panel button')].find(
      (b) => b.textContent === '取消',
    ) as HTMLButtonElement
    cancel.click()
    await expect(pending).rejects.toSatisfy((err) => isFeedbackCancel(err))

    expect(host.hasAttribute('inert')).toBe(false)
    expect(host.querySelector('.ia-toast--error')).toBeTruthy()
  })
})
