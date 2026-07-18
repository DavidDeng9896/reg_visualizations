import { afterEach, describe, expect, it, vi } from 'vitest'
import { confirm, isFeedbackCancel } from '@/shared/ui/feedback'
import { dangerDeleteOptions } from '@/shared/ui/dangerConfirm'
import { FOCUS_RESTORE_RING_CLASS } from '@/shared/ui/focusRestore'
import { listRowDeleteKeyEnabled } from '@/modules/analysis/listRowNav'
import {
  dangerCancelUsesVisibleRing,
  deleteKeyDangerCancelUsesVisibleRing,
} from '@/shared/ui/dangerCancelFocusRing'

describe('Delete key × danger Cancel ring (Round 44)', () => {
  afterEach(() => {
    document.querySelectorAll('[data-ia-feedback],[data-ia-toast-host]').forEach((el) => el.remove())
    document.body.innerHTML = ''
  })

  it('documents Delete-key path landing Cancel with a visible ring', () => {
    expect(listRowDeleteKeyEnabled()).toBe(true)
    expect(dangerCancelUsesVisibleRing()).toBe(true)
    expect(deleteKeyDangerCancelUsesVisibleRing()).toBe(true)
  })

  it('paints a visible restore ring on Cancel when Delete opens danger confirm from a row', async () => {
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
    const cancel = [...document.querySelectorAll('.ia-feedback-panel button')].find(
      (b) => b.textContent === '取消',
    ) as HTMLButtonElement
    await vi.waitFor(() => expect(document.activeElement).toBe(cancel))
    expect(cancel.classList.contains(FOCUS_RESTORE_RING_CLASS)).toBe(true)

    cancel.click()
    await expect(pending).rejects.toSatisfy((err) => isFeedbackCancel(err))
    expect(document.activeElement).toBe(row)
  })
})
