import { describe, expect, it } from 'vitest'
import { tableNoViewsHint, tableNoViewsCtaAria } from '@/modules/table/tableNoViewsHint'

describe('tableNoViewsHint', () => {
  it('hides when the selected table already has views', () => {
    expect(tableNoViewsHint({ viewCount: 2 })).toBeNull()
    expect(tableNoViewsHint({ viewCount: 1 })).toBeNull()
  })

  it('shows New view guidance when the table has no child views', () => {
    expect(tableNoViewsHint({ viewCount: 0 })).toEqual({
      title: '创建第一个视图',
      body: '当前表还没有视图。新建视图后可切换图种、配置图表，并在流程图中看到分支。',
    })
  })

  it('labels the CTA distinctly from the toolbar New view button', () => {
    expect(tableNoViewsCtaAria()).toBe('从表无视图引导创建 New view')
  })
})
