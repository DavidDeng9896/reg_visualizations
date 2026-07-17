import { describe, expect, it } from 'vitest'
import { listEmptyRegionAttrs, LIST_EMPTY_REGION_LABEL } from '@/modules/analysis/listEmpty'

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
})
