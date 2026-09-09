import { describe, expect, it } from 'vitest'
import { analysisPathForArtifact } from '../../../src/modules/ai/openArtifact'
import type { Artifact } from '../../../src/modules/ai/types'

describe('openArtifact (P0-4 auto-open)', () => {
  it('图表 view 产物生成 analysis 路径', () => {
    const a: Artifact = {
      kind: 'view',
      name: '散点',
      analysisId: 'a1',
      tableId: 't1',
      viewId: 'v1',
      viewType: 'scatter',
    }
    expect(analysisPathForArtifact(a)).toBe('/analysis/a1?tableId=t1&viewId=v1')
  })

  it('非图表或不完整产物返回 null', () => {
    expect(
      analysisPathForArtifact({ kind: 'table', name: 't', analysisId: 'a1', tableId: 't1' }),
    ).toBeNull()
    expect(
      analysisPathForArtifact({
        kind: 'view',
        name: '表',
        analysisId: 'a1',
        tableId: 't1',
        viewId: 'v1',
        viewType: 'table',
      }),
    ).toBeNull()
  })
})
