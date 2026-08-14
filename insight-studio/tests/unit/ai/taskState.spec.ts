import { describe, expect, it } from 'vitest'
import {
  clipToolResult,
  planIncomplete,
  pendingPlanSteps,
  planNudgeMessage,
  continueTaskSystemMessage,
  TOOL_RESULT_SOFT,
} from '../../../src/modules/ai/taskState'

describe('taskState', () => {
  it('clipToolResult：短文本原样返回', () => {
    expect(clipToolResult('hello')).toBe('hello')
  })

  it('clipToolResult：超 soft 截断并标注', () => {
    const s = 'a'.repeat(TOOL_RESULT_SOFT + 100)
    const out = clipToolResult(s)
    expect(out.length).toBeLessThan(s.length)
    expect(out).toContain('截断')
  })

  it('clipToolResult：超 hard 保留头尾', () => {
    const s = '头'.repeat(3000) + '中'.repeat(2000) + '尾'.repeat(500)
    const out = clipToolResult(s)
    expect(out).toContain('省略')
    expect(out.startsWith('头')).toBe(true)
    expect(out.endsWith('尾') || out.includes('尾')).toBe(true)
  })

  it('planIncomplete / pendingPlanSteps', () => {
    expect(planIncomplete(undefined, undefined)).toBe(false)
    expect(planIncomplete(['a', 'b'], [0])).toBe(true)
    expect(planIncomplete(['a', 'b'], [0, 1])).toBe(false)
    expect(pendingPlanSteps(['看表', '出图'], [0])).toEqual([{ index: 1, text: '出图' }])
  })

  it('催促与续跑文案含剩余步骤', () => {
    const nudge = planNudgeMessage(['A', 'B'], [0])
    expect(nudge).toContain('禁止结束')
    expect(nudge).toContain('2. B')
    const cont = continueTaskSystemMessage(['A', 'B'], [])
    expect(cont).toContain('续跑检查点')
    expect(cont).toContain('1. A')
    expect(cont).toContain('禁止 create_analysis')
  })
})
