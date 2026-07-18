import { describe, expect, it } from 'vitest'
import {
  resolveListRowKeyAction,
  listRowDeleteKeyEnabled,
} from '@/modules/analysis/listRowNav'

describe('listRowDeleteKey (Round 42)', () => {
  it('enables Delete key alongside row roving', () => {
    expect(listRowDeleteKeyEnabled()).toBe(true)
  })

  it('maps Delete to a delete action without conflicting with activate', () => {
    expect(resolveListRowKeyAction('Delete')).toBe('delete')
    expect(resolveListRowKeyAction('Enter')).toBe('activate')
    expect(resolveListRowKeyAction('ArrowDown')).toBe('next')
  })
})
