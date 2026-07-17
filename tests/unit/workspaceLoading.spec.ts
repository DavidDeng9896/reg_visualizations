import { describe, expect, it } from 'vitest'
import {
  WORKSPACE_SKELETON_LABEL,
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
})
