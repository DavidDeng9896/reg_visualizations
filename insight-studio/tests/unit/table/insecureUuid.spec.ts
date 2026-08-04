import { describe, expect, it, vi, afterEach } from 'vitest'
import { uuid } from '../../../src/shared/id'
import { defaultProfile } from '../../../src/modules/table/dbConnectionTypes'

describe('uuid / defaultProfile 非安全上下文', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('crypto.randomUUID 缺失时 uuid() 仍可生成', () => {
    vi.stubGlobal('crypto', {})
    const id = uuid()
    expect(id).toMatch(/^[0-9a-f-]{36}$/i)
  })

  it('defaultProfile 不依赖 crypto.randomUUID（避免 SqlImportDialog setup 崩溃）', () => {
    vi.stubGlobal('crypto', {})
    const p = defaultProfile({ name: 't' })
    expect(p.id).toMatch(/^[0-9a-f-]{36}$/i)
    expect(p.name).toBe('t')
  })
})
