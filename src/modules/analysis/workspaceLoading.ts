/** Cold-start loading attrs for Analysis workspace (Round 25). */

export const WORKSPACE_SKELETON_LABEL = '加载工作区'

export function workspaceSkeletonAttrs() {
  return {
    role: 'status' as const,
    'aria-busy': 'true' as const,
    'aria-label': WORKSPACE_SKELETON_LABEL,
  }
}
