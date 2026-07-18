import { describe, expect, it } from 'vitest'
import {
  listFilterBeforeRows,
  listFilterSelector,
  listRowsSelector,
  listChromeFocusOrder,
} from '@/modules/analysis/listFocusOrder'

describe('listFocusOrder (Round 42)', () => {
  it('places the project filter before the roving row group in Tab order', () => {
    expect(listFilterBeforeRows()).toBe(true)
    expect(listChromeFocusOrder()).toEqual(['filter', 'rows'])
    expect(listFilterSelector()).toBe('[data-ia-list-filter]')
    expect(listRowsSelector()).toBe('[data-ia-list-row]')
  })
})
