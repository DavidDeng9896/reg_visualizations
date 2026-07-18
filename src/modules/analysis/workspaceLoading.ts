/** Cold-start / list loading attrs (Round 25–26). */

export const WORKSPACE_SKELETON_LABEL = '加载工作区'
export const LIST_SKELETON_LABEL = '加载 Analysis 列表'

export function workspaceSkeletonAttrs() {
  return {
    role: 'status' as const,
    'aria-busy': 'true' as const,
    'aria-label': WORKSPACE_SKELETON_LABEL,
  }
}

export function listSkeletonAttrs() {
  return {
    role: 'status' as const,
    'aria-busy': 'true' as const,
    'aria-label': LIST_SKELETON_LABEL,
  }
}
