import { describe, expect, it } from 'vitest'
import { CUSTOM_CODE_DEFAULT_TEMPLATE } from '../../../src/modules/steps/customCodeTemplate'
import {
  isFailedEmptyAiStep,
  listFailedEmptyAiSteps,
  markStepCreatedByAi,
} from '../../../src/modules/ai/failedEmptySteps'
import type { Analysis, StepNode } from '../../../src/shared/types'

function step(partial: Partial<StepNode> & Pick<StepNode, 'id'>): StepNode {
  return {
    type: 'custom-code',
    name: 'Custom code',
    inputs: [],
    config: {},
    status: 'failed',
    output: { tables: [], files: [], views: [], charts: [] },
    ...partial,
  }
}

function analysis(steps: StepNode[]): Analysis {
  return {
    id: 'a1',
    name: 'A',
    createdAt: '',
    updatedAt: '',
    tables: [],
    files: [],
    flowchartLayout: {},
    steps,
  }
}

describe('isFailedEmptyAiStep', () => {
  it('AI 默认模板失败节点为 true', () => {
    const s = step({
      id: 's1',
      config: markStepCreatedByAi({ code: CUSTOM_CODE_DEFAULT_TEMPLATE }),
      status: 'failed',
    })
    expect(isFailedEmptyAiStep(s)).toBe(true)
  })

  it('用户手建空节点为 false', () => {
    const s = step({ id: 's1', config: { code: CUSTOM_CODE_DEFAULT_TEMPLATE }, status: 'failed' })
    expect(isFailedEmptyAiStep(s)).toBe(false)
  })

  it('AI 失败但已有实质代码为 false', () => {
    const s = step({
      id: 's1',
      config: markStepCreatedByAi({ code: 'def custom_code(inputs):\n    import statsmodels\n    return []\n' }),
      status: 'failed',
    })
    expect(isFailedEmptyAiStep(s)).toBe(false)
  })

  it('有下游依赖的不列入清理', () => {
    const empty = step({
      id: 's1',
      config: markStepCreatedByAi({ code: '' }),
      status: 'failed',
    })
    const down = step({
      id: 's2',
      type: 'filter',
      config: {},
      inputs: [{ port: 'Input dataset', from: { nodeId: 's1', port: 'Output datasets' } }],
      status: 'configured',
      output: { tables: ['t2'], files: [], views: [], charts: [] },
    })
    expect(listFailedEmptyAiSteps(analysis([empty, down])).map((x) => x.id)).toEqual([])
  })
})
