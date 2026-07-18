import { afterEach, describe, expect, it } from 'vitest'
import {
  applyListDeleteFocus,
  planListDeleteFocus,
} from '@/modules/analysis/listDeleteFocus'
import {
  listDeletePreservesFilterFocus,
  listDeleteRovingIndex,
  shouldApplyListDeleteFocusAfterSuccess,
} from '@/modules/analysis/listDeleteToastFocus'
import { isListFilterFocusTarget } from '@/modules/analysis/listRowNav'
import { FOCUS_RESTORE_RING_CLASS } from '@/shared/ui/focusRestore'

describe('list delete success × filter focus preserve (Round 50)', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('documents filter-focus preserve contract and helpers', () => {
    expect(listDeletePreservesFilterFocus()).toBe(true)
    expect(shouldApplyListDeleteFocusAfterSuccess(null, 0)).toBe(true)
    expect(shouldApplyListDeleteFocusAfterSuccess(null, 2)).toBe(true)
  })

  it('skips row focus restore when the project filter still owns focus', () => {
    const filter = document.createElement('select')
    filter.setAttribute('data-ia-list-filter', '')
    document.body.appendChild(filter)

    const table = document.createElement('table')
    table.className = 'analysis-table'
    const tbody = document.createElement('tbody')
    const r0 = document.createElement('tr')
    r0.tabIndex = 0
    r0.setAttribute('data-ia-list-row', '0')
    tbody.appendChild(r0)
    table.appendChild(tbody)
    document.body.appendChild(table)

    filter.focus()
    expect(isListFilterFocusTarget(document.activeElement)).toBe(true)
    expect(shouldApplyListDeleteFocusAfterSuccess(document.activeElement, 1)).toBe(false)

    const plan = planListDeleteFocus(0, 1)
    expect(plan).toEqual({ kind: 'row', index: 0 })
    expect(listDeleteRovingIndex(0, 1)).toBe(0)
    // Caller updates roving but must not steal from the filter.
    if (shouldApplyListDeleteFocusAfterSuccess(document.activeElement, 1)) {
      applyListDeleteFocus(plan)
    }

    expect(document.activeElement).toBe(filter)
    expect(r0.classList.contains(FOCUS_RESTORE_RING_CLASS)).toBe(false)
  })

  it('still restores empty Create CTA when the list becomes empty', () => {
    const filter = document.createElement('select')
    filter.setAttribute('data-ia-list-filter', '')
    document.body.appendChild(filter)
    filter.focus()

    expect(shouldApplyListDeleteFocusAfterSuccess(document.activeElement, 0)).toBe(true)
  })
})
