import { describe, expect, it } from 'vitest'
import { combineTables } from '@/modules/table/join'
import type { TableColumn } from '@/shared/types/analysis'

const cols: TableColumn[] = [
  { field: 'id', title: 'id', dataType: 'string' },
  { field: 'v', title: 'v', dataType: 'number' },
]

describe('combineTables', () => {
  it('inner join matches keys', () => {
    const result = combineTables({
      leftColumns: cols,
      leftRows: [
        { id: 'a', v: 1 },
        { id: 'b', v: 2 },
      ],
      rightColumns: cols,
      rightRows: [
        { id: 'a', v: 10 },
        { id: 'c', v: 30 },
      ],
      joinType: 'inner',
      leftKeys: ['id'],
      rightKeys: ['id'],
    })
    expect(result.rows).toHaveLength(1)
    expect(result.rows[0].id).toBe('a')
  })

  it('append stacks rows', () => {
    const result = combineTables({
      leftColumns: cols,
      leftRows: [{ id: 'a', v: 1 }],
      rightColumns: cols,
      rightRows: [{ id: 'b', v: 2 }],
      joinType: 'append',
    })
    expect(result.rows).toHaveLength(2)
  })
})
