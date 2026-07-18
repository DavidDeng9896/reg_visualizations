import { describe, expect, it } from 'vitest'
import {
  FLOW_EMPTY_COMBINE_CTA_SELECTOR,
  FLOW_EMPTY_CSV_CTA_SELECTOR,
  FLOW_EMPTY_REGION_LABEL,
  flowchartEmptyCombineFocusFallback,
  flowchartEmptyCopy,
  flowchartEmptyCtaAria,
  flowchartEmptyCsvFocusFallback,
  flowchartEmptyRegionAttrs,
} from '@/modules/flowchart/flowchartEmpty'

describe('flowchartEmpty', () => {
  it('exposes a labelled landmark for skip-friendly empty CTA', () => {
    expect(FLOW_EMPTY_REGION_LABEL).toBe('流程图引导')
    expect(flowchartEmptyRegionAttrs()).toEqual({
      id: 'flow-empty',
      tabindex: -1,
      role: 'region',
      'aria-label': FLOW_EMPTY_REGION_LABEL,
    })
  })

  it('matches workspace empty guidance for no-data flowchart', () => {
    expect(flowchartEmptyCopy()).toEqual({
      title: '流程图为空',
      body: '还没有数据表。导入 CSV 或合并表后，侧栏与流程图会同步出现节点。',
    })
  })

  it('gives empty CTAs distinct aria from the header Add data control', () => {
    expect(flowchartEmptyCtaAria('csv')).toBe('从流程图空态导入 CSV')
    expect(flowchartEmptyCtaAria('combine')).toBe('从流程图空态合并表')
  })

  it('restores focus to flowchart empty CSV CTA after overlay (Round 35)', () => {
    const root = document.createElement('div')
    root.id = 'flow-empty'
    const cta = document.createElement('button')
    cta.setAttribute('aria-label', '从流程图空态导入 CSV')
    root.appendChild(cta)
    document.body.appendChild(root)

    expect(FLOW_EMPTY_CSV_CTA_SELECTOR).toContain('从流程图空态导入 CSV')
    expect(flowchartEmptyCsvFocusFallback()).toBe(cta)

    cta.remove()
    expect(flowchartEmptyCsvFocusFallback()).toBe(root)

    root.remove()
    expect(flowchartEmptyCsvFocusFallback()).toBeNull()
  })

  it('restores focus to flowchart empty Combine CTA after overlay (Round 36)', () => {
    const root = document.createElement('div')
    root.id = 'flow-empty'
    const cta = document.createElement('button')
    cta.setAttribute('aria-label', '从流程图空态合并表')
    root.appendChild(cta)
    document.body.appendChild(root)

    expect(FLOW_EMPTY_COMBINE_CTA_SELECTOR).toContain('从流程图空态合并表')
    expect(flowchartEmptyCombineFocusFallback()).toBe(cta)

    cta.remove()
    expect(flowchartEmptyCombineFocusFallback()).toBe(root)

    root.remove()
    expect(flowchartEmptyCombineFocusFallback()).toBeNull()
  })
})
