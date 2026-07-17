import { describe, expect, it } from 'vitest'
import {
  LIST_SKELETON_LABEL,
  WORKSPACE_SKELETON_LABEL,
  listSkeletonAttrs,
  workspaceSkeletonAttrs,
} from '@/modules/analysis/workspaceLoading'

describe('workspaceLoading', () => {
  it('exposes stable a11y attrs for cold-start skeleton', () => {
    expect(WORKSPACE_SKELETON_LABEL).toBe('加载工作区')
    expect(workspaceSkeletonAttrs()).toEqual({
      role: 'status',
      'aria-busy': 'true',
      'aria-label': '加载工作区',
    })
  })

  it('exposes list skeleton attrs aligned with workspace', () => {
    expect(LIST_SKELETON_LABEL).toBe('加载 Analysis 列表')
    expect(listSkeletonAttrs()).toEqual({
      role: 'status',
      'aria-busy': 'true',
      'aria-label': '加载 Analysis 列表',
    })
  })
})
