import { describe, expect, it } from 'vitest'
import {
  listEmptyRegionAttrs,
  listMainRegionAttrs,
  listSkipHref,
  LIST_EMPTY_REGION_LABEL,
} from '@/modules/analysis/listEmpty'

describe('listEmpty', () => {
  it('exposes a labelled landmark for skip-link landing on empty CTA', () => {
    expect(LIST_EMPTY_REGION_LABEL).toBe('Analysis 列表')
    expect(listEmptyRegionAttrs()).toEqual({
      id: 'analysis-list',
      tabindex: -1,
      role: 'region',
      'aria-label': LIST_EMPTY_REGION_LABEL,
    })
  })

  it('uses a tight main landmark when the list has rows or is loading (Round 31)', () => {
    expect(listMainRegionAttrs()).toEqual({
      id: 'analysis-list-main',
      tabindex: -1,
    })
    expect(listSkipHref({ ready: false, hasRows: false })).toBe('#analysis-list-main')
    expect(listSkipHref({ ready: true, hasRows: true })).toBe('#analysis-list-main')
    expect(listSkipHref({ ready: true, hasRows: false })).toBe('#analysis-list')
  })
})
