/**
 * 步骤节点工厂。
 * 与注册表联动，集中创建 StepNode，避免各处重复拼接默认配置。
 */
import type { StepNode, StepType } from '../../shared/types'
import { uuid } from '../../shared/id'
import { getStepDef } from './registry'

/** 创建一个新的步骤节点（pending 状态，无输入，空输出）。 */
export function createStepNode(type: StepType, name?: string): StepNode {
  const def = getStepDef(type)
  return {
    id: uuid(),
    type,
    name: name ?? def.label,
    inputs: [],
    config: JSON.parse(JSON.stringify(def.defaultConfig)),
    status: 'pending',
    output: { tables: [], files: [], views: [] },
  }
}
