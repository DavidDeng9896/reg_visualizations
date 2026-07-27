import { describe, expect, it } from 'vitest'
import { assertReadOnlySelect } from '../../../server/sqlGuard'

describe('sqlGuard', () => {
  it('allows SELECT / WITH', () => {
    expect(assertReadOnlySelect('SELECT 1')).toBe('SELECT 1')
    expect(assertReadOnlySelect('WITH a AS (SELECT 1 AS x) SELECT * FROM a')).toContain('WITH')
  })

  it('rejects writes and multi-statements', () => {
    expect(() => assertReadOnlySelect('DELETE FROM t')).toThrow(/只读/)
    expect(() => assertReadOnlySelect('SELECT 1; SELECT 2')).toThrow(/一条/)
    expect(() => assertReadOnlySelect('DROP TABLE t')).toThrow(/只读|SELECT/)
  })
})
