import type { ConversationMeta } from './client'

/** Custom Code 节点只认挂在该 stepId 上的会话；绝不取全局 list[0]。 */
export function pickStepConversation(list: ConversationMeta[], stepId: string): ConversationMeta | undefined {
  const id = String(stepId ?? '').trim()
  if (!id) return undefined
  return list.find((c) => c.stepId === id)
}
