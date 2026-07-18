import { afterEach, describe, expect, it } from 'vitest'
import {
  applyListDeleteFocus,
  planListDeleteFocus,
} from '@/modules/analysis/listDeleteFocus'
import {
  listDeleteClampsRovingWithToast,
  listDeleteRovingIndex,
  listDeleteSuccessToastMessage,
} from '@/modules/analysis/listDeleteToastFocus'
import { clampListRowFocus } from '@/modules/analysis/listRowNav'
import { FOCUS_RESTORE_RING_CLASS } from '@/shared/ui/focusRestore'
import { toast } from '@/shared/ui/feedback'

describe('list delete roving clamp × toast (Round 49)', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    document.querySelectorAll('[data-ia-toast-host]').forEach((el) => el.remove())
  })

  it('documents delete success clamping roving index while toast coexists', () => {
    expect(listDeleteClampsRovingWithToast()).toBe(true)
  })

  it('clamps roving to the last remaining row when the last row is deleted', () => {
    // Was on index 2 of 3; after delete 2 remain → land on index 1
    expect(listDeleteRovingIndex(2, 2)).toBe(1)
    expect(listDeleteRovingIndex(2, 2)).toBe(clampListRowFocus(2, 2))
    expect(planListDeleteFocus(2, 2)).toEqual({ kind: 'row', index: 1 })
    expect(listDeleteRovingIndex(0, 0)).toBeNull()
  })

  it('keeps clamped row focus ring while delete success toast is visible', () => {
    const table = document.createElement('table')
    table.className = 'analysis-table'
    const tbody = document.createElement('tbody')
    const r0 = document.createElement('tr')
    r0.tabIndex = -1
    r0.setAttribute('data-ia-list-row', '0')
    const r1 = document.createElement('tr')
    r1.tabIndex = 0
    r1.setAttribute('data-ia-list-row', '1')
    tbody.append(r0, r1)
    table.appendChild(tbody)
    document.body.appendChild(table)

    const idx = listDeleteRovingIndex(2, 2)
    expect(idx).toBe(1)
    applyListDeleteFocus({ kind: 'row', index: idx! })
    toast('success', listDeleteSuccessToastMessage())

    expect(document.activeElement).toBe(r1)
    expect(r1.classList.contains(FOCUS_RESTORE_RING_CLASS)).toBe(true)
    expect(document.querySelector('.ia-toast--success')?.textContent).toContain('已删除')
    expect(document.querySelector('[data-ia-toast-host]')?.hasAttribute('inert')).toBe(false)
  })
})
