import { describe, expect, it } from 'vitest'
import {
  FLOW_EMPTY_REGION_LABEL,
  flowchartEmptyCopy,
  flowchartEmptyCtaAria,
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
})
