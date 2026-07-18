import { describe, expect, it } from 'vitest'
import {
  listHeavyDepsStrategy,
  listKeepsVxeAndEchartsLazy,
} from '@/modules/analysis/listHeavyDeps'
import {
  LIST_PAGE_CHUNK_SPLIT_DEFERRED,
  listPageChunkStrategy,
} from '@/modules/analysis/listPageChunk'

describe('list heavy deps / page chunk (Round 40)', () => {
  it('keeps vxe-table and echarts out of the list route (workspace/chart only)', () => {
    expect(listKeepsVxeAndEchartsLazy()).toBe(true)
    expect(listHeavyDepsStrategy()).toEqual({
      vxe: 'workspace-only',
      echarts: 'chart-panel-dynamic',
      listImportsNeither: true,
      round40Reeval: 'keep-lazy',
    })
  })

  it('re-evaluates list page split and still defers chrome splitting', () => {
    expect(LIST_PAGE_CHUNK_SPLIT_DEFERRED).toBe(true)
    const strategy = listPageChunkStrategy()
    expect(strategy.splitDeferred).toBe(true)
    expect(strategy.round40Reeval).toBe('keep-route-lazy')
  })
})
