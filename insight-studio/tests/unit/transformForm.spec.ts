import { describe, expect, it } from 'vitest'
import type { ColumnMeta, Row } from '../../src/shared/types'
import { ROW_ID_FIELD } from '../../src/shared/types'
import { createTransform } from '../../src/shared/factories'
import { derivedPreview, validateDerived, validateTransformDraft } from '../../src/modules/table/transformForm'

const cols: ColumnMeta[] = [
  { field: 'a', title: 'a', dataType: 'number' },
  { field: 'b', title: 'b', dataType: 'number' },
  { field: 'name', title: 'name', dataType: 'string' },
]

const rows: Row[] = [1, 2, 3].map((i) => ({ [ROW_ID_FIELD]: `r${i}`, a: i, b: i * 10, name: `n${i}` }))

describe('validateDerived', () => {
  it('名称非空且不冲突', () => {
    expect(validateDerived('', 'a + 1', cols).ok).toBe(false)
    expect(validateDerived('a', 'a + 1', cols).errors.some((e) => e.includes('已存在'))).toBe(true)
    expect(validateDerived('c', 'a + 1', cols).ok).toBe(true)
  })
  it('表达式语法错误被捕获并标出', () => {
    const r = validateDerived('c', 'a +* b', cols)
    expect(r.ok).toBe(false)
    expect(r.errors.length).toBeGreaterThan(0)
  })
  it('空表达式报错', () => {
    expect(validateDerived('c', '   ', cols).ok).toBe(false)
  })
})

describe('validateTransformDraft', () => {
  it('select 需要至少一列', () => {
    expect(validateTransformDraft(createTransform('select', { mode: 'keep', columns: [] }), cols).ok).toBe(false)
    expect(validateTransformDraft(createTransform('select', { mode: 'drop', columns: ['a'] }), cols).ok).toBe(true)
  })
  it('rename 检测空名与重名', () => {
    expect(validateTransformDraft(createTransform('rename', { renames: [] }), cols).ok).toBe(false)
    expect(
      validateTransformDraft(createTransform('rename', { renames: [{ from: 'a', to: '' }] }), cols).ok,
    ).toBe(false)
    expect(
      validateTransformDraft(
        createTransform('rename', {
          renames: [
            { from: 'a', to: 'x' },
            { from: 'b', to: 'x' },
          ],
        }),
        cols,
      ).ok,
    ).toBe(false)
  })
  it('derived 走 validateDerived；dedupe 空列合法；sort 需要键', () => {
    expect(validateTransformDraft(createTransform('derived', { name: 'c', expression: 'a+1' }), cols).ok).toBe(true)
    expect(validateTransformDraft(createTransform('dedupe', { columns: [] }), cols).ok).toBe(true)
    expect(validateTransformDraft(createTransform('sort', { keys: [] }), cols).ok).toBe(false)
    expect(validateTransformDraft(createTransform('sort', { keys: [{ column: 'a', direction: 'asc' }] }), cols).ok).toBe(true)
  })
})

describe('derivedPreview', () => {
  it('返回前 N 行计算值', () => {
    expect(derivedPreview('a + b', rows, 2)).toEqual([11, 22])
    expect(derivedPreview("concat(name, '-', a)", rows, 3)).toEqual(['n1-1', 'n2-2', 'n3-3'])
  })
  it('表达式非法返回 null；运行时错误置 null', () => {
    expect(derivedPreview('a +* ', rows)).toBeNull()
    expect(derivedPreview('a / 0', rows, 1)).toEqual([null])
  })
})
