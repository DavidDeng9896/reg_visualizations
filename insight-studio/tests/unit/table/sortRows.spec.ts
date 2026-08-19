import { describe, expect, it } from 'vitest'
import { nextSortDirection, sortRows } from '../../../src/shared/pipeline'
import type { Row } from '../../../src/shared/types'

describe('列头排序', () => {
  it('点击列头在 升序 → 降序 → 清除 之间循环', () => {
    expect(nextSortDirection(null, 'sepal_length')).toEqual({ field: 'sepal_length', direction: 'asc' })
    expect(nextSortDirection({ field: 'sepal_length', direction: 'asc' }, 'sepal_length')).toEqual({
      field: 'sepal_length',
      direction: 'desc',
    })
    expect(nextSortDirection({ field: 'sepal_length', direction: 'desc' }, 'sepal_length')).toBeNull()
    expect(nextSortDirection({ field: 'other', direction: 'asc' }, 'sepal_length')).toEqual({
      field: 'sepal_length',
      direction: 'asc',
    })
  })

  it('数值列按数值排序，而不是字符串顺序', () => {
    const rows: Row[] = [
      { sepal_length: 4.83 },
      { sepal_length: 4.94 },
      { sepal_length: 5.44 },
      { sepal_length: 4.74 },
    ]
    const asc = sortRows(rows, 'sepal_length', 'asc', 'number').map((r) => r.sepal_length)
    expect(asc).toEqual([4.74, 4.83, 4.94, 5.44])
    const desc = sortRows(rows, 'sepal_length', 'desc', 'number').map((r) => r.sepal_length)
    expect(desc).toEqual([5.44, 4.94, 4.83, 4.74])
  })
})
