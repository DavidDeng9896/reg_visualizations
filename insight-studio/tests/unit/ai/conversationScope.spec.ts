import { describe, expect, it } from 'vitest'
import { pickStepConversation } from '../../../src/modules/ai/conversationScope'
import type { ConversationMeta } from '../../../src/modules/ai/client'

function meta(partial: Partial<ConversationMeta> & { id: string }): ConversationMeta {
  return {
    analysisId: null,
    stepId: null,
    title: partial.id,
    createdAt: '',
    updatedAt: '',
    ...partial,
  }
}

describe('pickStepConversation', () => {
  it('不取全局会话的第一条：stepId 对不上则返回 undefined', () => {
    const list = [
      meta({ id: 'global-latest', title: '其他分析里的主会话', analysisId: 'analysis-a' }),
      meta({ id: 'other-step', stepId: 'step-b', analysisId: 'analysis-b', title: '另一个 Custom Code' }),
    ]
    expect(pickStepConversation(list, 'step-this-node')).toBeUndefined()
  })

  it('只挑当前步骤的会话，即使它不是 list[0]', () => {
    const list = [
      meta({ id: 'global-latest', title: '主会话' }),
      meta({ id: 'mine', stepId: 'step-1', analysisId: 'a1', title: 'Custom Code AI' }),
    ]
    expect(pickStepConversation(list, 'step-1')?.id).toBe('mine')
  })

  it('stepId 为空不匹配任何会话', () => {
    const list = [meta({ id: 'x', stepId: 'step-1' })]
    expect(pickStepConversation(list, '')).toBeUndefined()
    expect(pickStepConversation(list, '  ')).toBeUndefined()
  })
})
