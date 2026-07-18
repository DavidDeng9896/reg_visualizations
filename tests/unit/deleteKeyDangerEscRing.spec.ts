import { afterEach, describe, expect, it, vi } from 'vitest'
import { confirm, isFeedbackCancel } from '@/shared/ui/feedback'
import { dangerDeleteOptions } from '@/shared/ui/dangerConfirm'
import { FOCUS_RESTORE_RING_CLASS } from '@/shared/ui/focusRestore'
import { listRowDeleteKeyEnabled } from '@/modules/analysis/listRowNav'
import { dangerEscRestoresVisibleRing } from '@/shared/ui/dangerCancelFocusRing'

describe('Delete key × danger Esc ring (Round 43)', () => {
  afterEach(() => {
    document.querySelectorAll('[data-ia-feedback],[data-ia-toast-host]').forEach((el) => el.remove())
    document.body.innerHTML = ''
  })

  it('keeps Delete-key remove path + Esc restore ring contract', () => {
    expect(listRowDeleteKeyEnabled()).toBe(true)
    expect(dangerEscRestoresVisibleRing()).toBe(true)
  })

  it('restores the focused list row opener with a visible ring after Esc', async () => {
    // Simulate Delete pressed on a roving row: the row itself is the confirm opener.
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
    const panel = document.querySelector('[data-ia-feedback="confirm"]')!
    panel.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))

    await expect(pending).rejects.toSatisfy((err) => isFeedbackCancel(err))
    expect(document.activeElement).toBe(row)
    expect(row.classList.contains(FOCUS_RESTORE_RING_CLASS)).toBe(true)
  })
})
