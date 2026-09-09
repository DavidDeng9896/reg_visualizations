import { describe, expect, it } from 'vitest'
import {
  analysisPathForArtifact,
  latestOpenableChartArtifact,
  latestOpenableWorkspaceArtifact,
} from '../../../src/modules/ai/openArtifact'
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

  it('表产物可打开；不完整返回 null', () => {
    expect(
      analysisPathForArtifact({ kind: 'table', name: 't', analysisId: 'a1', tableId: 't1' }),
    ).toBe('/analysis/a1?tableId=t1')
    expect(
      analysisPathForArtifact({
        kind: 'view',
        name: '表',
        analysisId: 'a1',
        tableId: 't1',
        viewId: 'v1',
        viewType: 'table',
      }),
    ).toBe('/analysis/a1?tableId=t1&viewId=v1')
    expect(analysisPathForArtifact({ kind: 'table', name: 't', analysisId: 'a1' })).toBeNull()
  })

  it('latestOpenable：优先图表再表', () => {
    const tableArt: Artifact = { kind: 'table', name: '汇总', analysisId: 'a1', tableId: 't1' }
    const chartArt: Artifact = {
      kind: 'view',
      name: '图',
      analysisId: 'a1',
      tableId: 't1',
      viewId: 'v1',
      viewType: 'bar',
    }
    expect(latestOpenableChartArtifact([tableArt, chartArt])?.viewId).toBe('v1')
    expect(latestOpenableWorkspaceArtifact([tableArt])?.kind).toBe('table')
  })
})
