import { describe, expect, it } from 'vitest'
import { listStepDefs } from '../../../src/modules/steps/registry'
import { IMPLEMENTED_STEP_TYPES } from '../../../src/modules/steps/exec'
import { filterAddableStepDefs, groupAddableStepDefs } from '../../../src/modules/flowchart/addStepCatalog'

describe('Add step 目录', () => {
  it('从输出端口拖出时应列出 Report / 分析报告', () => {
    const defs = filterAddableStepDefs(listStepDefs(), {
      implemented: IMPLEMENTED_STEP_TYPES,
      sourcePortType: 'table',
    })
    expect(defs.some((d) => d.type === 'report')).toBe(true)
    expect(defs.map((d) => d.type)).toEqual(expect.arrayContaining(['filter', 'join', 'report']))
  })

  it('零输入的 Upload CSV 仍不出现在端口拖拽目录', () => {
    const defs = filterAddableStepDefs(listStepDefs(), {
      implemented: IMPLEMENTED_STEP_TYPES,
      sourcePortType: 'table',
    })
    expect(defs.some((d) => d.type === 'upload-csv')).toBe(false)
  })

  it('分组包含 Output，且 Report 落在其中', () => {
    const defs = filterAddableStepDefs(listStepDefs(), { implemented: IMPLEMENTED_STEP_TYPES })
    const groups = groupAddableStepDefs(defs)
    expect(groups.some((g) => g.key === 'output')).toBe(true)
    const output = groups.find((g) => g.key === 'output')
    expect(output?.defs.some((d) => d.type === 'report')).toBe(true)
  })
})
