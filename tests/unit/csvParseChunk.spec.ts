import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  CSV_PAPAPARSE_STATIC_DEFERRED,
  csvPapaLoadMode,
  loadPapa,
  resetPapaCache,
  schedulePapaWarm,
} from '@/modules/table/csvParseChunk'

describe('csvParseChunk (Round 37)', () => {
  afterEach(() => {
    resetPapaCache()
  })

  it('defers static PapaParse import — dialog chrome stays lean', () => {
    expect(CSV_PAPAPARSE_STATIC_DEFERRED).toBe(true)
    expect(csvPapaLoadMode()).toBe('deferred-dynamic')
  })

  it('caches PapaParse load across parse + warm', async () => {
    const importPapa = vi.fn(() => Promise.resolve({ parse: vi.fn() } as never))
    const a = await loadPapa(importPapa)
    const b = await loadPapa(importPapa)
    expect(importPapa).toHaveBeenCalledTimes(1)
    expect(a).toBe(b)
  })

  it('idle-warms PapaParse after CSV dialog opens', () => {
    const importPapa = vi.fn(() => Promise.resolve({ parse: vi.fn() } as never))
    const idle = vi.fn((run: () => void) => run())
    schedulePapaWarm(importPapa, idle)
    expect(idle).toHaveBeenCalledTimes(1)
    expect(importPapa).toHaveBeenCalledTimes(1)
  })
})
