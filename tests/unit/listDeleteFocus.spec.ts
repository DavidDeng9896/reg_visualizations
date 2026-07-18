import { afterEach, describe, expect, it } from 'vitest'
import {
  applyListDeleteFocus,
  listDeleteEmptyCreateSelector,
  listDeleteRowSelector,
  planListDeleteFocus,
} from '@/modules/analysis/listDeleteFocus'
import { FOCUS_RESTORE_RING_CLASS } from '@/shared/ui/focusRestore'

describe('listDeleteFocus (Round 40)', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('plans focus on the next remaining row after a mid-list delete', () => {
    expect(planListDeleteFocus(1, 3)).toEqual({ kind: 'row', index: 1 })
    expect(planListDeleteFocus(0, 2)).toEqual({ kind: 'row', index: 0 })
  })

  it('plans focus on the previous row when the last row is deleted', () => {
    expect(planListDeleteFocus(2, 2)).toEqual({ kind: 'row', index: 1 })
  })

  it('plans empty-create fallback when the list becomes empty', () => {
    expect(planListDeleteFocus(0, 0)).toEqual({ kind: 'empty-create' })
    expect(listDeleteEmptyCreateSelector()).toBe('.empty-list .empty-cta.btn-primary.create-trigger')
    expect(listDeleteRowSelector(1)).toBe('.analysis-table tbody tr:nth-child(2)')
  })

  it('restores focus to the planned row with a visible ring after delete', () => {
    const table = document.createElement('table')
    table.className = 'analysis-table'
    const tbody = document.createElement('tbody')
    const r0 = document.createElement('tr')
    r0.tabIndex = 0
    const r1 = document.createElement('tr')
    r1.tabIndex = 0
    tbody.append(r0, r1)
    table.appendChild(tbody)
    document.body.appendChild(table)

    const other = document.createElement('button')
    document.body.appendChild(other)
    other.focus()

    applyListDeleteFocus({ kind: 'row', index: 1 })
    expect(document.activeElement).toBe(r1)
    expect(r1.classList.contains(FOCUS_RESTORE_RING_CLASS)).toBe(true)
  })

  it('falls back to empty Create CTA (then header Create) when no rows remain', () => {
    const empty = document.createElement('div')
    empty.className = 'empty-list'
    const cta = document.createElement('button')
    cta.className = 'btn btn-primary empty-cta create-trigger'
    empty.appendChild(cta)
    document.body.appendChild(empty)

    const other = document.createElement('button')
    document.body.appendChild(other)
    other.focus()

    applyListDeleteFocus({ kind: 'empty-create' })
    expect(document.activeElement).toBe(cta)
    expect(cta.classList.contains(FOCUS_RESTORE_RING_CLASS)).toBe(true)
  })
})
