import { afterEach, describe, expect, it } from 'vitest'
import {
  applyListDeleteFocus,
  planListDeleteFocus,
} from '@/modules/analysis/listDeleteFocus'
import {
  listDeleteSuccessToastMessage,
  listDeleteToastCoexistsWithFocusRing,
} from '@/modules/analysis/listDeleteToastFocus'
import { FOCUS_RESTORE_RING_CLASS } from '@/shared/ui/focusRestore'
import { toast } from '@/shared/ui/feedback'

describe('listDeleteToastFocus (Round 41)', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    document.querySelectorAll('[data-ia-toast-host]').forEach((el) => el.remove())
  })

  it('documents delete success toast × focus-ring coexistence', () => {
    expect(listDeleteToastCoexistsWithFocusRing()).toBe(true)
    expect(listDeleteSuccessToastMessage()).toBe('已删除')
  })

  it('keeps focus ring on remaining row while delete success toast is visible', () => {
    const table = document.createElement('table')
    table.className = 'analysis-table'
    const tbody = document.createElement('tbody')
    const r0 = document.createElement('tr')
    r0.tabIndex = 0
    tbody.appendChild(r0)
    table.appendChild(tbody)
    document.body.appendChild(table)

    const plan = planListDeleteFocus(0, 1)
    applyListDeleteFocus(plan)
    toast('success', listDeleteSuccessToastMessage())

    expect(document.activeElement).toBe(r0)
    expect(r0.classList.contains(FOCUS_RESTORE_RING_CLASS)).toBe(true)
    expect(document.querySelector('.ia-toast--success')?.textContent).toContain('已删除')
    expect(document.querySelector('[data-ia-toast-host]')?.hasAttribute('inert')).toBe(false)
  })
})
