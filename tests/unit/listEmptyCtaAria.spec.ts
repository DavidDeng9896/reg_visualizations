import { describe, expect, it } from 'vitest'
import { listEmptyCtaAria } from '@/modules/analysis/listEmpty'

describe('listEmptyCtaAria', () => {
  it('dedupes empty-list CTA names from the top-bar buttons', () => {
    expect(listEmptyCtaAria('demo')).toBe('从空列表一键 Demo')
    expect(listEmptyCtaAria('create')).toBe('从空列表创建 Analysis')
  })
})
