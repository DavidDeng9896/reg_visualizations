import { describe, expect, it } from 'vitest'
import {
  newViewDialogDefaults,
  resolveNewViewRestoreFocus,
} from '@/modules/sidebar/newViewHandoff'

describe('newViewHandoff', () => {
  it('defaults new-view dialog fields for a table parent', () => {
    expect(newViewDialogDefaults({ tableId: 't1', parentId: 't1' })).toEqual({
      tableId: 't1',
      parentId: 't1',
      name: 'New view',
      viewType: 'table',
    })
  })

  it('prefers an explicit restore target over activeElement', () => {
    const explicit = document.createElement('button')
    const other = document.createElement('button')
    document.body.append(explicit, other)
    other.focus()
    expect(resolveNewViewRestoreFocus(explicit)).toBe(explicit)
    expect(resolveNewViewRestoreFocus(null)).toBe(other)
    document.body.innerHTML = ''
  })
})
