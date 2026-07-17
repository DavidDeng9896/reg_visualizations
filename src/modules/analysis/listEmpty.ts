/** List page empty / skip-link landmark attrs (Round 27). */

export const LIST_EMPTY_REGION_LABEL = 'Analysis 列表'

export function listEmptyRegionAttrs() {
  return {
    id: 'analysis-list',
    tabindex: -1 as const,
    role: 'region' as const,
    'aria-label': LIST_EMPTY_REGION_LABEL,
  }
}
