/** List page empty / skip-link landmark attrs (Round 27+28). */

export const LIST_EMPTY_REGION_LABEL = 'Analysis 列表'

export function listEmptyRegionAttrs() {
  return {
    id: 'analysis-list',
    tabindex: -1 as const,
    role: 'region' as const,
    'aria-label': LIST_EMPTY_REGION_LABEL,
  }
}

/** Distinct from top-bar Demo / Create so SR does not hear two identical names (Round 28). */
export function listEmptyCtaAria(kind: 'demo' | 'create'): string {
  return kind === 'demo' ? '从空列表一键 Demo' : '从空列表创建 Analysis'
}
