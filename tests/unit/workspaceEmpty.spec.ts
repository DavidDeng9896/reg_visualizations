import { describe, expect, it } from 'vitest'
import {
  WORKSPACE_EMPTY_REGION_LABEL,
  workspaceEmptyCopy,
  workspaceEmptyCtaAria,
  workspaceEmptyRegionAttrs,
} from '@/modules/table/workspaceEmpty'

describe('workspaceEmpty', () => {
  it('exposes a labelled landmark for skip-friendly empty CTA', () => {
    expect(WORKSPACE_EMPTY_REGION_LABEL).toBe('工作区引导')
    expect(workspaceEmptyRegionAttrs()).toEqual({
      id: 'ws-empty',
      tabindex: -1,
      role: 'region',
      'aria-label': WORKSPACE_EMPTY_REGION_LABEL,
    })
  })

  it('distinguishes no-data vs select-table guidance', () => {
    expect(workspaceEmptyCopy({ hasTables: false })).toEqual({
      title: '开始分析',
      body: '还没有数据表。导入 CSV 或合并表后，侧栏会出现节点，即可在此浏览与可视化。',
    })
    expect(workspaceEmptyCopy({ hasTables: true })).toEqual({
      title: '选择表或视图',
      body: '从侧栏选择一张表或视图继续；也可再导入 CSV / 合并表。',
    })
  })

  it('gives empty CTAs distinct aria from the header Add data control', () => {
    expect(workspaceEmptyCtaAria('csv')).toBe('从工作区空态导入 CSV')
    expect(workspaceEmptyCtaAria('combine')).toBe('从工作区空态合并表')
  })
})
