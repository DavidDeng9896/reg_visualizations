import { describe, expect, it } from 'vitest'
import { addFlags, flagCommentOf, flagSetOf, removeFlags } from '../../../src/modules/charts/flags'
import type { RowFlag } from '../../../src/shared/types'

const base: RowFlag[] = [
  { rowId: 'r1', comment: 'bad' },
  { rowId: 'r2', comment: 'outlier' },
]

describe('addFlags', () => {
  it('comment 必填：空/纯空白 → 错误', () => {
    expect(addFlags([], ['r1'], '').ok).toBe(false)
    expect(addFlags([], ['r1'], '   ').ok).toBe(false)
  })

  it('空选择 → 错误', () => {
    expect(addFlags([], [], 'x').ok).toBe(false)
  })

  it('合并打标：新增 + 保留已有，comment 去空白', () => {
    const res = addFlags(base, ['r3'], '  suspicious  ')
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.flags).toHaveLength(3)
    expect(res.flags.find((f) => f.rowId === 'r3')?.comment).toBe('suspicious')
    expect(res.added).toBe(1)
  })

  it('重复打标同一行 → 覆盖 comment，不产生重复', () => {
    const res = addFlags(base, ['r1'], 'new comment')
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.flags).toHaveLength(2)
    expect(res.flags.find((f) => f.rowId === 'r1')?.comment).toBe('new comment')
  })

  it('rowIds 去重', () => {
    const res = addFlags([], ['r1', 'r1', 'r2'], 'c')
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.flags).toHaveLength(2)
  })

  it('不修改原数组', () => {
    const before = [...base]
    addFlags(base, ['r9'], 'x')
    expect(base).toEqual(before)
  })
})

describe('removeFlags', () => {
  it('移除子集并报告移除数', () => {
    const { flags, removed } = removeFlags(base, ['r1'])
    expect(removed).toBe(1)
    expect(flags).toHaveLength(1)
    expect(flags[0].rowId).toBe('r2')
  })

  it('移除不存在的 id → removed=0', () => {
    const { flags, removed } = removeFlags(base, ['zzz'])
    expect(removed).toBe(0)
    expect(flags).toHaveLength(2)
  })
})

describe('flagSetOf / flagCommentOf', () => {
  it('集合与 comment 查询', () => {
    const set = flagSetOf(base)
    expect(set.has('r1')).toBe(true)
    expect(set.has('r9')).toBe(false)
    expect(flagSetOf(undefined).size).toBe(0)
    expect(flagCommentOf(base, 'r2')).toBe('outlier')
    expect(flagCommentOf(base, 'r9')).toBeUndefined()
  })
})
