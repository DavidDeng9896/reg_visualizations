/** Flowchart empty-state copy / landmark / CTA a11y (Round 29). */

export const FLOW_EMPTY_REGION_LABEL = '流程图引导'

export function flowchartEmptyRegionAttrs() {
  return {
    id: 'flow-empty',
    tabindex: -1 as const,
    role: 'region' as const,
    'aria-label': FLOW_EMPTY_REGION_LABEL,
  }
}

export function flowchartEmptyCopy(): { title: string; body: string } {
  return {
    title: '流程图为空',
    body: '还没有数据表。导入 CSV 或合并表后，侧栏与流程图会同步出现节点。',
  }
}

export function flowchartEmptyCtaAria(cmd: 'csv' | 'combine'): string {
  return cmd === 'csv' ? '从流程图空态导入 CSV' : '从流程图空态合并表'
}
