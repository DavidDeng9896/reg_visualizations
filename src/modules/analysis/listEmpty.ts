/** List page empty / skip-link landmark attrs (Round 27+28+31). */

export const LIST_EMPTY_REGION_LABEL = 'Analysis 列表'

/** Empty-state only — kept narrow so routeFocus does not treat every list row as a skip target. */
export function listEmptyRegionAttrs() {
  return {
    id: 'analysis-list',
    tabindex: -1 as const,
    role: 'region' as const,
    'aria-label': LIST_EMPTY_REGION_LABEL,
  }
}

/** Skeleton / table landmark for skip when the list is not empty (Round 31). */
export function listMainRegionAttrs() {
  return {
    id: 'analysis-list-main',
    tabindex: -1 as const,
  }
}

/** Dynamic skip href: empty CTA vs main list content. */
export function listSkipHref(opts: { ready: boolean; hasRows: boolean }): string {
  if (!opts.ready || opts.hasRows) return '#analysis-list-main'
  return '#analysis-list'
}

/** Distinct from top-bar Demo / Create so SR does not hear two identical names (Round 28). */
export function listEmptyCtaAria(kind: 'demo' | 'create'): string {
  return kind === 'demo' ? '从空列表一键 Demo' : '从空列表创建 Analysis'
}
