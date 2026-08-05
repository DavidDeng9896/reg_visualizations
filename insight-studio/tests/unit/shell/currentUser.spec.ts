import { beforeEach, describe, expect, it, vi } from 'vitest'

const store: Record<string, string> = {}

vi.stubGlobal('localStorage', {
  getItem: (k: string) => (k in store ? store[k] : null),
  setItem: (k: string, v: string) => {
    store[k] = String(v)
  },
  removeItem: (k: string) => {
    delete store[k]
  },
})

describe('currentUser', () => {
  beforeEach(() => {
    for (const k of Object.keys(store)) delete store[k]
    vi.resetModules()
  })

  it('defaults to david', async () => {
    const { getCurrentUserId, useCurrentUser, DEFAULT_USER_ID } = await import('../../../src/modules/shell/currentUser')
    expect(DEFAULT_USER_ID).toBe('david')
    expect(getCurrentUserId()).toBe('david')
    const { user } = useCurrentUser()
    expect(user.value.displayName).toBe('David')
  })

  it('persists switch to dengxiaowei', async () => {
    const { useCurrentUser, getCurrentUserId, USER_STORAGE_KEY } = await import('../../../src/modules/shell/currentUser')
    const { setUser } = useCurrentUser()
    expect(setUser('dengxiaowei')).toBe(true)
    expect(getCurrentUserId()).toBe('dengxiaowei')
    expect(store[USER_STORAGE_KEY]).toBe('dengxiaowei')
    expect(setUser('dengxiaowei')).toBe(false)
  })

  it('ignores unknown ids', async () => {
    const { useCurrentUser, getCurrentUserId } = await import('../../../src/modules/shell/currentUser')
    const { setUser } = useCurrentUser()
    expect(setUser('admin')).toBe(false)
    expect(getCurrentUserId()).toBe('david')
  })
})
