import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Analysis } from '../../src/shared/types'
import type { AnalysisRepository } from '../../src/shared/repository'
import { createProjectDemoAnalyses, LEGACY_DEMO_IDS } from '../../src/shared/demoProjects'
import {
  __resetEnsureProjectDemoSeedForTests,
  ensureProjectDemoSeed,
  onAnalysesPossiblyChanged,
  seedProjectDemos,
} from '../../src/shared/ensureProjectDemoSeed'

function createMockRepo(initial: Analysis[] = []): AnalysisRepository & { puts: Analysis[]; deletes: string[] } {
  const store = new Map<string, Analysis>(initial.map((a) => [a.id, a]))
  const puts: Analysis[] = []
  const deletes: string[] = []
  return {
    puts,
    deletes,
    async list() {
      return [...store.values()]
    },
    async get(id: string) {
      return store.get(id)
    },
    async put(analysis: Analysis) {
      puts.push(analysis)
      store.set(analysis.id, analysis)
    },
    async delete(id: string) {
      deletes.push(id)
      store.delete(id)
    },
    async transact<T>(fn: () => Promise<T> | T) {
      return fn()
    },
  }
}

describe('ensureProjectDemoSeed / seedProjectDemos', () => {
  beforeEach(() => {
    __resetEnsureProjectDemoSeedForTests()
  })

  it('空库：ensure 写入全部 demo，id 为固定 demo id', async () => {
    const repo = createMockRepo()
    const expected = createProjectDemoAnalyses()
    const result = await ensureProjectDemoSeed(repo)

    expect(result).toEqual({ seeded: true, count: expected.length })
    expect(repo.puts).toHaveLength(expected.length)
    const listed = await repo.list()
    expect(listed).toHaveLength(expected.length)
    expect(listed.map((a) => a.id).sort()).toEqual(expected.map((a) => a.id).sort())
  })

  it('非空：ensure 不调用 put', async () => {
    const existing = createProjectDemoAnalyses()[0]
    const repo = createMockRepo([existing])
    const result = await ensureProjectDemoSeed(repo)

    expect(result).toEqual({ seeded: false })
    expect(repo.puts).toHaveLength(0)
  })

  it('并发：两次并行 ensure 只写入一轮', async () => {
    const repo = createMockRepo()
    const expected = createProjectDemoAnalyses()
    const [a, b] = await Promise.all([ensureProjectDemoSeed(repo), ensureProjectDemoSeed(repo)])

    expect(a).toEqual({ seeded: true, count: expected.length })
    expect(b).toEqual({ seeded: true, count: expected.length })
    expect(repo.puts).toHaveLength(expected.length)
  })

  it('force=true：非空库仍覆盖写入', async () => {
    const existing = { ...createProjectDemoAnalyses()[0], name: 'user-kept' }
    const repo = createMockRepo([existing])
    const expected = createProjectDemoAnalyses()
    const result = await seedProjectDemos({ force: true, repo })

    expect(result).toEqual({ seeded: true, count: expected.length })
    expect(repo.puts).toHaveLength(expected.length)
  })

  it('写入后通知订阅者；非空 ensure 不通知', async () => {
    const listener = vi.fn()
    onAnalysesPossiblyChanged(listener)

    const empty = createMockRepo()
    await ensureProjectDemoSeed(empty)
    expect(listener).toHaveBeenCalledTimes(1)

    listener.mockClear()
    const nonEmpty = createMockRepo([createProjectDemoAnalyses()[0]])
    await ensureProjectDemoSeed(nonEmpty)
    expect(listener).not.toHaveBeenCalled()
  })

  it('force 写入时清理 LEGACY_DEMO_IDS', async () => {
    const legacy = { ...createProjectDemoAnalyses()[0], id: LEGACY_DEMO_IDS[0], name: 'legacy' }
    const repo = createMockRepo([legacy])
    await seedProjectDemos({ force: true, repo })
    expect(repo.deletes).toContain(LEGACY_DEMO_IDS[0])
    expect((await repo.list()).some((a) => a.id === LEGACY_DEMO_IDS[0])).toBe(false)
  })
})
