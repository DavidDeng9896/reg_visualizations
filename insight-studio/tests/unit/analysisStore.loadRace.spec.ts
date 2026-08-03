import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { createEmptyAnalysis, createTable } from '../../src/shared/factories'
import type { Analysis } from '../../src/shared/types'
import type { AnalysisRepository } from '../../src/shared/repository'
import { useAnalysisStore } from '../../src/stores/analysisStore'

/** 可控延迟的内存仓库，用于模拟「先发起的 get 后返回」。 */
function createDeferredRepo(docs: Map<string, Analysis>) {
  const pending = new Map<string, { resolve: (v: Analysis | undefined) => void }>()

  const repo: AnalysisRepository = {
    async list() {
      return [...docs.values()]
    },
    get(id: string) {
      return new Promise<Analysis | undefined>((resolve) => {
        pending.set(id, { resolve })
      })
    },
    async put(a) {
      docs.set(a.id, a)
    },
    async delete(id) {
      docs.delete(id)
    },
    async transact(fn) {
      return fn()
    },
  }

  function release(id: string) {
    const p = pending.get(id)
    if (!p) throw new Error(`no pending get for ${id}`)
    pending.delete(id)
    p.resolve(docs.get(id))
  }

  return { repo, release, pending }
}

describe('analysisStore.load 竞态', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('后发起的 load 先完成时，忽略过期的旧 load 结果', async () => {
    const a = createEmptyAnalysis('A')
    a.tables.push(
      createTable('TableA', [{ field: 'x', title: 'x', dataType: 'number' }], [{ x: 1 }], 'csv'),
    )
    const b = createEmptyAnalysis('B')
    b.tables.push(
      createTable('TableB', [{ field: 'y', title: 'y', dataType: 'number' }], [{ y: 2 }], 'csv'),
    )
    const docs = new Map<string, Analysis>([
      [a.id, a],
      [b.id, b],
    ])
    const { repo, release } = createDeferredRepo(docs)
    const store = useAnalysisStore()

    const pA = store.load(a.id, repo)
    const pB = store.load(b.id, repo)

    // B 先返回，A 后返回（模拟卸载页的 in-flight get）
    release(b.id)
    await pB
    expect(store.current?.id).toBe(b.id)
    expect(store.current?.name).toBe('B')

    release(a.id)
    await pA
    // 过期的 A 不得覆盖当前 B
    expect(store.current?.id).toBe(b.id)
    expect(store.current?.name).toBe('B')
    expect(store.loading).toBe(false)
  })

  it('beginLoad 会立刻清掉与目标不符的 current/selected', () => {
    const store = useAnalysisStore()
    const a = createEmptyAnalysis('A')
    store.current = a
    store.selected = { kind: 'table', tableId: 't1' }
    store.dirty = true
    store.beginLoad('other-id')
    expect(store.current).toBeNull()
    expect(store.selected).toBeNull()
    expect(store.loading).toBe(true)
    expect(store.dirty).toBe(false)
  })

  it('clearWorkspace 清空工作区并抬高 loadSeq（使 in-flight load 失效）', async () => {
    const a = createEmptyAnalysis('A')
    const docs = new Map<string, Analysis>([[a.id, a]])
    const { repo, release } = createDeferredRepo(docs)
    const store = useAnalysisStore()

    const p = store.load(a.id, repo)
    store.clearWorkspace()
    release(a.id)
    await p
    expect(store.current).toBeNull()
    expect(store.loading).toBe(false)
  })
})
