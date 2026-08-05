import type { StepNode, StepType } from '../../shared/types'
import { uuid } from '../../shared/id'
import { getStepDef } from './registry'
import { CUSTOM_CODE_DEFAULT_TEMPLATE } from './customCodeTemplate'

/** 创建一个新的步骤节点（pending 状态，无输入，空输出）。 */
export function createStepNode(type: StepType, name?: string): StepNode {
  const def = getStepDef(type)
  const config = JSON.parse(JSON.stringify(def.defaultConfig)) as Record<string, unknown>
  if (type === 'custom-code' && (!config.code || config.code === '')) {
    config.code = CUSTOM_CODE_DEFAULT_TEMPLATE
  }
  return {
    id: uuid(),
    type,
    name: name ?? def.label,
    inputs: [],
    config,
    status: 'pending',
    output: { tables: [], files: [], views: [], charts: [] },
  }
}
