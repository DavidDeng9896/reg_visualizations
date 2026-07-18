import { afterEach, describe, expect, it } from 'vitest'
import {
  isListLandmarkFocusTarget,
  listLandmarkMigrateLeavesFilterFocus,
  shouldMigrateListLandmarkFocus,
} from '@/modules/analysis/listFocusOrder'

describe('landmark migrate × filter select (Round 48)', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('documents that landmark migrate never steals focus from the filter select', () => {
    expect(listLandmarkMigrateLeavesFilterFocus()).toBe(true)
  })

  it('does not migrate when focus is on the project filter during empty ↔ rows', () => {
    document.body.innerHTML = `
      <select data-ia-list-filter>
        <option value="">全部</option>
        <option value="p1">P1</option>
      </select>
      <div id="analysis-list" tabindex="-1" role="region">empty</div>
    `
    const filter = document.querySelector('[data-ia-list-filter]') as HTMLSelectElement
    filter.focus()
    expect(document.activeElement).toBe(filter)
    expect(isListLandmarkFocusTarget(document.activeElement)).toBe(false)

    const before = { ready: true, hasRows: true }
    const after = { ready: true, hasRows: false }
    expect(shouldMigrateListLandmarkFocus(false, before, after)).toBe(false)
    expect(document.activeElement).toBe(filter)
  })

  it('still migrates when focus was on the old landmark (not the filter)', () => {
    const before = { ready: true, hasRows: true }
    const after = { ready: true, hasRows: false }
    expect(shouldMigrateListLandmarkFocus(true, before, after)).toBe(true)
  })
})
